'use strict';

/**
 * routes/logs.js — Patient daily logging routes for London Cardiology Clinic
 *
 * Routes:
 *   POST /api/log            — Submit a daily log entry
 *   POST /api/log/ecg        — Upload a KardiaMobile PDF for parsing
 *   GET  /api/log/history    — Retrieve the patient's own log history
 *
 * Authentication is token-based: patients receive a unique QR-code URL
 * containing their log_token (stored in the patients table).
 *
 * Rate limit: max 3 log submissions per patient per calendar day.
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const db          = require('../db');
const ecgParser   = require('../services/ecg-parser');

const router = express.Router();

// ─── Upload directory configuration ──────────────────────────────────────────

const UPLOAD_BASE = process.env.UPLOAD_DIR || '/var/www/clinic-site/uploads';

// Multer storage engine — organise into per-patient subdirectories
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Token is validated before multer runs (see middleware below), but
    // at this stage req.patient may not yet be set.  We resolve the patient
    // inside the route handler and use a temp staging dir here.
    const stagingDir = path.join(UPLOAD_BASE, 'staging');
    try {
      fs.mkdirSync(stagingDir, { recursive: true });
    } catch (err) {
      return cb(new Error(`Failed to create staging directory: ${err.message}`));
    }
    cb(null, stagingDir);
  },
  filename(req, file, cb) {
    // Sanitise the original filename before using it on disk
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are accepted for ECG uploads'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Helper: resolve and validate a log_token ────────────────────────────────

/**
 * Look up a patient by log_token.  Returns the patient row or null.
 * Accepts token from either query string or request body.
 */
function resolvePatient(req) {
  const token = (req.query.token ?? req.body?.token ?? '').trim();
  if (!token) return null;
  return db.getPatientByToken(token);
}

// ─── Helper: count today's log submissions for a patient ─────────────────────

function countLogsToday(patientId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const db_   = db.getDb();
  return db_
    .prepare(`SELECT COUNT(*) AS n FROM daily_logs WHERE patient_id = ? AND log_date = ?`)
    .get(patientId, today).n;
}

// ─── POST /api/log ────────────────────────────────────────────────────────────

/**
 * Submit a daily log entry.
 *
 * Body (JSON or form-encoded):
 *   token         {string}  — Patient log token (from QR code)
 *   steps         {number}  — Step count
 *   foodStop1     {0|1}     — 1 = successfully avoided stop_food_1
 *   foodStop2     {0|1}     — 1 = successfully avoided stop_food_2
 *   foodStart1    {0|1}     — 1 = ate start_food_1 today
 *   foodStart2    {0|1}     — 1 = ate start_food_2 today
 *   bpSystolic    {number}  — Systolic BP (mmHg)
 *   bpDiastolic   {number}  — Diastolic BP (mmHg)
 *   heartRate     {number}  — Resting heart rate (bpm)
 *   note          {string}  — Free-text note (optional)
 *
 * Responses:
 *   200 { success: true, message: "Log saved" }
 *   400 { success: false, error: "..." }
 *   401 { success: false, error: "Invalid or missing token" }
 *   429 { success: false, error: "Daily submission limit reached" }
 */
router.post('/', (req, res) => {
  const patient = resolvePatient(req);
  if (!patient) {
    return res.status(401).json({ success: false, error: 'Invalid or missing token' });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Rate limit: max 3 submissions per day
  const submissionsToday = countLogsToday(patient.id);
  if (submissionsToday >= 3) {
    return res.status(429).json({
      success: false,
      error:   'Daily submission limit reached (maximum 3 per day)',
    });
  }

  // Parse fields — use nullish coalescing so 0 is treated as valid
  const steps      = _parseIntOrNull(req.body.steps);
  const foodStop1  = _parseBitOrNull(req.body.foodStop1);
  const foodStop2  = _parseBitOrNull(req.body.foodStop2);
  const foodStart1 = _parseBitOrNull(req.body.foodStart1);
  const foodStart2 = _parseBitOrNull(req.body.foodStart2);
  const bpSys      = _parseIntOrNull(req.body.bpSystolic);
  const bpDia      = _parseIntOrNull(req.body.bpDiastolic);
  const hr         = _parseIntOrNull(req.body.heartRate);
  const note       = typeof req.body.note === 'string' ? req.body.note.slice(0, 500) : null;

  // At least one data field must be present
  const hasData = [steps, foodStop1, foodStop2, foodStart1, foodStart2,
                   bpSys, bpDia, hr, note].some((v) => v != null);
  if (!hasData) {
    return res.status(400).json({
      success: false,
      error:   'Log must contain at least one data field (steps, food, BP, heart rate, or note)',
    });
  }

  // Validate ranges where applicable
  if (steps != null && (steps < 0 || steps > 100000)) {
    return res.status(400).json({ success: false, error: 'steps must be between 0 and 100,000' });
  }
  if (bpSys != null && (bpSys < 50 || bpSys > 300)) {
    return res.status(400).json({ success: false, error: 'bpSystolic out of plausible range (50–300)' });
  }
  if (bpDia != null && (bpDia < 30 || bpDia > 200)) {
    return res.status(400).json({ success: false, error: 'bpDiastolic out of plausible range (30–200)' });
  }
  if (hr != null && (hr < 20 || hr > 300)) {
    return res.status(400).json({ success: false, error: 'heartRate out of plausible range (20–300)' });
  }

  try {
    db.insertDailyLog({
      patient_id:  patient.id,
      log_date:    today,
      steps:       steps       ?? null,
      food_stop_1: foodStop1   ?? null,
      food_stop_2: foodStop2   ?? null,
      food_start_1: foodStart1 ?? null,
      food_start_2: foodStart2 ?? null,
      bp_systolic:  bpSys      ?? null,
      bp_diastolic: bpDia      ?? null,
      heart_rate:   hr         ?? null,
      note:         note,
    });
  } catch (err) {
    console.error('[POST /api/log] DB error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save log' });
  }

  return res.json({ success: true, message: 'Log saved' });
});

// ─── POST /api/log/ecg ────────────────────────────────────────────────────────

/**
 * Upload a KardiaMobile PDF and parse it into ECG records.
 *
 * Multipart form fields:
 *   token  {string} — Patient log token
 *   file   {file}   — PDF file (max 10 MB)
 *
 * Responses:
 *   200 { success: true, recordings: [...] }
 *   400 { success: false, error: "..." }
 *   401 { success: false, error: "Invalid or missing token" }
 */
router.post('/ecg', (req, res, next) => {
  // We need to read req.body.token before the multer upload starts.
  // Use a small pre-middleware to sniff the token from the raw form body
  // — multer buffers memory anyway for a non-file field.
  next();
}, upload.single('file'), async (req, res) => {
  // After multer: req.file is the uploaded PDF, req.body.token is the token field.
  const patient = resolvePatient(req);

  if (!patient) {
    // Clean up the staged file if token is invalid
    if (req.file) _safeUnlink(req.file.path);
    return res.status(401).json({ success: false, error: 'Invalid or missing token' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // Move the file from staging to the patient's subdirectory
  const patientDir = path.join(UPLOAD_BASE, String(patient.id));
  let finalPath;

  try {
    fs.mkdirSync(patientDir, { recursive: true });
    finalPath = path.join(patientDir, path.basename(req.file.path));
    fs.renameSync(req.file.path, finalPath);
  } catch (err) {
    _safeUnlink(req.file.path);
    console.error('[POST /api/log/ecg] File move error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to store uploaded file' });
  }

  // Read the saved file and parse it
  let buffer;
  try {
    buffer = fs.readFileSync(finalPath);
  } catch (err) {
    console.error('[POST /api/log/ecg] File read error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to read uploaded file' });
  }

  let recordings;
  try {
    recordings = await ecgParser.parseKardiaPdf(buffer);
  } catch (err) {
    console.error('[POST /api/log/ecg] Parse error:', err.message);
    return res.status(400).json({
      success: false,
      error:   `PDF could not be parsed: ${err.message}`,
    });
  }

  const today     = new Date().toISOString().slice(0, 10);
  const filename  = path.basename(finalPath);

  if (recordings.length === 0) {
    // Store an unparsed record so the admin can review the file manually
    try {
      db.insertEcgUpload({
        patient_id:     patient.id,
        upload_date:    today,
        filename,
        classification: null,
        heart_rate:     null,
        recording_time: null,
        flag_level:     'amber',
        parsed:         0,
      });
    } catch (err) {
      console.error('[POST /api/log/ecg] DB insert error (unparsed):', err.message);
    }

    return res.json({
      success:    true,
      recordings: [],
      message:    'No ECG recordings found in the uploaded PDF. The file has been saved for manual review.',
    });
  }

  // Persist each parsed recording to ecg_uploads
  const summary = ecgParser.generateEcgSummary(recordings);

  for (const r of recordings) {
    const flagLevel = ecgParser.classifyRecording(r.classification, r.heartRate);
    try {
      db.insertEcgUpload({
        patient_id:     patient.id,
        upload_date:    today,
        filename,
        classification: r.classification,
        heart_rate:     r.heartRate  ?? null,
        recording_time: r.recordingTime ?? null,
        flag_level:     flagLevel,
        parsed:         1,
      });
    } catch (err) {
      console.error('[POST /api/log/ecg] DB insert error:', err.message);
      // Non-fatal — continue storing remaining recordings
    }
  }

  return res.json({
    success:    true,
    recordings,
    summary,
  });
});

// ─── GET /api/log/history ─────────────────────────────────────────────────────

/**
 * Return the authenticated patient's own log history.
 *
 * Query params:
 *   token  {string} — Patient log token
 *
 * Response:
 *   200 { success: true, logs: [...], ecgUploads: [...] }
 *   401 { success: false, error: "Invalid or missing token" }
 */
router.get('/history', (req, res) => {
  const patient = resolvePatient(req);
  if (!patient) {
    return res.status(401).json({ success: false, error: 'Invalid or missing token' });
  }

  let logs;
  let ecgUploads;

  try {
    logs       = db.getLogsByPatient(patient.id);
    ecgUploads = db.getEcgsByPatient(patient.id);
  } catch (err) {
    console.error('[GET /api/log/history] DB error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to retrieve history' });
  }

  // Strip internal patient_id from responses (patient already authenticated by token)
  const sanitiseLogs = logs.map(({ patient_id, ...rest }) => rest);
  const sanitiseEcgs = ecgUploads.map(({ patient_id, ...rest }) => rest);

  return res.json({
    success:    true,
    logs:       sanitiseLogs,
    ecgUploads: sanitiseEcgs,
  });
});

// ─── Multer error handler ─────────────────────────────────────────────────────

// Must be declared AFTER all routes to catch multer errors
// (e.g. file too large, wrong mime type)
router.use((err, req, res, _next) => {
  if (err) {
    // Clean up any partially uploaded file
    if (req.file) _safeUnlink(req.file.path);

    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large — maximum size is 10 MB'
      : err.message;

    return res.status(status).json({ success: false, error: message });
  }
});

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Parse a value as an integer, returning null if not a valid finite integer. */
function _parseIntOrNull(value) {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  return isFinite(n) ? n : null;
}

/** Parse a value as a 0/1 bit, returning null if not valid. */
function _parseBitOrNull(value) {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  if (n === 0 || n === false || value === 'false') return 0;
  if (n === 1 || n === true  || value === 'true')  return 1;
  return null;
}

/** Silently attempt to unlink a file (best-effort cleanup). */
function _safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) { /* best-effort */ }
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = router;
