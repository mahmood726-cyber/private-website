# London Cardiology Clinic — Full Platform Design (Draft)

## The Big Idea

Two services at £49.99 each, no Cal.com, fully custom, GDPR-safe, multi-language.

## Service Tier 1: Cardiology Consultation (£49.99)
- 30-minute face-to-face consultation at Wimbledon clinic
- 12-lead ECG if clinically needed
- Written report to patient + GP (with consent)
- Fridays 17:00-20:00, 6 slots

## Service Tier 2: CardioTrack Programme (£49.99)
**1 week monitoring + 6 weeks lifestyle programme**

### Week 1: Cardiac Monitoring
- **KardiaMobile ECG**: patient records up to 3 ECGs per day (limit enforced by app)
- **BP Cuff with AF detection**: up to 2 readings per day (limit enforced by app)
- Data uploaded via QR code scan (no app download needed — web-based)
- Clinician reviews data at end of week, provides written report

### Weeks 2-7: Lifestyle Programme
- **Exercise**: Daily step count target (progressive, personalised)
- **Nutrition**:
  - STOP 2 unhealthy foods (patient picks from list: sugar, fried food, processed meat, white bread, fizzy drinks, etc.)
  - START 2 healthy foods (patient picks from list, culturally aware):
    - **Standard**: fish, vegetables, nuts, olive oil, whole grains, fruit
    - **Indian vegetarian**: dal, paneer, spinach, brown rice, chickpeas, yoghurt
    - **Other vegetarian**: tofu, beans, lentils, quinoa, avocado, nuts
    - **Halal**: lean chicken, fish, hummus, vegetables, whole grains
  - Daily check-in: "Did you stick to your plan today?" (yes/no + optional note)
- **Data upload**: QR code → opens web form → patient enters steps, food log, BP, ECG file

### Multi-Language Support
South London demographics — key languages:
1. English (default)
2. Urdu / Hindi
3. Tamil / Sinhala
4. Polish
5. Portuguese (Brazilian)
6. Arabic
7. Somali
8. French
9. Spanish

### QR Code Data Upload Flow
1. Patient receives QR code (printed card or SMS link)
2. QR opens web page: `londoncardiologyclinic.uk/upload?patient=UNIQUE_TOKEN`
3. Token identifies patient (no login needed — GDPR: token is time-limited, single-use per day)
4. Web form shows: date, step count, food diary (checkboxes), BP reading, ECG file upload
5. Data stored encrypted on server
6. Clinician dashboard shows all patient data in one view

## Booking System (replace Cal.com)
**Simple custom solution — no external dependencies:**
- Calendar showing available Friday slots (17:00-19:30, 6 slots)
- Patient selects slot → enters name, email, phone
- Redirected to Stripe Checkout (£49.99)
- On successful payment: slot marked as booked, confirmation email sent
- Cancellation: link in email → if >48hrs before, auto-refund via Stripe API
- Admin view: simple dashboard showing all bookings for the week
- Backend: lightweight (Node.js/Express or Python/Flask) or serverless (Stripe-only with webhooks)

## GDPR Compliance for Health Data
- All patient health data (ECG, BP, steps, food) = **special category data** (Art 9)
- **Encryption at rest**: all data encrypted in database
- **Encryption in transit**: HTTPS (already have SSL via Caddy)
- **Consent**: explicit consent captured before any data collection
- **Data minimisation**: only collect what's clinically needed
- **Retention**: auto-delete after 8 years (GMC requirement) or on patient request
- **Right to erasure**: patient can request deletion via email
- **Access tokens**: QR code tokens expire after 24 hours, single-patient-bound
- **No third-party data sharing**: all data stays on your server (except Stripe for payments)
- **Data Protection Impact Assessment**: required before launch (health data at scale)

## Technical Architecture

```
londoncardiologyclinic.uk (Caddy)
├── /                → Static HTML (main site)
├── /book            → Custom booking page (Stripe Checkout)
├── /upload          → Patient data upload (QR code destination)
├── /dashboard       → Clinician admin (password protected)
├── /api             → REST API (bookings, patient data, uploads)
└── Stripe webhooks  → Payment confirmation, refund processing

Backend options:
A) Node.js + Express + SQLite (simplest, runs on existing droplet)
B) Python Flask + SQLite (if you prefer Python)
C) Single HTML app with Stripe.js + serverless functions (no backend needed for booking only)
```

## What to Build First (MVP)
1. Custom booking page with Stripe Checkout (replace Cal.com)
2. Booking admin dashboard (see all appointments)
3. Patient upload page (QR code → web form)
4. Clinician data review dashboard
5. Multi-language support (i18n)
6. CardioTrack programme logic (limits, targets, check-ins)

## Questions for Dr Mahmood
1. Do you already have KardiaMobile devices and BP cuffs to lend to patients?
2. For the CardioTrack programme — do patients come back for a follow-up consultation at week 7?
3. How many CardioTrack patients do you expect per week?
4. Should the booking system handle both tiers (consultation + CardioTrack)?
5. Do you want the step count from the patient's phone (e.g., Apple Health / Google Fit API) or manual entry?
6. For the food diary — simple checkboxes ("I ate fish today") or free-text?
