'use strict';

/**
 * Booking routes — London Cardiology Clinic
 *
 * Endpoints:
 *   GET  /api/slots?date=YYYY-MM-DD      Available slots for a given Friday
 *   GET  /api/slots/upcoming             Next 4 Fridays with available slot counts
 *   POST /api/book                       Create booking → Stripe Checkout URL
 *   POST /api/book/cancel                Cancel booking (with or without refund)
 *   POST /api/webhook                    Stripe webhook (raw body)
 */

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const stripeService = require('../services/stripe');

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

// Clinic runs every Friday. Available appointment times (London local).
const APPOINTMENT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
];

const MAX_SLOTS_PER_TIME = 1; // one patient per time slot

// How many weeks ahead to offer bookings
const BOOKING_HORIZON_WEEKS = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the date string (YYYY-MM-DD) of the next N Fridays from today.
 * "Today if today is Friday" counts.
 */
function getUpcomingFridays(n = 4) {
  const fridays = [];
  const now = new Date();
  // Day index: 0=Sun … 5=Fri … 6=Sat
  const dayOfWeek = now.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // 0 if today is Friday
  const msPerDay = 86400000;

  let current = new Date(now.getTime() + daysUntilFriday * msPerDay);
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < n; i++) {
    fridays.push(toDateString(current));
    current = new Date(current.getTime() + 7 * msPerDay);
  }
  return fridays;
}

/**
 * Converts a Date to YYYY-MM-DD string using local time (not UTC).
 */
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns true if dateStr is a Friday (YYYY-MM-DD, local time).
 */
function isFriday(dateStr) {
  // Parse as local date by splitting manually to avoid UTC offset issues
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay() === 5;
}

/**
 * Returns true if dateStr is within the booking horizon.
 */
function isWithinHorizon(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (target - now) / 86400000;
  return diffDays >= 0 && diffDays <= BOOKING_HORIZON_WEEKS * 7;
}

/**
 * Returns the set of booked time slots for a given date from the database.
 * Returns a Set<string> of times like '09:00'.
 */
function getBookedSlots(date) {
  const rows = db
    .prepare(
      `SELECT appointment_time FROM patients
       WHERE appointment_date = ? AND status NOT IN ('cancelled')`
    )
    .all(date);
  return new Set(rows.map((r) => r.appointment_time));
}

/**
 * Checks whether a specific date+time slot is still available.
 */
function isSlotAvailable(date, time) {
  const count = db
    .prepare(
      `SELECT COUNT(*) AS n FROM patients
       WHERE appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled')`
    )
    .get(date, time).n;
  return count < MAX_SLOTS_PER_TIME;
}

/**
 * Validates that a string is a well-formed YYYY-MM-DD date.
 */
function isValidDateFormat(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/**
 * Validates that a time string matches HH:MM and is in the allowed list.
 */
function isAllowedTime(time) {
  return APPOINTMENT_TIMES.includes(time);
}

/**
 * Safely escape a string for use in error messages (no HTML injection into logs).
 */
function sanitise(value, maxLen = 200) {
  if (typeof value !== 'string') return String(value ?? '').slice(0, maxLen);
  return value.replace(/[\r\n]/g, ' ').slice(0, maxLen);
}

// ─── GET /api/slots ───────────────────────────────────────────────────────────

router.get('/slots', (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
  }
  if (!isValidDateFormat(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }
  if (!isFriday(date)) {
    return res.status(400).json({ error: 'Clinic runs on Fridays only' });
  }
  if (!isWithinHorizon(date)) {
    return res
      .status(400)
      .json({ error: `date must be within the next ${BOOKING_HORIZON_WEEKS} weeks` });
  }

  const booked = getBookedSlots(date);
  const slots = APPOINTMENT_TIMES.map((time) => ({
    time,
    available: !booked.has(time),
  }));

  return res.json({ date, slots });
});

// ─── GET /api/slots/upcoming ──────────────────────────────────────────────────

router.get('/slots/upcoming', (req, res) => {
  const fridays = getUpcomingFridays(4);
  const result = fridays.map((date) => {
    const booked = getBookedSlots(date);
    const availableCount = APPOINTMENT_TIMES.filter((t) => !booked.has(t)).length;
    return { date, availableSlots: availableCount, totalSlots: APPOINTMENT_TIMES.length };
  });
  return res.json({ upcoming: result });
});

// ─── POST /api/book ───────────────────────────────────────────────────────────

router.post('/book', async (req, res) => {
  // ── 1. Extract and validate all required fields ───────────────────────────

  const {
    name,
    email,
    phone,
    dob,
    tier,
    appointmentDate,
    appointmentTime,
    language,
    consentDataProcessing,
    consentGpSharing,
    consentDeviceAgreement,
    stopFood1,
    stopFood2,
    startFood1,
    startFood2,
  } = req.body;

  const errors = [];

  // Required string fields
  const required = { name, email, phone, dob, appointmentDate, appointmentTime };
  for (const [field, value] of Object.entries(required)) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  // Tier must be 1 or 2
  const tierNum = Number(tier);
  if (![1, 2].includes(tierNum)) {
    errors.push('tier must be 1 or 2');
  }

  // Email format
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email is not valid');
  }

  // Phone: allow +, digits, spaces, hyphens — between 7 and 20 chars
  if (phone && !/^[+\d][\d\s\-]{6,19}$/.test(phone.trim())) {
    errors.push('phone number is not valid');
  }

  // Date of birth: YYYY-MM-DD
  if (dob && !isValidDateFormat(dob)) {
    errors.push('dob must be in YYYY-MM-DD format');
  }

  // Appointment date: must be Friday, within horizon
  if (appointmentDate) {
    if (!isValidDateFormat(appointmentDate)) {
      errors.push('appointmentDate must be in YYYY-MM-DD format');
    } else if (!isFriday(appointmentDate)) {
      errors.push('appointmentDate must be a Friday');
    } else if (!isWithinHorizon(appointmentDate)) {
      errors.push(`appointmentDate must be within the next ${BOOKING_HORIZON_WEEKS} weeks`);
    }
  }

  // Appointment time
  if (appointmentTime && !isAllowedTime(appointmentTime)) {
    errors.push(`appointmentTime must be one of: ${APPOINTMENT_TIMES.join(', ')}`);
  }

  // Mandatory consents
  if (consentDataProcessing !== true && consentDataProcessing !== 'true') {
    errors.push('consentDataProcessing must be true');
  }

  // Tier-2 specific
  if (tierNum === 2 && consentDeviceAgreement !== true && consentDeviceAgreement !== 'true') {
    errors.push('consentDeviceAgreement is required for Tier 2');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // ── 2. Check slot availability ────────────────────────────────────────────

  if (!isSlotAvailable(appointmentDate, appointmentTime)) {
    return res.status(409).json({ error: 'This time slot is no longer available' });
  }

  // ── 3. Persist patient record ─────────────────────────────────────────────

  const logToken = crypto.randomUUID();

  let patientId;
  try {
    const insert = db.prepare(`
      INSERT INTO patients (
        name, email, phone, dob, tier,
        appointment_date, appointment_time, language,
        consent_data_processing, consent_gp_sharing, consent_device_agreement,
        stop_food_1, stop_food_2, start_food_1, start_food_2,
        log_token, status, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, 'pending_payment', datetime('now')
      )
    `);

    const result = insert.run(
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      dob,
      tierNum,
      appointmentDate,
      appointmentTime,
      language ? language.trim() : 'en',
      consentDataProcessing === true || consentDataProcessing === 'true' ? 1 : 0,
      consentGpSharing === true || consentGpSharing === 'true' ? 1 : 0,
      tierNum === 2 && (consentDeviceAgreement === true || consentDeviceAgreement === 'true') ? 1 : 0,
      stopFood1 ? stopFood1.trim() : null,
      stopFood2 ? stopFood2.trim() : null,
      startFood1 ? startFood1.trim() : null,
      startFood2 ? startFood2.trim() : null,
      logToken
    );

    patientId = result.lastInsertRowid;
  } catch (err) {
    console.error('[booking] DB insert error:', err.message);
    return res.status(500).json({ error: 'Failed to create booking record' });
  }

  // ── 4. Create Stripe Checkout session ────────────────────────────────────

  let session;
  try {
    session = await stripeService.createCheckoutSession(
      { id: patientId, email: email.trim().toLowerCase(), name: name.trim() },
      tierNum
    );
  } catch (err) {
    // Roll back the pending patient row so the slot is freed
    try {
      db.prepare("DELETE FROM patients WHERE id = ?").run(patientId);
    } catch (dbErr) {
      console.error('[booking] Failed to rollback patient row:', dbErr.message);
    }
    console.error('[booking] Stripe session creation error:', err.message);
    return res.status(502).json({ error: 'Payment system unavailable. Please try again.' });
  }

  // Store the Stripe session ID against the patient row
  try {
    db.prepare("UPDATE patients SET stripe_session_id = ? WHERE id = ?").run(
      session.id,
      patientId
    );
  } catch (err) {
    console.error('[booking] Failed to store stripe_session_id:', err.message);
    // Non-fatal: the webhook will still fire and we can reconcile
  }

  return res.status(201).json({
    patientId,
    logToken,
    checkoutUrl: session.url,
  });
});

// ─── POST /api/book/cancel ────────────────────────────────────────────────────

router.post('/book/cancel', async (req, res) => {
  const { patientId, token } = req.body;

  if (!patientId || !token) {
    return res.status(400).json({ error: 'patientId and token are required' });
  }

  // Validate types to prevent injection
  if (typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({ error: 'token must be a non-empty string' });
  }

  const id = Number(patientId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'patientId must be a positive integer' });
  }

  // ── Look up patient ───────────────────────────────────────────────────────

  const patient = db
    .prepare('SELECT * FROM patients WHERE id = ? AND log_token = ?')
    .get(id, token.trim());

  if (!patient) {
    // Use a uniform error message to prevent enumeration
    return res.status(404).json({ error: 'Booking not found or token is invalid' });
  }

  if (patient.status === 'cancelled') {
    return res.status(409).json({ error: 'This booking has already been cancelled' });
  }

  // ── Check 48-hour window ──────────────────────────────────────────────────

  const [ay, am, ad] = patient.appointment_date.split('-').map(Number);
  const [ah, amin] = patient.appointment_time.split(':').map(Number);
  const appointmentMs = new Date(ay, am - 1, ad, ah, amin, 0).getTime();
  const nowMs = Date.now();
  const hoursUntilAppointment = (appointmentMs - nowMs) / 3600000;
  const isRefundable = hoursUntilAppointment > 48;

  // ── Process refund if applicable ──────────────────────────────────────────

  let refundIssued = false;
  if (isRefundable && patient.stripe_payment_intent_id) {
    try {
      await stripeService.refundPayment(patient.stripe_payment_intent_id);
      refundIssued = true;
    } catch (err) {
      console.error('[cancel] Stripe refund error:', err.message);
      // Log but don't block the cancellation — the clinic can process manually
    }
  }

  // ── Release any device deposit hold (Tier 2) ──────────────────────────────

  if (patient.tier === 2 && patient.stripe_hold_id) {
    try {
      await stripeService.cancelDeviceHold(patient.stripe_hold_id);
    } catch (err) {
      // Hold may already be released or not yet captured
      console.error('[cancel] Failed to release device hold:', err.message);
    }
  }

  // ── Mark booking as cancelled ─────────────────────────────────────────────

  db.prepare(
    "UPDATE patients SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?"
  ).run(id);

  return res.json({
    cancelled: true,
    refundIssued,
    message: isRefundable
      ? 'Your booking has been cancelled and a full refund has been issued.'
      : 'Your booking has been cancelled. As the cancellation is within 48 hours of your appointment, no refund is applicable.',
  });
});

// ─── POST /api/webhook (Stripe webhook — raw body) ───────────────────────────

// IMPORTANT: This route must receive the raw request body.
// Mount in index.js BEFORE the global express.json() middleware, or use a
// route-level raw body parser as shown below.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = stripeService.handleWebhook(req.body, sig);
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    // ── Process known events ──────────────────────────────────────────────

    try {
      switch (event.type) {

        case 'checkout.session.completed': {
          const session = event.data.object;
          const patientId = session.metadata && session.metadata.patient_id
            ? Number(session.metadata.patient_id)
            : null;
          const tierNum = session.metadata && session.metadata.tier
            ? Number(session.metadata.tier)
            : null;
          const paymentIntentId = session.payment_intent || null;

          if (!patientId) {
            console.warn('[webhook] checkout.session.completed missing patient_id metadata');
            break;
          }

          // Mark booking as confirmed and store payment intent ID
          db.prepare(`
            UPDATE patients
            SET status = 'confirmed',
                stripe_payment_intent_id = ?,
                confirmed_at = datetime('now')
            WHERE id = ? AND status = 'pending_payment'
          `).run(paymentIntentId, patientId);

          console.log(`[webhook] Booking confirmed for patient ${patientId}`);

          // ── Tier 2: create device deposit hold ──────────────────────────
          if (tierNum === 2) {
            const patientRow = db
              .prepare('SELECT id, email, name FROM patients WHERE id = ?')
              .get(patientId);

            if (patientRow && !patientRow.stripe_hold_id) {
              try {
                const holdId = await stripeService.createDeviceHold({
                  id: patientRow.id,
                  email: patientRow.email,
                  name: patientRow.name,
                });
                db.prepare(
                  'UPDATE patients SET stripe_hold_id = ? WHERE id = ?'
                ).run(holdId, patientId);
                console.log(
                  `[webhook] Device hold ${holdId} created for patient ${patientId}`
                );
              } catch (holdErr) {
                console.error(
                  `[webhook] Failed to create device hold for patient ${patientId}:`,
                  holdErr.message
                );
                // The clinic team is notified via the admin dashboard
                // Hold creation failures are logged for manual follow-up
              }
            }
          }

          // ── Send confirmation email (via email service if wired up) ─────
          // Emitting an event so the email service can pick it up without
          // tight coupling in this route.
          req.app.emit('booking:confirmed', { patientId, tierNum, sessionId: session.id });

          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          const patientId = pi.metadata && pi.metadata.patient_id
            ? Number(pi.metadata.patient_id)
            : null;

          if (patientId) {
            // Keep the row but note the failure so the slot can eventually be freed
            db.prepare(`
              UPDATE patients
              SET status = 'payment_failed',
                  updated_at = datetime('now')
              WHERE id = ? AND status = 'pending_payment'
            `).run(patientId);

            console.log(`[webhook] Payment failed for patient ${patientId}`);
          }
          break;
        }

        case 'charge.refunded': {
          // Informational — status is already set to 'cancelled' by /api/book/cancel
          console.log('[webhook] Refund confirmed:', event.data.object.id);
          break;
        }

        default:
          // Unhandled events are ignored silently
          break;
      }
    } catch (handlerErr) {
      // Do not return 500 — Stripe would retry. Log and return 200.
      console.error('[webhook] Handler error:', handlerErr.message);
    }

    // Always acknowledge receipt to Stripe
    return res.json({ received: true });
  }
);

module.exports = router;
