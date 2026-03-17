# London Cardiology Clinic — Website Design Spec

## Overview
Professional single-page website for a private cardiology clinic in Wimbledon (SW19), hosted on GitHub Pages with Cal.com for booking and Stripe for payments.

## Domain
- **drmahmood.org** (already owned)
- Hosting: Digital Ocean droplet ($4/month) + Nginx + Let's Encrypt SSL + Cloudflare CDN (free)

## Clinic Details
- **Name**: London Cardiology Clinic
- **Address**: 40-44 The Broadway, London SW19 1RQ
- **Hours**: Fridays 17:00-20:00 (slots start 17:00-19:30, 6 x 30min)
- **Launch**: 3rd April 2026
- **Price**: £49.99 per 30-minute consultation
- **Clinician**: Dr Mahmood — Specialist in Cardiology, MRCP(UK), GMC no. 6071047. Works on consultant rota at Royal Free Hospital and Barnet Hospital. Does NOT hold CCT. Is NOT a consultant cardiologist.
- **CQC**: Registered (under a registered space, insured)

## Conditions Treated (low-risk only)
1. Palpitations (assessment + ECG)
2. ECG Review (interpretation + advice)
3. Blood Pressure (hypertension assessment — no medication initiation)
4. Breathlessness (cardiac assessment)
5. Heart Murmurs (auscultation + referral if needed)

## NOT Offered
- Chest pain triage (any kind)
- Echocardiography, Holter monitoring (24hr tape), ambulatory BP
- CT, MRI, exercise stress testing
- Medication initiation or changes

## Safety Funnelling (must redirect these patients)
- Ongoing chest pain or acute symptoms → 999
- Under 18 → GP
- Congenital heart disease → specialist
- Known heart failure → specialist
- Implanted cardiac devices (pacemaker/ICD) → specialist
- Cardiac symptoms during pregnancy → obstetric cardiology
- Syncope/fainting → A&E or urgent GP

## Visual Design (approved)
- **Style**: Pastel, warm, welcoming, highly legible
- **Font**: Libre Baskerville (headings) + Inter (UI/body)
- **Colour palette**:
  - Sage green primary: decorative #a8c5b8, text #3d6b55, buttons #4d7a65
  - Cream background: #faf7f2
  - Ivory: #fffdf8
  - Sage light: #dce8e0
  - Blush accent: #e8c4c4
  - Charcoal text: #2c2c2c
  - Warm grey: #6b6560
  - Mid grey: #7a756e
  - Danger red: #9e3333
- **Layout**: Split-screen hero (text left, heart-shaped spider diagram right)
- **Three.js**: Heart-shaped spider diagram with interactive condition points (production version)
- **Responsive**: Breakpoints at 900px and 480px
- **WCAG AA compliant**: All text colours meet 4.5:1 contrast ratio

## Page Sections (single-page, scroll-based)
1. **Safety strip** (top, always visible) — role="alert", 999 guidance, exclusion list
2. **Navigation** (sticky) — About, Conditions, What to Expect, Fees, Contact, Book Appointment CTA
3. **Hero** — split layout: headline + CTA left, heart spider diagram right
4. **Services strip** — 5 conditions as clickable cards (h3 headings)
5. **About / Clinician** — warm welcome, credentials, full CCT disclosure, Royal Free disclaimer
6. **Our Facilities** — what we offer vs what we don't offer
7. **What to Expect** — 4-step timeline (Prepare → Book & Pay → Consultation → Follow Up)
8. **Booking CTA + Cal.com embed** — price, Cal.com inline calendar, cancellation policy
9. **Footer** — address, conditions, info links (Privacy Policy, Terms, Complaints, GDPR), contact

## Booking System (Cal.com — self-hosted)
- **Provider**: Cal.com open source (https://github.com/calcom/cal.com), AGPLv3
- **Hosting**: Self-hosted on same Digital Ocean droplet via Docker Compose
- **URL**: booking.drmahmood.org (or drmahmood.org/booking via Nginx reverse proxy)
- **Embed type**: Inline embed inside the booking section, pointing to own instance
- **Payment**: Stripe integration via Cal.com's built-in Stripe app
  - Patient pays £49.99 at time of booking
  - Stripe handles payment processing (1.4% + 20p per transaction)
- **Availability**: Fridays only, 17:00-19:30 start times, 30-minute slots = 6 slots
  - Slot times: 17:00, 17:30, 18:00, 18:30, 19:00, 19:30
- **Cancellation/rebooking**:
  - Cancel/reschedule links in confirmation email (Cal.com default)
  - >48 hours before appointment: full refund via Stripe (manual process)
  - <48 hours or no-show: no refund
  - Cal.com workflow: automated reminder email 48 hours before appointment
- **Admin**: Dr Mahmood views all bookings at own Cal.com admin dashboard
- **Droplet**: $24/month (4GB RAM, 2 vCPU) — runs Nginx + Cal.com (Docker) + PostgreSQL (Docker)
- **Docker services**: cal.com (Next.js on port 3000), PostgreSQL (port 5432)
- **Nginx**: reverse proxy /booking → localhost:3000, static files for main site
- **Setup steps**:
  1. Clone cal.com repo on droplet
  2. Configure .env (NEXTAUTH_SECRET, DATABASE_URL, STRIPE keys, NEXTAUTH_URL)
  3. docker-compose up -d (Cal.com + PostgreSQL)
  4. Create admin account via Cal.com setup wizard
  5. Create event type: "Cardiology Consultation" (30min, £49.99)
  6. Set availability: Fridays 17:00-20:00
  7. Install Stripe app in Cal.com, connect Stripe account
  8. Configure Nginx reverse proxy
  9. Update embed code in index.html to point to own instance

## GDPR & Security
- Self-host Google Fonts in production (no third-party data transfer)
- Content Security Policy header (allow stripe.com, cal.com)
- Privacy Policy page (required — covers health data under Article 9)
- Terms of Service page (required — covers paid medical consultations)
- Complaints procedure link (CQC Regulation 16)
- Referrer-Policy: strict-origin-when-cross-origin
- External links: rel="noopener noreferrer"
- Cookie consent: only needed if analytics added later (no cookies in base site)
- Cal.com and Stripe are data processors — must be listed in Privacy Policy

## Accessibility
- Skip-to-content link
- `<main>` landmark, `<nav aria-label>`, `role="alert"` on safety banner
- All interactive elements keyboard accessible
- Focus indicators on all focusable elements
- SVG diagrams: role="img" + aria-label, decorative elements aria-hidden
- prefers-reduced-motion support
- Minimum 14px body text
- Heading hierarchy: h1 → h2 → h3 (no skips)
- Semantic `<ol>` for timeline steps
- lang="en-GB"

## Files to Create
1. `index.html` — main single-page site with all sections + Cal.com embed
2. `privacy-policy.html` — UK GDPR compliant privacy policy
3. `terms.html` — Terms of service for paid medical consultations
4. `CNAME` — GitHub Pages custom domain file (drmahmood.org)
5. `fonts/` — self-hosted Libre Baskerville + Inter WOFF2 files
6. `favicon.ico` + `apple-touch-icon.png`

## Spec Review Fixes
- **Hours standardised**: Clinic 17:00-20:00, slots start 17:00-19:30
- **Three.js interaction**: Hovering a condition point shows a tooltip with condition name and brief description. Clicking scrolls to that condition in the services strip.
- **CSP**: Proper HTTP headers via Nginx (Digital Ocean droplet). Full CSP including frame-ancestors.
- **Complaints**: Inline section on terms.html page (not a separate page)
- **Contact method**: drmahmoodclinic@pm.me — displayed in footer and Contact section. Proton Mail (privacy-focused, GDPR compliant). Patients who cannot book online can email to arrange by phone.
- **GMC number**: Add GMC registration number to the clinician disclosure section (Dr Mahmood to provide).
- **Cancellation refund**: Manual process via Stripe dashboard. Display policy text on site. Cal.com handles cancel/rebook; refunds processed manually in Stripe.
- **Safety strip on secondary pages**: All pages include the safety strip at the top.
- **NHS disclaimer text**: "This clinic is not affiliated with or endorsed by the Royal Free London NHS Foundation Trust."
- **Schema.org structured data**: Add MedicalClinic JSON-LD for local SEO.

## Files to Create (updated)
1. `index.html` — main single-page site with all sections + Cal.com embed
2. `privacy-policy.html` — UK GDPR compliant privacy policy (includes safety strip)
3. `terms.html` — Terms of service + complaints procedure (includes safety strip)
4. `CNAME` — GitHub Pages custom domain file (drmahmood.org)
5. `fonts/` — self-hosted Libre Baskerville + Inter WOFF2 files
6. `favicon.ico` + `apple-touch-icon.png`
7. `404.html` — branded 404 page with link back to main site

## Out of Scope (for now)
- Individual condition pages (can add later)
- Blog/articles
- Patient portal
- Online records
- Analytics (can add privacy-respecting analytics like Plausible later)
