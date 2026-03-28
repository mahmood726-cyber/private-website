'use strict';

/**
 * db.js — SQLite database layer for London Cardiology Clinic
 * Uses better-sqlite3 (synchronous API, single-file database).
 *
 * Exports:
 *   initDb()          — create schema + seed slots + seed admin
 *   getDb()           — return the open Database instance
 *   helpers           — named query functions for routes to use
 */

const Database = require('better-sqlite3');
const bcrypt    = require('bcrypt');
const path      = require('path');

// Database file sits one level above server/ so it persists alongside the repo
const DB_PATH = path.join(__dirname, '..', 'data', 'clinic.db');

// Ensure the data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db = null;

// ---------------------------------------------------------------------------
// Schema DDL
// ---------------------------------------------------------------------------

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Patients (tier 1 = consultation, tier 2 = cardiotrack)
CREATE TABLE IF NOT EXISTS patients (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  name                     TEXT    NOT NULL,
  email                    TEXT    NOT NULL,
  phone                    TEXT    NOT NULL,
  dob                      TEXT    NOT NULL,
  tier                     INTEGER NOT NULL,          -- 1 or 2
  language                 TEXT    DEFAULT 'en',
  gp_practice              TEXT,                          -- GP surgery name (for referral letters)
  created_at               TEXT    DEFAULT (datetime('now')),

  -- GDPR consent
  consent_data_processing  INTEGER DEFAULT 0,
  consent_gp_sharing       INTEGER DEFAULT 0,
  consent_device_agreement INTEGER DEFAULT 0,        -- tier 2 only
  consent_timestamp        TEXT,

  -- Booking
  appointment_date         TEXT,
  appointment_time         TEXT,
  stripe_payment_id        TEXT,
  stripe_hold_id           TEXT,                     -- £200 device hold (tier 2)
  booking_status           TEXT    DEFAULT 'confirmed', -- confirmed/cancelled/completed

  -- Device tracking (tier 2)
  devices_collected        INTEGER DEFAULT 0,
  devices_collected_date   TEXT,
  devices_returned         INTEGER DEFAULT 0,
  devices_returned_date    TEXT,
  device_hold_released     INTEGER DEFAULT 0,
  device_hold_charged      INTEGER DEFAULT 0,

  -- CardioTrack programme (tier 2)
  baseline_steps           INTEGER,
  stop_food_1              TEXT,
  stop_food_2              TEXT,
  start_food_1             TEXT,
  start_food_2             TEXT,
  programme_status         TEXT    DEFAULT 'pending', -- pending/monitoring/lifestyle/completed

  -- QR token for /log page
  log_token                TEXT    UNIQUE
);

-- Daily logs submitted via QR / /log page
CREATE TABLE IF NOT EXISTS daily_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL,
  log_date      TEXT    NOT NULL,
  steps         INTEGER,
  food_stop_1   INTEGER,  -- 0 = ate it (didn't avoid), 1 = avoided
  food_stop_2   INTEGER,
  food_start_1  INTEGER,  -- 0 = didn't eat, 1 = ate it
  food_start_2  INTEGER,
  bp_systolic   INTEGER,
  bp_diastolic  INTEGER,
  heart_rate    INTEGER,
  note          TEXT,
  created_at    TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ECG PDF / image uploads
CREATE TABLE IF NOT EXISTS ecg_uploads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     INTEGER NOT NULL,
  upload_date    TEXT    NOT NULL,
  filename       TEXT    NOT NULL,
  classification TEXT,                -- Normal/AF/Tachycardia/Bradycardia/Unclassified
  heart_rate     INTEGER,
  recording_time TEXT,
  flag_level     TEXT    DEFAULT 'green',  -- green/amber/red
  parsed         INTEGER DEFAULT 0,
  created_at     TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Available appointment slots (auto-generated Friday evenings)
CREATE TABLE IF NOT EXISTS slots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_date   TEXT    NOT NULL,
  slot_time   TEXT    NOT NULL,  -- e.g. "17:00"
  patient_id  INTEGER,
  is_booked   INTEGER DEFAULT 0,
  UNIQUE(slot_date, slot_time)
);

-- Admin user table (single row in practice)
CREATE TABLE IF NOT EXISTS admin (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL
);

-- SMS outbound log
CREATE TABLE IF NOT EXISTS sms_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  message    TEXT    NOT NULL,
  sent_at    TEXT    DEFAULT (datetime('now')),
  status     TEXT    DEFAULT 'sent',
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
`;

// ---------------------------------------------------------------------------
// Slot generation helpers
// ---------------------------------------------------------------------------

const SLOT_TIMES = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

/**
 * Return an ISO date string (YYYY-MM-DD) for the next N Fridays starting
 * from today (inclusive if today is Friday).
 */
function nextNFridays(n) {
  const dates = [];
  const d = new Date();
  // Advance to the next Friday (or stay if today is Friday)
  const dayOfWeek = d.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  d.setDate(d.getDate() + (daysUntilFriday === 0 ? 0 : daysUntilFriday));

  for (let i = 0; i < n; i++) {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

function seedSlots(db) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO slots (slot_date, slot_time) VALUES (?, ?)'
  );
  const insertMany = db.transaction((dates) => {
    for (const date of dates) {
      for (const time of SLOT_TIMES) {
        insert.run(date, time);
      }
    }
  });
  const fridays = nextNFridays(8);
  insertMany(fridays);
  console.log(`[db] Seeded slots for ${fridays.length} Fridays:`, fridays);
}

// ---------------------------------------------------------------------------
// Admin seed
// ---------------------------------------------------------------------------

const DEFAULT_ADMIN_USERNAME = 'admin';
// Placeholder hash — admin must change password on first login via dashboard.
// The raw value is "ChangeMe123!" and is hashed with bcrypt cost 12 at startup.
const DEFAULT_ADMIN_PLAINTEXT = 'ChangeMe123!';

async function seedAdmin(db) {
  const existing = db.prepare('SELECT id FROM admin WHERE username = ?')
                     .get(DEFAULT_ADMIN_USERNAME);
  if (existing) return;

  const hash = await bcrypt.hash(DEFAULT_ADMIN_PLAINTEXT, 12);
  db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)')
    .run(DEFAULT_ADMIN_USERNAME, hash);
  console.log('[db] Default admin created. Please change the password immediately.');
  console.warn('[db] WARNING: Change the admin password immediately after first login.');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * initDb() — open the database, run schema migrations, seed slots & admin.
 * Must be awaited at startup because seedAdmin() uses bcrypt (async).
 */
async function initDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH, { verbose: process.env.DB_VERBOSE ? console.log : undefined });

  // Apply schema (all CREATE IF NOT EXISTS — safe to re-run)
  _db.exec(SCHEMA);

  // Migration: add consent_sms column if it doesn't exist (PECR SMS consent)
  try {
    _db.exec('ALTER TABLE patients ADD COLUMN consent_sms INTEGER DEFAULT 0');
  } catch (_) {
    // Column already exists — safe to ignore
  }

  // Migration: add gp_practice column
  try {
    _db.exec('ALTER TABLE patients ADD COLUMN gp_practice TEXT');
  } catch (_) {
    // Column already exists — safe to ignore
  }

  // Seed future slots (INSERT OR IGNORE — idempotent)
  seedSlots(_db);

  // Seed admin (async because bcrypt.hash is async)
  await seedAdmin(_db);

  console.log(`[db] Database ready at ${DB_PATH}`);
  return _db;
}

/**
 * getDb() — return the open Database instance.
 * Throws if initDb() has not been called yet.
 */
function getDb() {
  if (!_db) throw new Error('Database not initialised. Call initDb() first.');
  return _db;
}

// ---------------------------------------------------------------------------
// Helper query functions
// (Used by route handlers; keeps SQL out of route files.)
// ---------------------------------------------------------------------------

// --- Slots ---

// Earliest date patients can book (launch date)
const EARLIEST_BOOKING_DATE = '2026-04-10';

function getAvailableSlots() {
  return getDb()
    .prepare('SELECT slot_date, slot_time FROM slots WHERE is_booked = 0 AND slot_date >= ? ORDER BY slot_date, slot_time')
    .all(EARLIEST_BOOKING_DATE);
}

function getSlotByDatetime(date, time) {
  return getDb()
    .prepare('SELECT * FROM slots WHERE slot_date = ? AND slot_time = ?')
    .get(date, time);
}

function bookSlot(date, time, patientId) {
  return getDb()
    .prepare('UPDATE slots SET is_booked = 1, patient_id = ? WHERE slot_date = ? AND slot_time = ? AND is_booked = 0')
    .run(patientId, date, time);
}

function freeSlot(date, time) {
  return getDb()
    .prepare('UPDATE slots SET is_booked = 0, patient_id = NULL WHERE slot_date = ? AND slot_time = ?')
    .run(date, time);
}

// --- Patients ---

function createPatient(data) {
  const stmt = getDb().prepare(`
    INSERT INTO patients
      (name, email, phone, dob, tier, language, gp_practice,
       consent_data_processing, consent_gp_sharing, consent_device_agreement, consent_sms, consent_timestamp,
       appointment_date, appointment_time,
       stripe_payment_id, stripe_hold_id,
       log_token)
    VALUES
      (@name, @email, @phone, @dob, @tier, @language, @gp_practice,
       @consent_data_processing, @consent_gp_sharing, @consent_device_agreement, @consent_sms, @consent_timestamp,
       @appointment_date, @appointment_time,
       @stripe_payment_id, @stripe_hold_id,
       @log_token)
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

function getPatientById(id) {
  return getDb().prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

function getPatientByToken(token) {
  return getDb().prepare('SELECT * FROM patients WHERE log_token = ?').get(token);
}

function getPatientByEmail(email) {
  return getDb().prepare('SELECT * FROM patients WHERE email = ?').get(email);
}

function getAllPatients() {
  return getDb()
    .prepare('SELECT * FROM patients ORDER BY created_at DESC')
    .all();
}

function updatePatientField(id, field, value) {
  // Allowlist of updatable fields to prevent SQL injection via field name
  const ALLOWED_FIELDS = [
    'booking_status',
    'stripe_payment_id',
    'stripe_hold_id',
    'devices_collected',
    'devices_collected_date',
    'devices_returned',
    'devices_returned_date',
    'device_hold_released',
    'device_hold_charged',
    'programme_status',
    'baseline_steps',
    'stop_food_1',
    'stop_food_2',
    'start_food_1',
    'start_food_2',
  ];
  if (!ALLOWED_FIELDS.includes(field)) {
    throw new Error(`updatePatientField: field '${field}' is not in the allowlist`);
  }
  return getDb()
    .prepare(`UPDATE patients SET ${field} = ? WHERE id = ?`)
    .run(value, id);
}

function cancelPatient(id) {
  return getDb()
    .prepare("UPDATE patients SET booking_status = 'cancelled' WHERE id = ?")
    .run(id);
}

// --- Daily logs ---

function insertDailyLog(data) {
  return getDb().prepare(`
    INSERT INTO daily_logs
      (patient_id, log_date, steps,
       food_stop_1, food_stop_2, food_start_1, food_start_2,
       bp_systolic, bp_diastolic, heart_rate, note)
    VALUES
      (@patient_id, @log_date, @steps,
       @food_stop_1, @food_stop_2, @food_start_1, @food_start_2,
       @bp_systolic, @bp_diastolic, @heart_rate, @note)
  `).run(data);
}

function getLogsByPatient(patientId) {
  return getDb()
    .prepare('SELECT * FROM daily_logs WHERE patient_id = ? ORDER BY log_date DESC')
    .all(patientId);
}

function getLogByPatientAndDate(patientId, date) {
  return getDb()
    .prepare('SELECT * FROM daily_logs WHERE patient_id = ? AND log_date = ?')
    .get(patientId, date);
}

// --- ECG uploads ---

function insertEcgUpload(data) {
  return getDb().prepare(`
    INSERT INTO ecg_uploads
      (patient_id, upload_date, filename, classification, heart_rate, recording_time, flag_level, parsed)
    VALUES
      (@patient_id, @upload_date, @filename, @classification, @heart_rate, @recording_time, @flag_level, @parsed)
  `).run(data);
}

function getEcgsByPatient(patientId) {
  return getDb()
    .prepare('SELECT * FROM ecg_uploads WHERE patient_id = ? ORDER BY upload_date DESC')
    .all(patientId);
}

function updateEcgParsed(id, classification, heartRate, recordingTime, flagLevel) {
  return getDb().prepare(`
    UPDATE ecg_uploads
    SET classification = ?, heart_rate = ?, recording_time = ?, flag_level = ?, parsed = 1
    WHERE id = ?
  `).run(classification, heartRate, recordingTime, flagLevel, id);
}

function getUnparsedEcgs() {
  return getDb()
    .prepare('SELECT * FROM ecg_uploads WHERE parsed = 0 ORDER BY created_at ASC')
    .all();
}

// --- Admin ---

function getAdminByUsername(username) {
  return getDb().prepare('SELECT * FROM admin WHERE username = ?').get(username);
}

async function updateAdminPassword(username, newPlaintext) {
  const hash = await bcrypt.hash(newPlaintext, 12);
  return getDb()
    .prepare('UPDATE admin SET password_hash = ? WHERE username = ?')
    .run(hash, username);
}

// --- SMS log ---

function logSms(patientId, message, status) {
  return getDb().prepare(`
    INSERT INTO sms_log (patient_id, message, status)
    VALUES (?, ?, ?)
  `).run(patientId, message, status ?? 'sent');
}

function getSmsByPatient(patientId) {
  return getDb()
    .prepare('SELECT * FROM sms_log WHERE patient_id = ? ORDER BY sent_at DESC')
    .all(patientId);
}

// --- Dashboard aggregate queries ---

/**
 * Return all patients with their appointment tomorrow (for reminder cron job).
 */
function getPatientsWithAppointmentOn(date) {
  return getDb()
    .prepare('SELECT * FROM patients WHERE appointment_date = ? AND booking_status = ?')
    .all(date, 'confirmed');
}

/**
 * Return tier-2 patients who have checked out devices but not yet returned them
 * and whose hold has not been released — used by device hold cron job.
 */
function getOutstandingDevicePatients() {
  return getDb().prepare(`
    SELECT * FROM patients
    WHERE tier = 2
      AND devices_collected = 1
      AND devices_returned = 0
      AND device_hold_released = 0
      AND device_hold_charged = 0
      AND booking_status = 'completed'
  `).all();
}

/**
 * Summary counts for dashboard home card.
 */
function getDashboardStats() {
  const db = getDb();
  return {
    totalPatients:   db.prepare('SELECT COUNT(*) AS n FROM patients').get().n,
    tier1:           db.prepare("SELECT COUNT(*) AS n FROM patients WHERE tier = 1").get().n,
    tier2:           db.prepare("SELECT COUNT(*) AS n FROM patients WHERE tier = 2").get().n,
    confirmed:       db.prepare("SELECT COUNT(*) AS n FROM patients WHERE booking_status = 'confirmed'").get().n,
    completed:       db.prepare("SELECT COUNT(*) AS n FROM patients WHERE booking_status = 'completed'").get().n,
    cancelled:       db.prepare("SELECT COUNT(*) AS n FROM patients WHERE booking_status = 'cancelled'").get().n,
    pendingDevices:  db.prepare("SELECT COUNT(*) AS n FROM patients WHERE tier = 2 AND devices_collected = 1 AND devices_returned = 0").get().n,
    availableSlots:  db.prepare("SELECT COUNT(*) AS n FROM slots WHERE is_booked = 0").get().n,
    unparsedEcgs:    db.prepare("SELECT COUNT(*) AS n FROM ecg_uploads WHERE parsed = 0").get().n,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Lifecycle
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
};
