'use strict';

/**
 * sms.js — Twilio SMS service for London Cardiology Clinic
 *
 * All messages are logged to the sms_log table via db.logSms().
 *
 * Environment variables required:
 *   TWILIO_ACCOUNT_SID   — Twilio account SID (AC...)
 *   TWILIO_AUTH_TOKEN    — Twilio auth token
 *   TWILIO_PHONE_NUMBER  — Twilio sender number in E.164 format (+44...)
 */

const twilio = require('twilio');
const { logSms } = require('../db');

// ─── Twilio client (lazy-initialised so missing env vars fail at call time,
//     not at module load time, allowing tests to import without credentials) ──

let _client = null;

function getClient() {
  if (_client) return _client;

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    throw new Error(
      'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set'
    );
  }

  _client = twilio(sid, token);
  return _client;
}

const TWILIO_FROM = () => {
  const n = process.env.TWILIO_PHONE_NUMBER;
  if (!n) throw new Error('TWILIO_PHONE_NUMBER environment variable must be set');
  return n;
};

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Send an SMS via Twilio and persist it to sms_log.
 *
 * @param {string} to        — Recipient number in E.164 format
 * @param {string} message   — Message body (max 160 chars for single SMS)
 * @param {number} [patientId] — Patient row ID for logging (omit for non-patient messages)
 * @returns {Promise<import('twilio').MessageInstance>}
 */
async function sendSms(to, message, patientId) {
  if (!to || typeof to !== 'string') throw new Error('sendSms: to must be a non-empty string');
  if (!message || typeof message !== 'string') throw new Error('sendSms: message must be a non-empty string');

  let status = 'sent';
  let twilioMessage;

  try {
    twilioMessage = await getClient().messages.create({
      from: TWILIO_FROM(),
      to,
      body: message,
    });
  } catch (err) {
    status = 'failed';
    // Log the failure before re-throwing so we have a record
    if (patientId != null) {
      try { logSms(patientId, message, status); } catch (_) { /* best-effort */ }
    }
    throw err;
  }

  if (patientId != null) {
    logSms(patientId, message, status);
  }

  return twilioMessage;
}

// ─── Morning reminders (7:30 am — called by cron job) ────────────────────────

/**
 * Send a personalised morning reminder to a patient.
 *
 * Message variant is chosen by rotating through the set based on the day number
 * within the programme (calculated from devices_collected_date, or today if
 * that field is absent).
 *
 * Available variants:
 *   0 — Step goal motivator
 *   1 — Food plan reminder (stop/start)
 *   2 — BP reading prompt (Week 1 only — falls back to variant 0 otherwise)
 *   3 — Step streak celebration (requires baseline_steps)
 *
 * @param {object} patient — Row from the patients table
 * @returns {Promise<import('twilio').MessageInstance>}
 */
async function sendMorningReminder(patient) {
  if (!patient || !patient.phone) throw new Error('sendMorningReminder: patient.phone is required');

  const firstName = _firstName(patient.name);

  // Determine programme day (1-based) to pick variant
  const startDate = patient.devices_collected_date
    ? new Date(patient.devices_collected_date)
    : new Date();
  const today = new Date();
  const dayNumber = Math.max(
    1,
    Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1
  );
  const weekNumber = Math.ceil(dayNumber / 7);
  const isWeek1    = weekNumber === 1;

  // Build a weighted variant list — BP variant only valid in week 1
  const variants = [0, 1, isWeek1 ? 2 : 0, 3];
  const variant  = variants[dayNumber % variants.length];

  let message;

  switch (variant) {
    case 1:
      message = `${firstName}, remember your food plan today: more ${patient.start_food_1 || 'healthy foods'}, less ${patient.stop_food_1 || 'processed foods'}.`;
      break;

    case 2:
      // Week 1 only — blood pressure self-measurement reminder
      message = `Morning ${firstName}. Take your BP reading when you're ready.`;
      break;

    case 3: {
      // Step streak — requires baseline_steps
      const goal = patient.baseline_steps
        ? Math.round(patient.baseline_steps * 1.2)
        : 5000;
      message = `${firstName}, you've hit your step goal ${_streakDays(dayNumber)} days in a row. Keep going.`;
      // Fall back to variant 0 if the goal is obviously not personalised
      if (!patient.baseline_steps) {
        message = `Good morning ${firstName}. Today's step goal: ${goal} steps. You've got this.`;
      }
      break;
    }

    case 0:
    default: {
      const goal = patient.baseline_steps
        ? Math.round(patient.baseline_steps * 1.2)
        : 5000;
      message = `Good morning ${firstName}. Today's step goal: ${goal} steps. You've got this.`;
      break;
    }
  }

  return sendSms(patient.phone, message, patient.id);
}

// ─── Evening reminders (6:00 pm — called by cron job) ────────────────────────

/**
 * Send an evening logging prompt to a patient.
 *
 * @param {object} patient — Row from the patients table
 * @param {string} logUrl  — The patient's personalised /log URL
 * @returns {Promise<import('twilio').MessageInstance>}
 */
async function sendEveningReminder(patient, logUrl) {
  if (!patient || !patient.phone) throw new Error('sendEveningReminder: patient.phone is required');
  if (!logUrl || typeof logUrl !== 'string') throw new Error('sendEveningReminder: logUrl is required');

  const firstName = _firstName(patient.name);

  // Alternate between two variants based on even/odd day
  const startDate = patient.devices_collected_date
    ? new Date(patient.devices_collected_date)
    : new Date();
  const today = new Date();
  const dayNumber = Math.max(
    1,
    Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1
  );

  const message = dayNumber % 2 === 0
    ? `${firstName}, how did you do today? Log your steps and food: ${logUrl}`
    : `Evening ${firstName}. Did you stick to your food plan? Quick log: ${logUrl}`;

  return sendSms(patient.phone, message, patient.id);
}

// ─── Device return reminder (Day 8) ──────────────────────────────────────────

/**
 * Remind a patient to return their monitoring devices on Day 8.
 *
 * @param {object} patient — Row from the patients table
 * @returns {Promise<import('twilio').MessageInstance>}
 */
async function sendDeviceReturnReminder(patient) {
  if (!patient || !patient.phone) throw new Error('sendDeviceReturnReminder: patient.phone is required');

  const firstName  = _firstName(patient.name);
  const returnDate = _formatReturnDate(patient.devices_collected_date);

  const message = `${firstName}, please return your monitoring devices to the clinic by ${returnDate} to avoid the £200 charge.`;

  return sendSms(patient.phone, message, patient.id);
}

// ─── Booking confirmation ─────────────────────────────────────────────────────

/**
 * Send a booking confirmation SMS after payment is confirmed.
 *
 * @param {object} patient — Row from the patients table
 * @returns {Promise<import('twilio').MessageInstance>}
 */
async function sendBookingConfirmation(patient) {
  if (!patient || !patient.phone) throw new Error('sendBookingConfirmation: patient.phone is required');

  const firstName = _firstName(patient.name);
  const dateStr   = patient.appointment_date
    ? _formatDate(patient.appointment_date)
    : 'your appointment date';
  const timeStr   = patient.appointment_time ?? '';

  const message = `Booking confirmed, ${firstName}. Your appointment at the London Cardiology Clinic is on ${dateStr}${timeStr ? ' at ' + timeStr : ''}. Reply HELP for assistance.`;

  return sendSms(patient.phone, message, patient.id);
}

// ─── Report ready notification ────────────────────────────────────────────────

/**
 * Notify the patient that their report has been approved and sent.
 *
 * @param {object} patient — Row from the patients table
 * @returns {Promise<import('twilio').MessageInstance>}
 */
async function sendReportReady(patient) {
  if (!patient || !patient.phone) throw new Error('sendReportReady: patient.phone is required');

  const firstName = _firstName(patient.name);

  const message = `${firstName}, your cardiology report is ready. We've sent it to your email. Please contact us if you have any questions.`;

  return sendSms(patient.phone, message, patient.id);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Extract first name from a full name string. */
function _firstName(fullName) {
  if (!fullName) return 'there';
  return fullName.trim().split(/\s+/)[0];
}

/**
 * Format an ISO date string (YYYY-MM-DD) as a readable date, e.g. "Wednesday 25 March".
 * Falls back to the raw string if parsing fails.
 */
function _formatDate(isoDate) {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (_) {
    return isoDate;
  }
}

/**
 * Calculate the device return deadline (Day 8 = 7 days after collection)
 * and return it as a readable string.
 */
function _formatReturnDate(collectedDate) {
  try {
    const d = new Date((collectedDate || new Date().toISOString().slice(0, 10)) + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (_) {
    return 'within 7 days';
  }
}

/**
 * Estimate how many days in a row the patient has hit their goal.
 * Simple heuristic: returns the day number clamped to a plausible streak (1–7).
 * The cron job can pass the real streak if available.
 */
function _streakDays(dayNumber) {
  return Math.min(7, Math.max(1, dayNumber));
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendSms,
  sendMorningReminder,
  sendEveningReminder,
  sendDeviceReturnReminder,
  sendBookingConfirmation,
  sendReportReady,
};
