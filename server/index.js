'use strict';

/**
 * index.js — Express server for London Cardiology Clinic
 *
 * Port        : 3001  (Cal.com occupies 3000)
 * Static root : parent directory (../index.html, ../css/, ../js/, etc.)
 * API routes  : /api/*
 * Pages       : /book, /log, /dashboard
 *
 * CommonJS throughout (no import/export).
 */

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

const express       = require('express');
const helmet        = require('helmet');
const cookieSession = require('cookie-session');
const path          = require('path');
const cron          = require('node-cron');
const bcrypt        = require('bcrypt');

const {
  initDb,
  getDb,

  // Slots
  getAvailableSlots,
  getSlotByDatetime,
  bookSlot,
  freeSlot,

  // Patients
  createPatient,
  getPatientById,
  getPatientByToken,
  getPatientByEmail,
  getAllPatients,
  updatePatientField,
  cancelPatient,

  // Daily logs
  insertDailyLog,
  getLogsByPatient,
  getLogByPatientAndDate,

  // ECG uploads
  insertEcgUpload,
  getEcgsByPatient,
  updateEcgParsed,
  getUnparsedEcgs,

  // Admin
  getAdminByUsername,
  updateAdminPassword,

  // SMS log
  logSms,
  getSmsByPatient,

  // Dashboard / cron queries
  getPatientsWithAppointmentOn,
  getOutstandingDevicePatients,
  getDashboardStats,
} = require('./db');

// ---------------------------------------------------------------------------
// Optional integrations (gracefully degraded when env vars are absent)
// ---------------------------------------------------------------------------

let stripe       = null;
let twilioClient = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('[stripe] Stripe client initialised');
} else {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe features disabled');
}

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('[twilio] Twilio client initialised');
} else {
  console.warn('[twilio] TWILIO_* env vars not set — SMS features disabled');
}

// ---------------------------------------------------------------------------
// File upload (multer)
// ---------------------------------------------------------------------------

const multer = require('multer');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'ecg-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPEG, PNG and TIFF files are accepted'));
  },
});

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Security — helmet CSP configured for our inline styles & scripts
// ---------------------------------------------------------------------------

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'", "'unsafe-inline'", 'js.stripe.com'],
        styleSrc:       ["'self'", "'unsafe-inline'"],
        imgSrc:         ["'self'", 'data:', 'blob:'],
        connectSrc:     ["'self'", 'api.stripe.com'],
        frameSrc:       ['js.stripe.com'],
        objectSrc:      ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // X-Frame-Options: DENY — prevent clickjacking
    frameguard: { action: 'deny' },
  })
);

// ---------------------------------------------------------------------------
// Cookie-session (admin auth)
// ---------------------------------------------------------------------------

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
if (SESSION_SECRET === 'dev-secret-change-in-production') {
  console.error('[FATAL] SESSION_SECRET must be changed from the default value. Exiting.');
  process.exit(1);
}

app.use(
  cookieSession({
    name:   'lcc_session',
    secret: SESSION_SECRET,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  })
);

// ---------------------------------------------------------------------------
// Body parsers
// ---------------------------------------------------------------------------

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Static files — serve the clinic website from the parent directory
// ---------------------------------------------------------------------------

const STATIC_ROOT = path.join(__dirname, '..');

// Block direct access to server source code and data directories
app.use('/server', (_req, res) => res.status(403).end());
app.use('/data', (_req, res) => res.status(403).json({ error: 'Forbidden' }));

app.use(express.static(STATIC_ROOT, {
  index: 'index.html',
  dotfiles: 'deny',
}));

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    if (req.headers['accept'] && req.headers['accept'].includes('text/html')) {
      return res.redirect('/dashboard/login');
    }
    return res.status(401).json({ error: 'Unauthorised' });
  }
  // Block all operations except password change and logout if default password is still in use
  if (req.session.mustChangePassword
      && !req.path.endsWith('/change-password')
      && !req.path.endsWith('/logout')) {
    return res.status(403).json({ error: 'Password change required before accessing other features' });
  }
  return next();
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Generate a URL-safe random token (32 hex chars).
 * Used for patient log tokens.
 */
function generateToken() {
  return require('crypto').randomBytes(16).toString('hex');
}

/**
 * Format a date string as "Monday 14 July 2025" for SMS messages.
 */
function formatDateHuman(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/**
 * Add days to an ISO date string, return ISO date string.
 */
function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Return today's ISO date (YYYY-MM-DD).
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Escape HTML for safe server-side template rendering.
 */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// SMS helper
// ---------------------------------------------------------------------------

async function sendSms(patientId, toNumber, message) {
  if (!twilioClient || !process.env.TWILIO_FROM_NUMBER) {
    console.log(`[sms] SKIPPED (Twilio not configured) → ${toNumber}: ${message}`);
    logSms(patientId, message, 'skipped');
    return;
  }
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to:   toNumber,
    });
    logSms(patientId, message, 'sent');
  } catch (err) {
    console.error(`[sms] Failed to send to ${toNumber}:`, err.message);
    logSms(patientId, message, 'failed');
  }
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, no extra dependency)
// ---------------------------------------------------------------------------

const loginAttempts = new Map();

function checkLoginRate(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && record.blocked > now) return false;
  return true;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, first: now };
  record.count++;
  if (record.count >= 5) record.blocked = now + 900000; // 15 minutes
  loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip) { loginAttempts.delete(ip); }

const bookingAttempts = new Map();

function checkBookingRate(ip) {
  const now = Date.now();
  const record = bookingAttempts.get(ip);
  if (!record) return true;
  // Remove entries older than 1 hour
  record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000);
  if (record.timestamps.length >= 3) return false;
  return true;
}

function recordBookingAttempt(ip) {
  const now = Date.now();
  const record = bookingAttempts.get(ip) || { timestamps: [] };
  record.timestamps.push(now);
  bookingAttempts.set(ip, record);
}

// ---------------------------------------------------------------------------
// API routes — /api/*
// ---------------------------------------------------------------------------

const api = express.Router();

// ---- Health check ----

api.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ---- Slots ----

api.get('/slots', (_req, res) => {
  try {
    const slots = getAvailableSlots();
    res.json({ slots });
  } catch (err) {
    console.error('[api/slots]', err);
    res.status(500).json({ error: 'Failed to retrieve slots' });
  }
});

// ---- Booking ----

/**
 * POST /api/book
 * Body: { name, email, phone, dob, tier, language,
 *         slot_date, slot_time,
 *         consent_data_processing, consent_gp_sharing, consent_device_agreement,
 *         stripe_payment_method_id }
 *
 * Flow:
 *  1. Validate input
 *  2. Check slot is still free
 *  3. Create PaymentIntent (tier 1: £49.99 capture; tier 2: £49.99 capture + £200 hold)
 *  4. Create patient record + book slot atomically
 *  5. Send confirmation SMS
 */
api.post('/book', async (req, res) => {
  // Rate limit: max 3 bookings per hour per IP
  const ip = req.ip;
  if (!checkBookingRate(ip)) {
    return res.status(429).json({ error: 'Too many booking attempts. Please try again later.' });
  }
  recordBookingAttempt(ip);

  const {
    name, email, phone, dob, tier, language,
    slot_date, slot_time,
    consent_data_processing, consent_gp_sharing, consent_device_agreement,
    stripe_payment_method_id,
  } = req.body;

  // --- Validation ---
  const errors = [];
  if (!name  || name.trim().length < 2)    errors.push('name is required');
  if (!email || !email.includes('@'))       errors.push('valid email is required');
  if (!phone || phone.trim().length < 7)   errors.push('phone is required');
  if (!dob)                                 errors.push('date of birth is required');
  if (![1, 2].includes(Number(tier)))       errors.push('tier must be 1 or 2');
  if (!slot_date || !slot_time)             errors.push('slot_date and slot_time are required');
  if (!consent_data_processing)             errors.push('data processing consent is required');

  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const tierNum = Number(tier);
  if (tierNum === 2 && !consent_device_agreement) {
    return res.status(400).json({ error: 'Device agreement consent is required for CardioTrack' });
  }

  try {
    // --- Check slot ---
    const slot = getSlotByDatetime(slot_date, slot_time);
    if (!slot || slot.is_booked) {
      return res.status(409).json({ error: 'This slot is no longer available' });
    }

    // --- Stripe ---
    let stripePaymentId = null;
    let stripeHoldId    = null;

    if (stripe && stripe_payment_method_id) {
      // Consultation fee: £49.99 (4999 pence) — immediate capture
      const intent = await stripe.paymentIntents.create({
        amount:               4999,
        currency:             'gbp',
        payment_method:       stripe_payment_method_id,
        confirm:              true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        description:          `London Cardiology Clinic — Tier ${tierNum} booking`,
        metadata:             { email, slot_date, slot_time },
      });
      stripePaymentId = intent.id;

      // Device hold for tier 2: £200 (20000 pence) — manual capture (hold)
      if (tierNum === 2) {
        const hold = await stripe.paymentIntents.create({
          amount:               20000,
          currency:             'gbp',
          payment_method:       stripe_payment_method_id,
          confirm:              true,
          capture_method:       'manual',  // hold only
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          description:          'London Cardiology Clinic — CardioTrack device deposit hold',
          metadata:             { email, type: 'device_hold' },
        });
        stripeHoldId = hold.id;
      }
    }

    // --- Create patient & book slot (synchronous better-sqlite3 transaction) ---
    const logToken = generateToken();
    const consentTs = new Date().toISOString();

    const db = getDb();
    const bookingTransaction = db.transaction(() => {
      const patientId = createPatient({
        name:                     name.trim(),
        email:                    email.trim().toLowerCase(),
        phone:                    phone.trim(),
        dob,
        tier:                     tierNum,
        language:                 language || 'en',
        consent_data_processing:  consent_data_processing  ? 1 : 0,
        consent_gp_sharing:       consent_gp_sharing       ? 1 : 0,
        consent_device_agreement: consent_device_agreement ? 1 : 0,
        consent_timestamp:        consentTs,
        appointment_date:         slot_date,
        appointment_time:         slot_time,
        stripe_payment_id:        stripePaymentId,
        stripe_hold_id:           stripeHoldId,
        log_token:                logToken,
      });

      const bookResult = bookSlot(slot_date, slot_time, patientId);
      if (bookResult.changes === 0) {
        throw new Error('SLOT_CONFLICT'); // caught below, triggers rollback
      }

      return patientId;
    });

    let patientId;
    try {
      patientId = bookingTransaction();
    } catch (txErr) {
      if (txErr.message === 'SLOT_CONFLICT') {
        return res.status(409).json({ error: 'Slot was just taken — please choose another' });
      }
      throw txErr;
    }

    // --- Confirmation SMS (async, non-blocking) ---
    const humanDate = formatDateHuman(slot_date);
    const smsBody   = tierNum === 1
      ? `London Cardiology Clinic: Your appointment is confirmed for ${humanDate} at ${slot_time}. Reply CANCEL to cancel.`
      : `London Cardiology Clinic: Your CardioTrack appointment is confirmed for ${humanDate} at ${slot_time}. Please bring your devices. Reply CANCEL to cancel.`;

    sendSms(patientId, phone, smsBody).catch((e) => console.error('[sms async]', e));

    // --- Response ---
    const logUrl = `${process.env.BASE_URL || 'https://londoncardiologyclinic.uk'}/log?token=${logToken}`;
    res.status(201).json({
      success:    true,
      patient_id: patientId,
      log_url:    tierNum === 2 ? logUrl : undefined,
      message:    'Booking confirmed. A confirmation SMS has been sent.',
    });

  } catch (err) {
    console.error('[api/book]', err);
    res.status(500).json({ error: 'Booking failed. Please try again or call the clinic.' });
  }
});

// ---- Cancellation ----

/**
 * POST /api/cancel
 * Body: { token }  (log_token — authenticates the patient securely)
 */
api.post('/cancel', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    const patient = getPatientByToken(token.trim());
    if (!patient) {
      return res.status(404).json({ error: 'Booking not found or token is invalid' });
    }
    if (patient.booking_status === 'cancelled') {
      return res.status(409).json({ error: 'Booking is already cancelled' });
    }

    cancelPatient(patient.id);
    if (patient.appointment_date && patient.appointment_time) {
      freeSlot(patient.appointment_date, patient.appointment_time);
    }

    // Release Stripe hold if tier 2 and hold not yet captured
    if (stripe && patient.stripe_hold_id && !patient.device_hold_charged) {
      try {
        await stripe.paymentIntents.cancel(patient.stripe_hold_id);
      } catch (stripeErr) {
        console.warn('[api/cancel] Stripe hold cancel failed:', stripeErr.message);
      }
    }

    const smsBody = `London Cardiology Clinic: Your appointment on ${patient.appointment_date} has been cancelled. To rebook visit londoncardiologyclinic.uk`;
    sendSms(patient.id, patient.phone, smsBody).catch((e) => console.error('[sms cancel]', e));

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    console.error('[api/cancel]', err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// ---- Daily log (patient-facing, authenticated by QR token) ----

/**
 * GET /api/log/patient?token=xxx
 * Returns patient info + recent logs for the log page.
 */
api.get('/log/patient', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const patient = getPatientByToken(token);
  if (!patient) return res.status(404).json({ error: 'Invalid or expired token' });

  const logs = getLogsByPatient(patient.id).slice(0, 30);

  res.json({
    patient: {
      id:               patient.id,
      name:             patient.name,
      programme_status: patient.programme_status,
      stop_food_1:      patient.stop_food_1,
      stop_food_2:      patient.stop_food_2,
      start_food_1:     patient.start_food_1,
      start_food_2:     patient.start_food_2,
    },
    logs,
  });
});

/**
 * POST /api/log/submit
 * Body: { token, log_date, steps, food_stop_1, food_stop_2,
 *          food_start_1, food_start_2, bp_systolic, bp_diastolic,
 *          heart_rate, note }
 *
 * Token should be sent in the POST body (not query string).
 * The QR code URL should use a fragment (#token=xxx) or a POST intermediary page
 * to avoid exposing the token in server access logs.
 */
api.post('/log/submit', (req, res) => {
  // Accept token from body only (not query string — avoids exposure in server logs)
  const token = req.body.token;
  const { log_date, ...fields } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  if (!log_date) return res.status(400).json({ error: 'log_date is required' });

  const patient = getPatientByToken(token);
  if (!patient) return res.status(404).json({ error: 'Invalid or expired token' });

  // Validate cancelled patients cannot log
  if (patient.booking_status === 'cancelled') {
    return res.status(403).json({ error: 'This booking has been cancelled. Logging is no longer available.' });
  }

  // Reject future dates
  if (log_date > today()) {
    return res.status(400).json({ error: 'Cannot log for future dates' });
  }

  // Upsert: if entry for this date already exists, return conflict
  const existing = getLogByPatientAndDate(patient.id, log_date);
  if (existing) {
    return res.status(409).json({
      error:    'A log entry for this date already exists',
      existing: existing,
    });
  }

  const bpSys = fields.bp_systolic != null ? Number(fields.bp_systolic) : null;
  const bpDia = fields.bp_diastolic != null ? Number(fields.bp_diastolic) : null;

  try {
    insertDailyLog({
      patient_id:   patient.id,
      log_date,
      steps:        fields.steps        != null ? Number(fields.steps)        : null,
      food_stop_1:  fields.food_stop_1  != null ? Number(fields.food_stop_1)  : null,
      food_stop_2:  fields.food_stop_2  != null ? Number(fields.food_stop_2)  : null,
      food_start_1: fields.food_start_1 != null ? Number(fields.food_start_1) : null,
      food_start_2: fields.food_start_2 != null ? Number(fields.food_start_2) : null,
      bp_systolic:  bpSys,
      bp_diastolic: bpDia,
      heart_rate:   fields.heart_rate   != null ? Number(fields.heart_rate)   : null,
      note:         fields.note         || null,
    });

    // Red-flag alerting: severely elevated BP (systolic >= 180 OR diastolic >= 110)
    if ((bpSys != null && bpSys >= 180) || (bpDia != null && bpDia >= 110)) {
      console.warn(`[RED FLAG] Patient ${patient.id} (${patient.name}) submitted severely elevated BP: ${bpSys}/${bpDia}`);
      if (twilioClient && process.env.TWILIO_FROM_NUMBER && process.env.CLINIC_PHONE_NUMBER) {
        const alertMsg = `RED FLAG: Patient ${patient.name} (ID ${patient.id}) submitted BP ${bpSys}/${bpDia}. Urgent review required.`;
        sendSms(patient.id, process.env.CLINIC_PHONE_NUMBER, alertMsg).catch((e) => console.error('[red-flag sms]', e));
      }
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[api/log/submit]', err);
    res.status(500).json({ error: 'Failed to save log entry' });
  }
});

// ---- ECG upload (patient-facing) ----

/**
 * POST /api/ecg/upload
 * Multipart form: token (field), file (field: ecg)
 */
api.post('/ecg/upload', upload.single('ecg'), async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const patient = getPatientByToken(token);
  if (!patient) return res.status(404).json({ error: 'Invalid or expired token' });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    insertEcgUpload({
      patient_id:     patient.id,
      upload_date:    today(),
      filename:       req.file.filename,
      classification: null,
      heart_rate:     null,
      recording_time: null,
      flag_level:     'green',
      parsed:         0,
    });

    // Attempt to parse the ECG and check for red-flag recordings
    try {
      const ecgParser = require('./services/ecg-parser');
      const ecgBuffer = fs.readFileSync(path.join(UPLOAD_DIR, req.file.filename));
      const recordings = await ecgParser.parseKardiaPdf(ecgBuffer);
      const hasRedFlag = recordings.some((r) => ecgParser.classifyRecording(r.classification, r.heartRate) === 'red');
      if (hasRedFlag) {
        console.warn(`[RED FLAG] Patient ${patient.id} (${patient.name}) uploaded ECG with red-flag recording`);
        if (twilioClient && process.env.TWILIO_FROM_NUMBER && process.env.CLINIC_PHONE_NUMBER) {
          const alertMsg = `RED FLAG: Patient ${patient.name} (ID ${patient.id}) uploaded ECG with atrial fibrillation. Urgent review required.`;
          sendSms(patient.id, process.env.CLINIC_PHONE_NUMBER, alertMsg).catch((e) => console.error('[red-flag sms]', e));
        }
      }
    } catch (parseErr) {
      // Non-fatal — the file is saved for manual review regardless
      console.log('[api/ecg/upload] Auto-parse not available:', parseErr.message);
    }

    res.status(201).json({ success: true, filename: req.file.filename });
  } catch (err) {
    console.error('[api/ecg/upload]', err);
    res.status(500).json({ error: 'Failed to save ECG record' });
  }
});

// ---- Admin auth ----

/**
 * POST /api/admin/login
 * Body: { username, password }
 */
api.post('/admin/login', async (req, res) => {
  const ip = req.ip;
  if (!checkLoginRate(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const admin = getAdminByUsername(username);
    if (!admin) {
      recordLoginFailure(ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      recordLoginFailure(ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearLoginAttempts(ip);

    // Check if password is still the default — force change
    const DEFAULT_ADMIN_PLAINTEXT = 'ChangeMe123!';
    const isDefault = await bcrypt.compare(DEFAULT_ADMIN_PLAINTEXT, admin.password_hash);
    if (isDefault) {
      // Set session so password change endpoint works, but flag as must-change
      req.session.adminId   = admin.id;
      req.session.adminUser = admin.username;
      req.session.mustChangePassword = true;
      return res.json({ success: true, mustChangePassword: true });
    }

    req.session.adminId   = admin.id;
    req.session.adminUser = admin.username;
    req.session.mustChangePassword = false;
    res.json({ success: true });
  } catch (err) {
    console.error('[api/admin/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/admin/logout
 */
api.post('/admin/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

/**
 * POST /api/admin/change-password
 * Body: { current_password, new_password }
 */
api.post('/admin/change-password', requireAdmin, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both passwords are required' });
  }
  if (new_password.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters' });
  }

  try {
    const admin = getAdminByUsername(req.session.adminUser);
    const match = await bcrypt.compare(current_password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    await updateAdminPassword(req.session.adminUser, new_password);
    req.session.mustChangePassword = false;
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('[api/admin/change-password]', err);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ---- Admin patient management ----

api.get('/admin/patients', requireAdmin, (_req, res) => {
  try {
    const patients = getAllPatients().map(({ log_token, stripe_payment_id, stripe_hold_id, ...safe }) => safe);
    res.json({ patients });
  } catch (err) {
    console.error('[api/admin/patients]', err);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

api.get('/admin/patients/:id', requireAdmin, (req, res) => {
  try {
    const raw = getPatientById(Number(req.params.id));
    if (!raw) return res.status(404).json({ error: 'Patient not found' });
    const { log_token, stripe_payment_id, stripe_hold_id, ...patient } = raw;
    const logs = getLogsByPatient(raw.id);
    const ecgs = getEcgsByPatient(raw.id);
    const sms  = getSmsByPatient(raw.id);
    res.json({ patient, logs, ecgs, sms });
  } catch (err) {
    console.error('[api/admin/patients/:id]', err);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

/**
 * PATCH /api/admin/patients/:id
 * Body: { field, value }
 * Updates a single allowed field.
 */
api.patch('/admin/patients/:id', requireAdmin, (req, res) => {
  const { field, value } = req.body;
  if (!field) return res.status(400).json({ error: 'field is required' });

  try {
    updatePatientField(Number(req.params.id), field, value);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('allowlist')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[api/admin/patients/:id PATCH]', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ---- Admin: device management ----

/**
 * POST /api/admin/devices/collected
 * Body: { patient_id }
 * Marks devices as collected; starts monitoring phase.
 */
api.post('/admin/devices/collected', requireAdmin, (req, res) => {
  const { patient_id } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

  try {
    const id = Number(patient_id);
    updatePatientField(id, 'devices_collected', 1);
    updatePatientField(id, 'devices_collected_date', today());
    updatePatientField(id, 'programme_status', 'monitoring');
    res.json({ success: true });
  } catch (err) {
    console.error('[api/admin/devices/collected]', err);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

/**
 * POST /api/admin/devices/returned
 * Body: { patient_id }
 * Marks devices as returned; releases the £200 Stripe hold.
 */
api.post('/admin/devices/returned', requireAdmin, async (req, res) => {
  const { patient_id } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

  try {
    const id      = Number(patient_id);
    const patient = getPatientById(id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    updatePatientField(id, 'devices_returned', 1);
    updatePatientField(id, 'devices_returned_date', today());

    // Release Stripe hold
    if (stripe && patient.stripe_hold_id && !patient.device_hold_released) {
      try {
        await stripe.paymentIntents.cancel(patient.stripe_hold_id);
        updatePatientField(id, 'device_hold_released', 1);
        console.log(`[stripe] Hold released for patient ${id}`);
      } catch (stripeErr) {
        console.error('[stripe] Hold release failed:', stripeErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[api/admin/devices/returned]', err);
    res.status(500).json({ error: 'Failed to update device return status' });
  }
});

/**
 * POST /api/admin/devices/charge-hold
 * Body: { patient_id }
 * Captures the £200 device hold (devices not returned / damaged).
 */
api.post('/admin/devices/charge-hold', requireAdmin, async (req, res) => {
  const { patient_id } = req.body;
  if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

  try {
    const id      = Number(patient_id);
    const patient = getPatientById(id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (!stripe || !patient.stripe_hold_id) {
      return res.status(400).json({ error: 'No Stripe hold on record for this patient' });
    }
    if (patient.device_hold_charged) {
      return res.status(409).json({ error: 'Hold has already been charged' });
    }

    await stripe.paymentIntents.capture(patient.stripe_hold_id);
    updatePatientField(id, 'device_hold_charged', 1);
    console.log(`[stripe] Hold captured for patient ${id}`);

    res.json({ success: true, message: '£200 device hold captured' });
  } catch (err) {
    console.error('[api/admin/devices/charge-hold]', err);
    res.status(500).json({ error: 'Failed to capture hold: ' + err.message });
  }
});

// ---- Admin: ECG management ----

/**
 * PATCH /api/admin/ecg/:id
 * Body: { classification, heart_rate, recording_time, flag_level }
 */
api.patch('/admin/ecg/:id', requireAdmin, (req, res) => {
  const { classification, heart_rate, recording_time, flag_level } = req.body;
  const validFlags = ['green', 'amber', 'red'];
  if (flag_level && !validFlags.includes(flag_level)) {
    return res.status(400).json({ error: 'flag_level must be green, amber or red' });
  }

  try {
    updateEcgParsed(
      Number(req.params.id),
      classification   || null,
      heart_rate       ? Number(heart_rate) : null,
      recording_time   || null,
      flag_level       || 'green',
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[api/admin/ecg/:id]', err);
    res.status(500).json({ error: 'Failed to update ECG record' });
  }
});

// ---- Admin: SMS ----

/**
 * POST /api/admin/sms/send
 * Body: { patient_id, message }
 */
api.post('/admin/sms/send', requireAdmin, async (req, res) => {
  const { patient_id, message } = req.body;
  if (!patient_id || !message) {
    return res.status(400).json({ error: 'patient_id and message are required' });
  }

  const patient = getPatientById(Number(patient_id));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  try {
    await sendSms(patient.id, patient.phone, message);
    res.json({ success: true });
  } catch (err) {
    console.error('[api/admin/sms/send]', err);
    res.status(500).json({ error: 'SMS send failed' });
  }
});

// ---- Admin: Dashboard stats ----

api.get('/admin/stats', requireAdmin, (_req, res) => {
  try {
    res.json(getDashboardStats());
  } catch (err) {
    console.error('[api/admin/stats]', err);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// ---- Admin: Slots management ----

/**
 * GET /api/admin/slots
 * All slots (booked and free) with patient info.
 */
api.get('/admin/slots', requireAdmin, (_req, res) => {
  try {
    const db    = getDb();
    const slots = db.prepare(`
      SELECT s.*, p.name AS patient_name, p.email AS patient_email, p.tier AS patient_tier
      FROM slots s
      LEFT JOIN patients p ON s.patient_id = p.id
      ORDER BY s.slot_date, s.slot_time
    `).all();
    res.json({ slots });
  } catch (err) {
    console.error('[api/admin/slots]', err);
    res.status(500).json({ error: 'Failed to retrieve slots' });
  }
});

/**
 * POST /api/admin/slots/add
 * Body: { slot_date, slot_time }
 * Adds a one-off extra slot.
 */
api.post('/admin/slots/add', requireAdmin, (req, res) => {
  const { slot_date, slot_time } = req.body;
  if (!slot_date || !slot_time) {
    return res.status(400).json({ error: 'slot_date and slot_time are required' });
  }

  try {
    getDb().prepare('INSERT OR IGNORE INTO slots (slot_date, slot_time) VALUES (?, ?)').run(slot_date, slot_time);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[api/admin/slots/add]', err);
    res.status(500).json({ error: 'Failed to add slot' });
  }
});

// Mount API router
app.use('/api', api);

// ---------------------------------------------------------------------------
// Page routes
// ---------------------------------------------------------------------------

/**
 * /book — Booking page
 * Returns the main index.html; booking UI is rendered client-side.
 * The booking form JS will hit /api/slots and /api/book.
 */
app.get('/book', (_req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});

/**
 * /log — Patient daily log page (authenticated by QR token in query string)
 * Serves a self-contained HTML page that loads the patient's programme details
 * and provides a form to submit daily readings.
 */
app.get('/log', (req, res) => {
  const { token } = req.query;

  // Build a minimal, safe HTML page without any literal </script> inside JS.
  // All dynamic values are escaped server-side.
  const safeToken = esc(token || '');
  const baseUrl   = process.env.BASE_URL || '';

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Log — London Cardiology Clinic</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f0f4f8;color:#1a2332;padding:1rem}
    .card{background:#fff;border-radius:12px;padding:1.5rem;max-width:520px;margin:1rem auto;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    h1{font-size:1.25rem;color:#c0392b;margin-bottom:.25rem}
    h2{font-size:1rem;color:#2c3e50;margin-bottom:1rem;font-weight:500}
    label{display:block;font-size:.85rem;color:#555;margin-top.75rem;margin-bottom:.25rem}
    input,textarea{width:100%;padding:.5rem .75rem;border:1px solid #ccd;border-radius:6px;font-size:.95rem}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
    button{margin-top:1rem;width:100%;padding:.75rem;background:#c0392b;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer}
    button:disabled{background:#aaa}
    .msg{margin-top:.75rem;padding:.6rem;border-radius:6px;font-size:.9rem}
    .msg.ok{background:#d4edda;color:#155724}
    .msg.err{background:#f8d7da;color:#721c24}
    .food-row{display:flex;align-items:center;gap:.5rem;margin-top:.5rem}
    .food-row label{margin:0;flex:1}
    .toggle{display:flex;gap:.5rem}
    .toggle button{flex:1;padding:.4rem;font-size:.85rem;background:#eee;color:#333;margin:0;border-radius:6px}
    .toggle button.active{background:#27ae60;color:#fff}
    .toggle button.active-no{background:#e74c3c;color:#fff}
    #programme-info{font-size:.85rem;color:#555;margin-bottom.75rem}
    #loading{text-align:center;padding:2rem;color:#888}
  </style>
</head>
<body>
  <div class="card">
    <h1>London Cardiology Clinic</h1>
    <h2>Daily Log</h2>
    <div id="loading">Loading your programme…</div>
    <div id="app" style="display:none">
      <div id="programme-info"></div>
      <form id="log-form">
        <input type="hidden" id="log-token" value="${safeToken}">
        <label for="log-date">Date</label>
        <input type="date" id="log-date" required>
        <label>Steps today</label>
        <input type="number" id="steps" min="0" max="100000" placeholder="e.g. 8500">
        <div id="food-section"></div>
        <label>Blood pressure</label>
        <div class="row">
          <input type="number" id="bp-sys" placeholder="Systolic (e.g. 128)" min="50" max="300">
          <input type="number" id="bp-dia" placeholder="Diastolic (e.g. 82)" min="30" max="200">
        </div>
        <label>Heart rate (bpm)</label>
        <input type="number" id="hr" min="20" max="300" placeholder="e.g. 72">
        <label>Notes (optional)</label>
        <textarea id="note" rows="3" placeholder="How are you feeling? Any symptoms?"></textarea>
        <button type="submit" id="submit-btn">Submit today's log</button>
        <div id="log-msg" class="msg" style="display:none"></div>
      </form>
    </div>
  </div>
  <script>
  (function() {
    var token  = document.getElementById('log-token').value;
    var apiBase = '${esc(baseUrl)}';

    if (!token) {
      document.getElementById('loading').textContent = 'Invalid link. Please use the QR code from your welcome pack.';
      return;
    }

    // Set today as default date
    var todayStr = new Date().toISOString().slice(0, 10);
    document.getElementById('log-date').value = todayStr;
    document.getElementById('log-date').max   = todayStr;

    // Load patient data
    fetch(apiBase + '/api/log/patient?token=' + encodeURIComponent(token))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) {
          document.getElementById('loading').textContent = data.error;
          return;
        }
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        var p = data.patient;
        var infoEl = document.getElementById('programme-info');
        infoEl.innerHTML = '<p>Hello, <strong>' + escHtml(p.name) + '</strong> &mdash; Programme: <strong>' + escHtml(p.programme_status) + '</strong></p>';

        // Build food section
        var foodHtml = '';
        var foods = [
          { id: 'food_stop_1',  label: 'Avoided: ' + (p.stop_food_1  || '—'), type: 'avoid' },
          { id: 'food_stop_2',  label: 'Avoided: ' + (p.stop_food_2  || '—'), type: 'avoid' },
          { id: 'food_start_1', label: 'Ate: '     + (p.start_food_1 || '—'), type: 'ate'   },
          { id: 'food_start_2', label: 'Ate: '     + (p.start_food_2 || '—'), type: 'ate'   },
        ].filter(function(f) {
          return f.label.indexOf('—') === -1 || f.type;
        });

        foods.forEach(function(f) {
          foodHtml += '<div class="food-row">'
            + '<label>' + escHtml(f.label) + '</label>'
            + '<div class="toggle">'
            + '<button type="button" class="yes-btn" data-field="' + f.id + '" data-val="1">Yes</button>'
            + '<button type="button" class="no-btn"  data-field="' + f.id + '" data-val="0">No</button>'
            + '</div></div>';
        });
        document.getElementById('food-section').innerHTML = foodHtml;

        // Toggle buttons
        document.querySelectorAll('.yes-btn, .no-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var field = btn.getAttribute('data-field');
            document.querySelectorAll('[data-field="' + field + '"]').forEach(function(b) {
              b.classList.remove('active', 'active-no');
            });
            btn.classList.add(btn.classList.contains('yes-btn') ? 'active' : 'active-no');
          });
        });
      })
      .catch(function(err) {
        document.getElementById('loading').textContent = 'Failed to load programme. Please check your connection.';
        console.error(err);
      });

    // Submit form
    document.getElementById('log-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Saving…';

      function getFoodVal(field) {
        var active = document.querySelector('[data-field="' + field + '"].active, [data-field="' + field + '"].active-no');
        return active ? parseInt(active.getAttribute('data-val'), 10) : null;
      }

      var payload = {
        token:        token,
        log_date:     document.getElementById('log-date').value,
        steps:        document.getElementById('steps').value || null,
        food_stop_1:  getFoodVal('food_stop_1'),
        food_stop_2:  getFoodVal('food_stop_2'),
        food_start_1: getFoodVal('food_start_1'),
        food_start_2: getFoodVal('food_start_2'),
        bp_systolic:  document.getElementById('bp-sys').value  || null,
        bp_diastolic: document.getElementById('bp-dia').value  || null,
        heart_rate:   document.getElementById('hr').value      || null,
        note:         document.getElementById('note').value    || null,
      };

      fetch(apiBase + '/api/log/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var msgEl = document.getElementById('log-msg');
        msgEl.style.display = 'block';
        if (data.success) {
          msgEl.className = 'msg ok';
          msgEl.textContent = 'Logged successfully. Thank you!';
          document.getElementById('log-form').reset();
          document.getElementById('log-date').value = new Date().toISOString().slice(0, 10);
        } else {
          msgEl.className = 'msg err';
          msgEl.textContent = data.error || 'Submission failed. Please try again.';
        }
      })
      .catch(function() {
        var msgEl = document.getElementById('log-msg');
        msgEl.style.display = 'block';
        msgEl.className = 'msg err';
        msgEl.textContent = 'Network error. Please try again.';
      })
      .finally(function() {
        btn.disabled = false;
        btn.textContent = 'Submit today\u2019s log';
      });
    });

    function escHtml(s) {
      if (!s) return '';
      return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    }
  })();
  ${'<'}/script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

/**
 * /dashboard — Admin dashboard (auth required)
 * Full SPA shell; the JS fetches data from /api/admin/* endpoints.
 */
app.get('/dashboard/login', (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login — London Cardiology Clinic</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#1a2332;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:12px;padding:2rem;width:360px;box-shadow:0 4px 24px rgba(0,0,0,.3)}
    h1{color:#c0392b;margin-bottom:.25rem;font-size:1.2rem}
    p{color:#666;font-size:.85rem;margin-bottom:1.5rem}
    label{display:block;font-size:.85rem;color:#444;margin-bottom:.25rem;margin-top:.75rem}
    input{width:100%;padding:.6rem .75rem;border:1px solid #ccd;border-radius:6px;font-size:.95rem}
    button{margin-top:1.25rem;width:100%;padding:.75rem;background:#c0392b;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer}
    .err{margin-top:.75rem;padding:.5rem;background:#f8d7da;color:#721c24;border-radius:6px;font-size:.85rem;display:none}
  </style>
</head>
<body>
  <div class="card">
    <h1>London Cardiology Clinic</h1>
    <p>Admin access only</p>
    <form id="login-form">
      <label for="username">Username</label>
      <input type="text" id="username" autocomplete="username" required>
      <label for="password">Password</label>
      <input type="password" id="password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
      <div class="err" id="err-msg"></div>
    </form>
  </div>
  <script>
  document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var errEl = document.getElementById('err-msg');
    errEl.style.display = 'none';
    fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        window.location.href = '/dashboard';
      } else {
        errEl.style.display = 'block';
        errEl.textContent = data.error || 'Login failed';
      }
    })
    .catch(function() {
      errEl.style.display = 'block';
      errEl.textContent = 'Network error. Please try again.';
    });
  });
  ${'<'}/script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.get('/dashboard*', requireAdmin, (_req, res) => {
  // Dashboard shell — patient list, ECG queue, device management, stats
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard — London Cardiology Clinic</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f0f4f8;color:#1a2332}
    header{background:#1a2332;color:#fff;padding:.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between}
    header h1{font-size:1rem;color:#e8c4c0}
    .logout-btn{background:transparent;border:1px solid #e8c4c0;color:#e8c4c0;padding:.3rem .75rem;border-radius:6px;cursor:pointer;font-size:.85rem}
    main{padding:1.5rem;max-width:1200px;margin:0 auto}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1.5rem}
    .stat-card{background:#fff;border-radius:10px;padding:1rem;box-shadow:0 1px 4px rgba(0,0,0,.07);text-align:center}
    .stat-card .val{font-size:2rem;font-weight:700;color:#c0392b}
    .stat-card .lbl{font-size:.8rem;color:#666;margin-top:.25rem}
    .section{background:#fff;border-radius:10px;padding:1.25rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.07)}
    .section h2{font-size:1rem;color:#1a2332;margin-bottom:1rem;border-bottom:1px solid #eee;padding-bottom:.5rem}
    table{width:100%;border-collapse:collapse;font-size:.875rem}
    th{text-align:left;padding:.5rem .75rem;background:#f8f9fa;color:#555;font-weight:600;border-bottom:2px solid #e9ecef}
    td{padding:.5rem .75rem;border-bottom:1px solid #f0f0f0;vertical-align:middle}
    tr:hover td{background:#fafbfc}
    .badge{display:inline-block;padding:.15rem .5rem;border-radius:4px;font-size:.75rem;font-weight:600}
    .badge-green{background:#d4edda;color:#155724}
    .badge-amber{background:#fff3cd;color:#856404}
    .badge-red{background:#f8d7da;color:#721c24}
    .badge-t1{background:#cce5ff;color:#004085}
    .badge-t2{background:#d4edda;color:#155724}
    .badge-confirmed{background:#d4edda;color:#155724}
    .badge-cancelled{background:#f8d7da;color:#721c24}
    .badge-completed{background:#cce5ff;color:#004085}
    .action-btn{padding:.25rem .6rem;border:none;border-radius:4px;cursor:pointer;font-size:.8rem;margin-right:.25rem}
    .btn-primary{background:#c0392b;color:#fff}
    .btn-secondary{background:#e9ecef;color:#333}
    #detail-panel{display:none;background:#fff;border-radius:10px;padding:1.25rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.07)}
    #detail-panel h2{font-size:1rem;margin-bottom:.75rem}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem .75rem;font-size:.85rem;margin-bottom:.75rem}
    .detail-grid dt{color:#888}
    .detail-grid dd{font-weight:500}
    .tabs{display:flex;gap:.5rem;margin-bottom:1rem;border-bottom:1px solid #eee;padding-bottom:.5rem}
    .tab{padding:.3rem .75rem;border-radius:6px 6px 0 0;cursor:pointer;font-size:.85rem;border:none;background:transparent}
    .tab.active{background:#c0392b;color:#fff}
    #msg-banner{padding:.6rem 1rem;border-radius:6px;margin-bottom:1rem;display:none}
    #msg-banner.ok{background:#d4edda;color:#155724}
    #msg-banner.err{background:#f8d7da;color:#721c24}
  </style>
</head>
<body>
  <header>
    <h1>London Cardiology Clinic — Admin</h1>
    <button class="logout-btn" id="logout-btn">Sign out</button>
  </header>
  <main>
    <div id="msg-banner"></div>

    <!-- Stats cards -->
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card"><div class="val" id="s-total">—</div><div class="lbl">Total patients</div></div>
      <div class="stat-card"><div class="val" id="s-t1">—</div><div class="lbl">Tier 1</div></div>
      <div class="stat-card"><div class="val" id="s-t2">—</div><div class="lbl">Tier 2 (CardioTrack)</div></div>
      <div class="stat-card"><div class="val" id="s-conf">—</div><div class="lbl">Confirmed</div></div>
      <div class="stat-card"><div class="val" id="s-slots">—</div><div class="lbl">Available slots</div></div>
      <div class="stat-card"><div class="val" id="s-dev">—</div><div class="lbl">Devices out</div></div>
      <div class="stat-card"><div class="val" id="s-ecg">—</div><div class="lbl">Unparsed ECGs</div></div>
    </div>

    <!-- Patient detail panel (shown on row click) -->
    <div id="detail-panel">
      <h2 id="detail-name">Patient details</h2>
      <div class="tabs">
        <button class="tab active" data-tab="overview">Overview</button>
        <button class="tab" data-tab="logs">Daily logs</button>
        <button class="tab" data-tab="ecgs">ECGs</button>
        <button class="tab" data-tab="sms">SMS history</button>
      </div>
      <div id="tab-overview"></div>
      <div id="tab-logs" style="display:none"></div>
      <div id="tab-ecgs" style="display:none"></div>
      <div id="tab-sms"  style="display:none"></div>
      <button class="action-btn btn-secondary" id="close-detail-btn" style="margin-top:.75rem">Close</button>
    </div>

    <!-- Patient list -->
    <div class="section">
      <h2>Patients</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Tier</th>
            <th>Appointment</th><th>Status</th><th>Devices</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="patients-tbody">
          <tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#888">Loading…</td></tr>
        </tbody>
      </table>
    </div>
  </main>

  <script>
  (function() {
    var currentPatientId = null;
    var currentTab = 'overview';

    // ---- Utils ----
    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function badge(val, map) {
      var cls = map[val] || 'badge-secondary';
      return '<span class="badge ' + cls + '">' + esc(val) + '</span>';
    }
    function showMsg(msg, type) {
      var el = document.getElementById('msg-banner');
      el.className = type === 'ok' ? 'ok' : 'err';
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(function() { el.style.display = 'none'; }, 4000);
    }

    // ---- Logout ----
    document.getElementById('logout-btn').addEventListener('click', function() {
      fetch('/api/admin/logout', { method: 'POST' })
        .then(function() { window.location.href = '/dashboard/login'; });
    });

    // ---- Load stats ----
    function loadStats() {
      fetch('/api/admin/stats')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          document.getElementById('s-total').textContent = d.totalPatients;
          document.getElementById('s-t1').textContent    = d.tier1;
          document.getElementById('s-t2').textContent    = d.tier2;
          document.getElementById('s-conf').textContent  = d.confirmed;
          document.getElementById('s-slots').textContent = d.availableSlots;
          document.getElementById('s-dev').textContent   = d.pendingDevices;
          document.getElementById('s-ecg').textContent   = d.unparsedEcgs;
        });
    }

    // ---- Load patients ----
    function loadPatients() {
      fetch('/api/admin/patients')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var tbody = document.getElementById('patients-tbody');
          if (!data.patients || data.patients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#888">No patients yet</td></tr>';
            return;
          }
          tbody.innerHTML = data.patients.map(function(p) {
            var devStatus = p.tier === 2
              ? (p.devices_returned ? 'Returned' : (p.devices_collected ? '<span class="badge badge-amber">Out</span>' : 'Pending'))
              : '—';
            return '<tr>'
              + '<td>' + esc(p.name) + '</td>'
              + '<td>' + esc(p.email) + '</td>'
              + '<td>' + badge(String(p.tier), { '1': 'badge-t1', '2': 'badge-t2' }) + '</td>'
              + '<td>' + esc(p.appointment_date || '—') + ' ' + esc(p.appointment_time || '') + '</td>'
              + '<td>' + badge(p.booking_status, { confirmed:'badge-confirmed', cancelled:'badge-cancelled', completed:'badge-completed' }) + '</td>'
              + '<td>' + devStatus + '</td>'
              + '<td>'
              + '<button class="action-btn btn-primary" onclick="viewPatient(' + p.id + ')">View</button>'
              + (p.tier === 2 && p.devices_collected && !p.devices_returned
                  ? '<button class="action-btn btn-secondary" onclick="markReturned(' + p.id + ')">Devices returned</button>'
                  : '')
              + (p.tier === 2 && !p.devices_collected && p.booking_status === 'completed'
                  ? '<button class="action-btn btn-secondary" onclick="markCollected(' + p.id + ')">Devices collected</button>'
                  : '')
              + '</td>'
              + '</tr>';
          }).join('');
        });
    }

    // ---- View patient detail ----
    window.viewPatient = function(id) {
      currentPatientId = id;
      fetch('/api/admin/patients/' + id)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var p = data.patient;
          document.getElementById('detail-name').textContent = p.name;
          document.getElementById('detail-panel').style.display = 'block';

          // Overview tab
          document.getElementById('tab-overview').innerHTML = '<dl class="detail-grid">'
            + '<dt>Name</dt><dd>' + esc(p.name) + '</dd>'
            + '<dt>Email</dt><dd>' + esc(p.email) + '</dd>'
            + '<dt>Phone</dt><dd>' + esc(p.phone) + '</dd>'
            + '<dt>DOB</dt><dd>' + esc(p.dob) + '</dd>'
            + '<dt>Tier</dt><dd>' + esc(p.tier) + '</dd>'
            + '<dt>Language</dt><dd>' + esc(p.language) + '</dd>'
            + '<dt>Appointment</dt><dd>' + esc(p.appointment_date) + ' ' + esc(p.appointment_time) + '</dd>'
            + '<dt>Status</dt><dd>' + esc(p.booking_status) + '</dd>'
            + '<dt>Programme</dt><dd>' + esc(p.programme_status) + '</dd>'
            + '<dt>Devices collected</dt><dd>' + (p.devices_collected ? esc(p.devices_collected_date) : 'No') + '</dd>'
            + '<dt>Devices returned</dt><dd>' + (p.devices_returned ? esc(p.devices_returned_date) : 'No') + '</dd>'
            + '<dt>Hold released</dt><dd>' + (p.device_hold_released ? 'Yes' : 'No') + '</dd>'
            + '<dt>Hold charged</dt><dd>' + (p.device_hold_charged ? 'Yes' : 'No') + '</dd>'
            + '<dt>Stop food 1</dt><dd>' + esc(p.stop_food_1 || '—') + '</dd>'
            + '<dt>Stop food 2</dt><dd>' + esc(p.stop_food_2 || '—') + '</dd>'
            + '<dt>Start food 1</dt><dd>' + esc(p.start_food_1 || '—') + '</dd>'
            + '<dt>Start food 2</dt><dd>' + esc(p.start_food_2 || '—') + '</dd>'
            + '</dl>'
            + (p.tier === 2 && p.stripe_hold_id && !p.device_hold_charged && !p.devices_returned
              ? '<button class="action-btn btn-primary" onclick="chargeHold(' + p.id + ')">Charge £200 hold</button>'
              : '');

          // Logs tab
          var logsHtml = '<table><thead><tr><th>Date</th><th>Steps</th><th>BP</th><th>HR</th><th>Stop 1</th><th>Stop 2</th><th>Start 1</th><th>Start 2</th><th>Note</th></tr></thead><tbody>';
          if (data.logs && data.logs.length) {
            logsHtml += data.logs.map(function(l) {
              return '<tr>'
                + '<td>' + esc(l.log_date) + '</td>'
                + '<td>' + (l.steps != null ? l.steps : '—') + '</td>'
                + '<td>' + (l.bp_systolic != null ? l.bp_systolic + '/' + l.bp_diastolic : '—') + '</td>'
                + '<td>' + (l.heart_rate != null ? l.heart_rate : '—') + '</td>'
                + '<td>' + (l.food_stop_1  != null ? (l.food_stop_1  ? 'Avoided' : 'Ate it') : '—') + '</td>'
                + '<td>' + (l.food_stop_2  != null ? (l.food_stop_2  ? 'Avoided' : 'Ate it') : '—') + '</td>'
                + '<td>' + (l.food_start_1 != null ? (l.food_start_1 ? 'Ate' : 'Skipped') : '—') + '</td>'
                + '<td>' + (l.food_start_2 != null ? (l.food_start_2 ? 'Ate' : 'Skipped') : '—') + '</td>'
                + '<td>' + esc(l.note || '') + '</td>'
                + '</tr>';
            }).join('');
          } else {
            logsHtml += '<tr><td colspan="9" style="color:#888;padding:.75rem">No logs yet</td></tr>';
          }
          logsHtml += '</tbody></table>';
          document.getElementById('tab-logs').innerHTML = logsHtml;

          // ECGs tab
          var ecgsHtml = '<table><thead><tr><th>Date</th><th>Filename</th><th>Classification</th><th>HR</th><th>Flag</th><th>Actions</th></tr></thead><tbody>';
          if (data.ecgs && data.ecgs.length) {
            ecgsHtml += data.ecgs.map(function(e) {
              var flagMap = { green: 'badge-green', amber: 'badge-amber', red: 'badge-red' };
              return '<tr>'
                + '<td>' + esc(e.upload_date) + '</td>'
                + '<td>' + esc(e.filename) + '</td>'
                + '<td>' + esc(e.classification || 'Unclassified') + '</td>'
                + '<td>' + (e.heart_rate || '—') + '</td>'
                + '<td>' + badge(e.flag_level, flagMap) + '</td>'
                + '<td><button class="action-btn btn-secondary" onclick="flagEcg(' + e.id + ')">Update</button></td>'
                + '</tr>';
            }).join('');
          } else {
            ecgsHtml += '<tr><td colspan="6" style="color:#888;padding:.75rem">No ECG uploads yet</td></tr>';
          }
          ecgsHtml += '</tbody></table>';
          document.getElementById('tab-ecgs').innerHTML = ecgsHtml;

          // SMS tab
          var smsHtml = '<table><thead><tr><th>Sent at</th><th>Message</th><th>Status</th></tr></thead><tbody>';
          if (data.sms && data.sms.length) {
            smsHtml += data.sms.map(function(s) {
              return '<tr><td>' + esc(s.sent_at) + '</td><td>' + esc(s.message) + '</td><td>' + esc(s.status) + '</td></tr>';
            }).join('');
          } else {
            smsHtml += '<tr><td colspan="3" style="color:#888;padding:.75rem">No SMS messages</td></tr>';
          }
          smsHtml += '</tbody></table>';
          document.getElementById('tab-sms').innerHTML = smsHtml;

          // Show correct tab
          switchTab(currentTab);
          document.getElementById('detail-panel').scrollIntoView({ behavior: 'smooth' });
        });
    };

    // ---- Tab switching ----
    document.querySelectorAll('.tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        switchTab(tab.getAttribute('data-tab'));
      });
    });
    function switchTab(name) {
      currentTab = name;
      document.querySelectorAll('.tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-tab') === name);
      });
      ['overview','logs','ecgs','sms'].forEach(function(n) {
        document.getElementById('tab-' + n).style.display = n === name ? '' : 'none';
      });
    }

    document.getElementById('close-detail-btn').addEventListener('click', function() {
      document.getElementById('detail-panel').style.display = 'none';
    });

    // ---- Device actions ----
    window.markCollected = function(id) {
      if (!confirm('Mark devices as collected for this patient?')) return;
      fetch('/api/admin/devices/collected', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patient_id: id }),
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success) { showMsg('Devices marked as collected', 'ok'); loadPatients(); loadStats(); }
        else showMsg(d.error, 'err');
      });
    };

    window.markReturned = function(id) {
      if (!confirm('Mark devices as returned? This will release the £200 Stripe hold.')) return;
      fetch('/api/admin/devices/returned', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patient_id: id }),
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success) { showMsg('Devices returned and hold released', 'ok'); loadPatients(); loadStats(); if (currentPatientId === id) viewPatient(id); }
        else showMsg(d.error, 'err');
      });
    };

    window.chargeHold = function(id) {
      if (!confirm('Charge the £200 device hold? This cannot be undone.')) return;
      fetch('/api/admin/devices/charge-hold', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patient_id: id }),
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success) { showMsg('£200 hold charged', 'ok'); viewPatient(id); loadStats(); }
        else showMsg(d.error, 'err');
      });
    };

    window.flagEcg = function(ecgId) {
      var classification = prompt('Classification (Normal/AF/Tachycardia/Bradycardia/Unclassified):');
      if (classification === null) return;
      var hr  = prompt('Heart rate (bpm, leave blank if unknown):');
      var flg = prompt('Flag level (green/amber/red):') || 'green';
      fetch('/api/admin/ecg/' + ecgId, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ classification: classification, heart_rate: hr || null, flag_level: flg }),
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success) { showMsg('ECG updated', 'ok'); if (currentPatientId) viewPatient(currentPatientId); loadStats(); }
        else showMsg(d.error, 'err');
      });
    };

    // ---- Init ----
    loadStats();
    loadPatients();
    // Refresh stats every 60s
    setInterval(function() { loadStats(); }, 60000);
  })();
  ${'<'}/script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.use((req, res) => {
  if (req.headers['accept'] && req.headers['accept'].includes('text/html')) {
    return res.status(404).sendFile(path.join(STATIC_ROOT, '404.html'));
  }
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 20 MB)' });
  }
  console.error('[express error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Cron jobs
// ---------------------------------------------------------------------------

/**
 * Appointment reminder SMS — runs daily at 09:00.
 * Sends reminder to patients with an appointment TOMORROW.
 */
function startReminderCron() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Running appointment reminder job');
    const tomorrow = addDays(today(), 1);
    const patients  = getPatientsWithAppointmentOn(tomorrow);
    for (const p of patients) {
      const msg = `London Cardiology Clinic reminder: Your appointment is tomorrow (${formatDateHuman(p.appointment_date)}) at ${p.appointment_time}. If you need to cancel reply CANCEL or call us.`;
      await sendSms(p.id, p.phone, msg);
    }
    console.log(`[cron] Sent ${patients.length} appointment reminder(s)`);
  }, { timezone: 'Europe/London' });
}

/**
 * Device hold check — runs daily at 10:00.
 * Flags if a patient's devices have been out for > 14 days without return.
 * Does NOT auto-charge — that requires manual admin action.
 */
function startDeviceHoldCron() {
  cron.schedule('0 10 * * *', () => {
    console.log('[cron] Running device hold check');
    const outstanding = getOutstandingDevicePatients();
    for (const p of outstanding) {
      if (!p.devices_collected_date) continue;
      const collected = new Date(p.devices_collected_date + 'T00:00:00');
      const now       = new Date();
      const daysDiff  = Math.floor((now - collected) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 14) {
        console.warn(
          `[cron] Patient ${p.id} (${p.name}) devices out for ${daysDiff} days — manual review required`
        );
        // Log a reminder SMS but do not auto-charge
        const msg = `London Cardiology Clinic: Please return your CardioTrack devices as soon as possible. Contact us at londoncardiologyclinic.uk or reply to this message.`;
        sendSms(p.id, p.phone, msg).catch((e) => console.error('[cron sms]', e));
      }
    }
    console.log(`[cron] Device hold check: ${outstanding.length} outstanding patient(s)`);
  }, { timezone: 'Europe/London' });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  try {
    await initDb();
    startReminderCron();
    startDeviceHoldCron();

    app.listen(PORT, () => {
      console.log(`[server] London Cardiology Clinic running on http://localhost:${PORT}`);
      console.log(`[server] Static root: ${STATIC_ROOT}`);
    });
  } catch (err) {
    console.error('[server] Startup failed:', err);
    process.exit(1);
  }
}

start();
