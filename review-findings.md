# Multi-Persona Review: CardioTrack Platform (book.html, log.html, dashboard.html, server/)

### Date: 2026-03-17
### Personas: Anxious Patient, Clinical Safety/GDPR, Security Auditor, UX/Accessibility, Software Engineer
### Summary: 19 P0, 23 P1, 15 P2 (deduplicated from 5 personas)

---

## P0 -- Critical (19)

### Architecture / Integration (BLOCKING -- nothing works end-to-end)

- **[ARCH-1]** `routes/booking.js`, `routes/patients.js`, `routes/logs.js` are NEVER MOUNTED in `index.js`. All 3 files are dead code. All API traffic goes through inline routes in `index.js`.
  - Fix: Either mount the route files or delete them and align HTML frontends to the inline routes.

- **[ARCH-2]** `book.html` sends field names (`fullName`, `appointmentDate`, `consentData`) that don't match what `index.js` expects (`name`, `slot_date`, `consent_data_processing`). Every booking from book.html will fail validation.
  - Fix: Align field names between book.html and the live index.js handler.

- **[ARCH-3]** `dashboard.html` calls API endpoints that don't exist in `index.js`: `/api/auth/login` (should be `/api/admin/login`), `/api/dashboard/summary` (should be `/api/admin/stats`), `/api/bookings`, `/api/patients/:id/report`, `/api/devices`, `/api/analytics`. Dashboard is non-functional.
  - Fix: Update dashboard.html to call the actual endpoints defined in index.js.

- **[ARCH-4]** `dashboard.html` uses Bearer token auth (`Authorization: Bearer <token>`) but `index.js` uses cookie-session (`req.session.adminId`). Login response never returns a token. Dashboard auth is broken.
  - Fix: Use cookie-session consistently -- remove Bearer header from dashboard.html.

- **[ARCH-5]** `log.html` calls `/api/log/progress` which does not exist in `index.js`. Patient progress view is broken.
  - Fix: Add the endpoint to index.js or update log.html to use existing endpoints.

- **[ARCH-6]** Dead route files (`routes/booking.js`, `routes/patients.js`) reference nonexistent schema columns (`status` instead of `booking_status`, `stripe_session_id`, `confirmed_at`, `cancelled_at`, `updated_at`) and nonexistent tables (`patient_logs`, `ecg_records`, `programme_progress`). If ever mounted, they would crash.
  - Fix: Delete or rewrite to match actual db.js schema.

### Patient Trust (would cause patients to abandon)

- **[PAT-1]** No doctor name, photo, qualifications, or GMC number anywhere on `book.html`. Patients asked to pay and share health data without knowing who the doctor is.
  - Fix: Add "Your Cardiologist" section with name, photo, GMC number, qualifications.

- **[PAT-2]** "GMC-registered cardiologist" (book.html:668) is misleading -- clinician is a registrar without CCT. Contradicts the honest disclosure on index.html.
  - Fix: Change to "GMC-registered doctor specialising in cardiology" and add CCT disclosure on the booking page.

- **[PAT-3]** No full clinic address -- only "Wimbledon, SW19". Patients don't know where to go.
  - Fix: Add full street address, postcode, map link, transport info.

### Clinical Safety

- **[CLIN-1]** ECG traffic-light system (`ecg-parser.js:129-152`) and BP classifier (`report-generator.js:207-222`) constitute clinical decision support that may require UKCA marking under UK MDR. No DCB0129 clinical risk management, no hazard log.
  - Fix: Complete DCB0129 process. Add disclaimers that flags are for clinician triage only.

- **[CLIN-2]** No real-time alerting for RED flags. Patient uploads AF ECG on Saturday, clinician sees it next Friday. Untreated AF carries significant stroke risk.
  - Fix: Send immediate email + SMS to clinician on red flag. Show patient-facing message: "Your reading is outside normal range. Contact the clinic or call 111."

- **[CLIN-3]** SMS `_streakDays()` (sms.js:288-293) fabricates streak data -- returns `Math.min(7, dayNumber)` regardless of actual logging. "You've hit your step goal 3 days in a row" may be false.
  - Fix: Query actual database for real streak data or remove streak variant.

- **[CLIN-4]** Mortality reduction language ("~30%") in patient-facing reports (report-generator.js:257-286). Discussing "mortality reduction" with anxious cardiac patients is emotionally destabilising.
  - Fix: Reframe as "cardiovascular health improvement" or remove from patient-facing output.

### Security

- **[SEC-1]** Admin API `GET /api/admin/patients` returns `SELECT * FROM patients` including `log_token`, `stripe_payment_id`, `stripe_hold_id`. Compromised admin session exposes all patient authentication tokens.
  - Fix: Return only needed columns. Never return log_token in API responses.

- **[SEC-2]** No rate limiting on login endpoint (`POST /api/admin/login`). Known username (`admin`), default password (`ChangeMe123!`), no lockout.
  - Fix: Add express-rate-limit (5 attempts/15 min). Force password change on first login.

- **[SEC-3]** Default admin credentials hardcoded in db.js (line 193) and printed to console (line 203). If logs are captured, credentials are exposed.
  - Fix: Generate random password at first startup. Never log credentials.

### Data Protection

- **[GDPR-1]** No explicit PECR consent for SMS. System sends 7+ SMS types without opt-in checkbox or STOP handler.
  - Fix: Add SMS consent checkbox. Implement STOP keyword handler via Twilio webhook.

- **[GDPR-2]** `log_token` transmitted as URL query parameter -- logged in browser history, server logs, Referer headers. This token grants access to submit and view health data.
  - Fix: Exchange token for a session cookie server-side. Use POST for initial authentication.

---

## P1 -- Important (23)

### Patient Experience

- **[PAT-4]** No "what happens after I pay" explanation. Patient clicks "Proceed to Payment" without knowing next steps.
- **[PAT-5]** Both tiers cost £49.99 -- confusing value proposition with no explanation.
- **[PAT-6]** Only 3/9 languages have translations in log.html (en, ur, hi). 6 languages fall back to English silently.
- **[PAT-7]** No RTL support for Arabic and Urdu (dir attribute never set).
- **[PAT-8]** No language selector on book.html at all -- the patient's first interaction is English-only.
- **[PAT-9]** "STOP food" / "START food" labelling is confusing clinical jargon. Double-negative toggles.
- **[PAT-10]** No explanation of KardiaMobile -- what it is, how to export PDF.
- **[PAT-11]** No clinic phone number -- only ProtonMail email.
- **[PAT-12]** Cancellation policy buried below the form. Hidden refund terms.
- **[PAT-13]** Device return SMS uses threatening "avoid the £200 charge" language.

### Clinical / Regulatory

- **[CLIN-5]** No CQC registration. Operating without CQC is a criminal offence.
- **[CLIN-6]** No DPIA for health data processing at scale (mandatory under UK GDPR Article 35).
- **[CLIN-7]** Auto-generated clinical recommendations approved with one click -- no mandatory review step, no audit trail.
- **[CLIN-8]** Consent for health data is a single bundled checkbox, not granular per purpose.
- **[CLIN-9]** No data retention enforcement. Privacy policy says 8 years, no automated deletion exists.
- **[CLIN-10]** Refund policy mismatch: book.html advertises 3 tiers (>48h/24-48h/<24h) but server only implements binary (>48h or nothing).

### Security

- **[SEC-4]** No rate limiting on booking endpoint -- attacker can exhaust all slots with fake bookings.
- **[SEC-5]** Cancellation uses sequential patient_id + email -- trivially enumerable IDOR.
- **[SEC-6]** `unsafe-inline` in CSP script-src defeats XSS protection entirely.
- **[SEC-7]** Session secret defaults to hardcoded value when NODE_ENV is not set.
- **[SEC-8]** ECG upload mimetype check trusts browser header only -- no magic byte validation. Upload dir is under static root.
- **[SEC-9]** Server source code accessible at `/server/db.js` etc. via static file serving.
- **[SEC-10]** Cancelled patients can still submit daily logs -- log_token never invalidated.

### UX / Accessibility

- **[UX-1]** Toggle switch labels not programmatically associated (no aria-labelledby). Screen readers announce "switch" with no label.
- **[UX-2]** `aria-hidden="true"` on section headings removes them from accessibility tree while referenced by `aria-labelledby`.
- **[UX-3]** Focus indicators nearly invisible (8% opacity box-shadow).

---

## P1 (continued) - merged above with 23 total

---

## P2 -- Minor (15)

- **[P2-1]** Tamil shown without native script in language dropdown (should be "தமிழ்").
- **[P2-2]** No `max` attribute on log date picker -- future dates submittable.
- **[P2-3]** Morning SMS at 7:30am may be too early -- no preference setting.
- **[P2-4]** No loading spinner for slot fetch -- just plain text.
- **[P2-5]** £200 hold not explained as pre-authorisation vs charge.
- **[P2-6]** Form data not persisted to localStorage (lost on tab close).
- **[P2-7]** SMS messages don't include clinic contact info.
- **[P2-8]** Report generator uses "the patient" as fallback name (cold/clinical).
- **[P2-9]** No dark mode or prefers-color-scheme support.
- **[P2-10]** No Windows High Contrast Mode support.
- **[P2-11]** Multiple font sizes below 14px (10px bar values, 11-12px labels).
- **[P2-12]** No inline validation or field-level error messages on forms.
- **[P2-13]** Heading semantics: `<p>` used as section headings instead of `<h3>`.
- **[P2-14]** Consent checkboxes 18x18px -- below WCAG 24x24px minimum touch target.
- **[P2-15]** Step chart uses colour-only differentiation (fails WCAG 1.4.1).

---

## Top 5 Actions Before Launch

1. **ARCH-1 through ARCH-6**: Resolve dual implementation. Decide canonical backend (index.js inline vs routes/), delete the other, align all HTML frontends to match. **Nothing works until this is fixed.**
2. **PAT-1 + PAT-2 + PAT-3**: Add doctor identity, honest credentials, and full clinic address to booking page.
3. **SEC-1 + SEC-2 + SEC-3**: Stop leaking tokens in API responses, add rate limiting on login, remove hardcoded credentials.
4. **CLIN-1 + CLIN-2**: Add red-flag alerting and DCB0129 clinical safety process for ECG classifier.
5. **GDPR-1 + GDPR-2**: Add SMS consent, move log_token out of URL.

---

## Architecture Decision Required

The codebase has TWO complete implementations:

| | `index.js` (inline, LIVE) | `routes/*.js` (modular, DEAD) |
|---|---|---|
| Slot times | 17:00-19:30 (Friday evenings) | 09:00-16:30 (daytime) |
| Status column | `booking_status` | `status` (doesn't exist) |
| Payment | Direct PaymentIntent | Stripe Checkout Session |
| Cancel auth | patient_id + email | log_token |
| Rate limiting | None | 3/day on logs |
| HTML frontend | Server-rendered templates in index.js | Standalone book.html, log.html, dashboard.html |

The standalone HTML files (book.html, log.html, dashboard.html) were designed for the `routes/` backend but are served by the `index.js` backend. **Neither pair works together.**

**Recommendation**: Keep the modular `routes/` architecture (cleaner, better validation, Stripe Checkout is safer than direct PaymentIntents), fix the schema mismatches, mount the routes, and delete the inline implementations from index.js.
