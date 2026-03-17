'use strict';

/**
 * Patients routes — London Cardiology Clinic (admin-only)
 *
 * All endpoints require the auth middleware to be applied at mount time.
 * Example in index.js:
 *   app.use('/api/patients', requireAuth, patientsRouter);
 *
 * Endpoints:
 *   GET  /api/patients                      List patients (filterable)
 *   GET  /api/patients/:id                  Full patient detail
 *   POST /api/patients/:id/devices-returned  Release device hold (returned)
 *   POST /api/patients/:id/devices-charged   Capture device hold (not returned)
 *   POST /api/patients/:id/approve-report    Approve & send report
 *   GET  /api/patients/:id/report           Generate report JSON
 */

const express = require('express');
const db = require('../db');
const stripeService = require('../services/stripe');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses and validates the :id path parameter.
 * Returns null if invalid.
 */
function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Returns true if the value is a non-empty string.
 */
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Converts a 0/1 SQLite integer to a boolean for JSON output.
 */
function boolCol(v) {
  return v === 1 || v === true;
}

/**
 * Formats a patient row from the DB for API output, stripping
 * internal tokens and sensitive stripe keys from general listings.
 */
function formatPatientSummary(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    dob: row.dob,
    tier: row.tier,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    language: row.language,
    status: row.status,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at,
  };
}

/**
 * Full patient detail including clinical/programme fields.
 */
function formatPatientDetail(row) {
  return {
    ...formatPatientSummary(row),
    consentDataProcessing: boolCol(row.consent_data_processing),
    consentGpSharing: boolCol(row.consent_gp_sharing),
    consentDeviceAgreement: boolCol(row.consent_device_agreement),
    stopFood1: row.stop_food_1,
    stopFood2: row.stop_food_2,
    startFood1: row.start_food_1,
    startFood2: row.start_food_2,
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripeHoldId: row.stripe_hold_id,
    devicesReturnedAt: row.devices_returned_at,
    devicesChargedAt: row.devices_charged_at,
    reportApprovedAt: row.report_approved_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validates a YYYY-MM-DD date string.
 */
function isValidDate(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// ─── GET /api/patients ────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const { tier, status, dateFrom, dateTo, page, pageSize } = req.query;

  // ── Input validation ──────────────────────────────────────────────────────

  const conditions = [];
  const params = [];

  if (tier !== undefined) {
    const tierNum = Number(tier);
    if (![1, 2].includes(tierNum)) {
      return res.status(400).json({ error: 'tier must be 1 or 2' });
    }
    conditions.push('tier = ?');
    params.push(tierNum);
  }

  const VALID_STATUSES = [
    'pending_payment', 'confirmed', 'cancelled', 'payment_failed',
    'completed', 'report_sent',
  ];
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
    conditions.push('status = ?');
    params.push(status);
  }

  if (dateFrom !== undefined) {
    if (!isValidDate(dateFrom)) {
      return res.status(400).json({ error: 'dateFrom must be YYYY-MM-DD' });
    }
    conditions.push('appointment_date >= ?');
    params.push(dateFrom);
  }

  if (dateTo !== undefined) {
    if (!isValidDate(dateTo)) {
      return res.status(400).json({ error: 'dateTo must be YYYY-MM-DD' });
    }
    conditions.push('appointment_date <= ?');
    params.push(dateTo);
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  const pageSizeNum = Math.min(Math.max(Number(pageSize) || 50, 1), 200);
  const pageNum = Math.max(Number(page) || 1, 1);
  const offset = (pageNum - 1) * pageSizeNum;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ── Query ─────────────────────────────────────────────────────────────────

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM patients ${where}`)
    .get(...params).n;

  const rows = db
    .prepare(
      `SELECT * FROM patients ${where}
       ORDER BY appointment_date DESC, appointment_time DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSizeNum, offset);

  return res.json({
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    patients: rows.map(formatPatientSummary),
  });
});

// ─── GET /api/patients/:id ────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // ── Logs ──────────────────────────────────────────────────────────────────

  let logs = [];
  try {
    logs = db
      .prepare('SELECT * FROM patient_logs WHERE patient_id = ? ORDER BY created_at ASC')
      .all(id);
  } catch (_) {
    // Table may not exist yet in early dev — degrade gracefully
  }

  // ── ECG records ───────────────────────────────────────────────────────────

  let ecgs = [];
  try {
    ecgs = db
      .prepare(
        'SELECT id, recorded_at, file_path, interpretation FROM ecg_records WHERE patient_id = ? ORDER BY recorded_at ASC'
      )
      .all(id);
  } catch (_) {
    // Degrade gracefully
  }

  // ── Programme progress (Tier 2 only) ─────────────────────────────────────

  let programmeProgress = null;
  if (patient.tier === 2) {
    try {
      programmeProgress = db
        .prepare('SELECT * FROM programme_progress WHERE patient_id = ?')
        .get(id);
    } catch (_) {
      // Degrade gracefully
    }
  }

  return res.json({
    patient: formatPatientDetail(patient),
    logs,
    ecgs,
    programmeProgress,
  });
});

// ─── POST /api/patients/:id/devices-returned ─────────────────────────────────

router.post('/:id/devices-returned', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (patient.tier !== 2) {
    return res.status(400).json({ error: 'Device management only applies to Tier 2 patients' });
  }

  if (patient.devices_returned_at) {
    return res.status(409).json({ error: 'Devices have already been marked as returned' });
  }

  if (patient.devices_charged_at) {
    return res
      .status(409)
      .json({ error: 'Device hold has already been captured (devices charged). Cannot reverse.' });
  }

  if (!patient.stripe_hold_id) {
    // No hold on record — mark as returned without Stripe action
    db.prepare(
      "UPDATE patients SET devices_returned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return res.json({ success: true, holdReleased: false, note: 'No Stripe hold on record' });
  }

  // ── Release hold ──────────────────────────────────────────────────────────

  try {
    await stripeService.cancelDeviceHold(patient.stripe_hold_id);
  } catch (err) {
    console.error(`[patients] Failed to release hold for patient ${id}:`, err.message);
    return res
      .status(502)
      .json({ error: `Failed to release Stripe hold: ${err.message}` });
  }

  db.prepare(
    "UPDATE patients SET devices_returned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);

  return res.json({ success: true, holdReleased: true });
});

// ─── POST /api/patients/:id/devices-charged ───────────────────────────────────

router.post('/:id/devices-charged', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (patient.tier !== 2) {
    return res.status(400).json({ error: 'Device management only applies to Tier 2 patients' });
  }

  if (patient.devices_charged_at) {
    return res.status(409).json({ error: 'Device hold has already been captured' });
  }

  if (patient.devices_returned_at) {
    return res.status(409).json({
      error: 'Devices were already marked as returned and the hold released. Cannot capture.',
    });
  }

  if (!patient.stripe_hold_id) {
    return res.status(400).json({ error: 'No Stripe hold on record for this patient' });
  }

  // ── Capture hold ──────────────────────────────────────────────────────────

  try {
    await stripeService.captureDeviceHold(patient.stripe_hold_id);
  } catch (err) {
    console.error(`[patients] Failed to capture hold for patient ${id}:`, err.message);
    return res
      .status(502)
      .json({ error: `Failed to capture Stripe hold: ${err.message}` });
  }

  db.prepare(
    "UPDATE patients SET devices_charged_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);

  return res.json({ success: true, holdCaptured: true });
});

// ─── GET /api/patients/:id/report ────────────────────────────────────────────

router.get('/:id/report', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // ── Determine report week ─────────────────────────────────────────────────

  // Week 1 report: generated ~7 days post-consultation
  // Week 7 report: generated ~49 days post-consultation (end of CardioTrack)
  // For Tier 1, only Week 1 applies.

  const confirmedAt = patient.confirmed_at ? new Date(patient.confirmed_at) : null;
  const now = new Date();
  let reportWeek = 1;

  if (confirmedAt) {
    const daysSinceConfirm = (now - confirmedAt) / 86400000;
    if (patient.tier === 2 && daysSinceConfirm >= 42) {
      reportWeek = 7;
    }
  }

  // ── Gather ECG data ───────────────────────────────────────────────────────

  let ecgs = [];
  try {
    ecgs = db
      .prepare(
        'SELECT recorded_at, interpretation, file_path FROM ecg_records WHERE patient_id = ? ORDER BY recorded_at ASC'
      )
      .all(id);
  } catch (_) {}

  // ── Gather programme progress ─────────────────────────────────────────────

  let progress = null;
  if (patient.tier === 2) {
    try {
      progress = db
        .prepare('SELECT * FROM programme_progress WHERE patient_id = ?')
        .get(id);
    } catch (_) {}
  }

  // ── Assemble report ───────────────────────────────────────────────────────

  const report = {
    reportWeek,
    generatedAt: now.toISOString(),
    patient: {
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      tier: patient.tier,
      appointmentDate: patient.appointment_date,
      language: patient.language,
    },
    ecgs: ecgs.map((e) => ({
      recordedAt: e.recorded_at,
      interpretation: e.interpretation,
      // file paths are server-internal; expose only a reference token
      fileRef: e.file_path ? `ecg-${id}-${e.recorded_at}` : null,
    })),
    programmeProgress: progress,
    approved: !!patient.report_approved_at,
    approvedAt: patient.report_approved_at || null,
  };

  return res.json({ report });
});

// ─── POST /api/patients/:id/approve-report ────────────────────────────────────

router.post('/:id/approve-report', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (!['confirmed', 'completed'].includes(patient.status)) {
    return res.status(400).json({
      error: 'Report can only be approved for confirmed or completed bookings',
    });
  }

  if (patient.report_approved_at) {
    return res.status(409).json({ error: 'Report has already been approved and sent' });
  }

  // ── Optional: override GP email and notes ────────────────────────────────

  const { gpEmail, clinicianNotes } = req.body;

  if (gpEmail !== undefined) {
    if (!isNonEmptyString(gpEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gpEmail.trim())) {
      return res.status(400).json({ error: 'gpEmail is not a valid email address' });
    }
  }

  if (clinicianNotes !== undefined && typeof clinicianNotes !== 'string') {
    return res.status(400).json({ error: 'clinicianNotes must be a string' });
  }

  // ── Mark report as approved ───────────────────────────────────────────────

  db.prepare(
    "UPDATE patients SET report_approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);

  // ── Fire event so email service can dispatch (decoupled) ─────────────────

  req.app.emit('report:approved', {
    patientId: id,
    gpEmail: gpEmail ? gpEmail.trim() : null,
    clinicianNotes: clinicianNotes ? clinicianNotes.trim() : null,
    consentGpSharing: boolCol(patient.consent_gp_sharing),
  });

  return res.json({
    success: true,
    message: 'Report approved. Confirmation will be sent to the patient' +
      (boolCol(patient.consent_gp_sharing) && gpEmail ? ' and their GP.' : '.'),
  });
});

module.exports = router;
