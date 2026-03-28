# Multi-Persona Review: OpenPalp Website

### Date: 2026-03-19
### Personas: Security Auditor, UX/Accessibility, Clinical Safety, Software Engineer, Frontend Quality
### Summary: 16 P0, 22 P1, 18 P2 (deduplicated across 5 personas)

---

## P0 -- Critical (16)

- **P0-1** [Clinical Safety]: No emergency/999 message on Home page above the fold. Patient with chest pain could book without seeing safety warning. (line ~1377)
  - Fix: Add global safety banner below nav, visible on every SPA page

- **P0-2** [Clinical Safety]: No age validation in booking form. Under-18s can book and pay. (line ~2432)
  - Fix: Calculate age from DOB, reject if <18

- **P0-3** [Clinical Safety]: Name inconsistency: "Dr Mahmood Ahmad" in index.html vs "Dr Mahmood Ul Hassan" in privacy-policy.html and terms.html
  - Fix: Use GMC-registered name consistently everywhere

- **P0-4** [Clinical Safety]: "When you feel palpitations" 6-step protocol has no emergency escalation step. Patient could follow steps during sustained VT. (lines 1656-1700)
  - Fix: Add "If symptoms last >15-20 min or you feel faint/chest pain, call 999"

- **P0-5** [Clinical Safety]: No suitability screening before booking. Patient with syncope/chest pain can book without any gate. (lines 1504-1568)
  - Fix: Add mandatory pre-booking acknowledgement checkbox confirming no red flags

- **P0-6** [Software Eng]: SPA routing breaks on `#pricing-section` popstate — page goes blank. (line 2212)
  - Fix: Guard handleHash() to only accept known page IDs

- **P0-7** [Software Eng]: Stripe payment succeeds but DB booking fails (non-SLOT_CONFLICT error) — charge without refund. (server line 540)
  - Fix: Add refund logic in outer catch block

- **P0-8** [Security]: Booking rate-limiter cleanup bug — `record.first` undefined, entries never cleaned up, memory leak. (server line 352)
  - Fix: Use `record.timestamps[0]` instead of `record.first`

- **P0-9** [Frontend/UX]: Suitability `<ul>` elements missing `class="suit-list"` — no checkmarks/crosses/circles shown. (lines 1866, 1879, 1898)
  - Fix: Add `class="suit-list"` to all three `<ul>` tags

- **P0-10** [Frontend]: `class="eyebrow"` used but not defined — "THE PROGRAMME" and "YOUR TOOLS" labels unstyled. (lines 1604, 1780)
  - Fix: Change to `class="section-eyebrow"`

- **P0-11** [Frontend]: Protocol steps layout broken — h4 and p are separate flex items instead of stacked. (lines 1664-1698)
  - Fix: Wrap h4+p in a `<div>` inside each `.protocol-step`

- **P0-12** [Frontend]: All 7 images missing `width`/`height` attributes — CLS layout shift.
  - Fix: Add intrinsic dimensions to each `<img>`

- **P0-13** [UX]: `outline: none` on date-card and time-btn without visible replacement — keyboard focus invisible. (lines 1173, 1213)
  - Fix: Add strong focus ring `outline: 2px solid var(--blue-400)`

- **P0-14** [UX]: Sticky mobile CTA has `aria-hidden="true"` but contains focusable link — ghost element for screen readers. (line 2164)
  - Fix: Remove `aria-hidden="true"`

- **P0-15** [UX]: SPA pages have no `<h1>` except home — heading hierarchy broken for screen readers. (lines 1598-2127)
  - Fix: Add `<h1>` to each page section

- **P0-16** [Frontend]: No `og:image` meta tag — social sharing shows no preview.
  - Fix: Add `<meta property="og:image" content="...">`

## P1 -- Important (22)

- **P1-1** [Security]: CSP mismatch between Caddyfile and helmet — dual headers, Google Fonts whitelist stale in helmet
- **P1-2** [Security]: No CSRF protection on state-changing endpoints (mitigated by sameSite:strict)
- **P1-3** [Security]: Patient log token exposed in URL query string (browser history, Referrer header)
- **P1-4** [Security]: No rate limiting on /api/cancel, /api/log/submit, /api/ecg/upload
- **P1-5** [Security]: `unsafe-inline` in script-src CSP — negates XSS protection
- **P1-6** [Security]: Missing `frame-ancestors` in Caddyfile CSP + no X-Frame-Options on static pages
- **P1-7** [Clinical Safety]: CCT/Specialist Register disclosure only in clinicians page + footer — not on patient-facing pages
- **P1-8** [Clinical Safety]: Devices page has no emergency guidance
- **P1-9** [Clinical Safety]: Evidence page has no emergency guidance
- **P1-10** [Clinical Safety]: Vagal technique warning incomplete — no carotid massage warning, no escalation
- **P1-11** [Clinical Safety]: Privacy policy references Cal.com but site now uses custom Stripe — GDPR inaccuracy
- **P1-12** [Clinical Safety]: No CQC registration statement anywhere
- **P1-13** [Clinical Safety]: No complaints procedure mentioned
- **P1-14** [Clinical Safety]: No privacy policy link next to consent checkbox at booking
- **P1-15** [UX]: `--mid-grey` text on white fails WCAG AA contrast (2.8:1 vs required 4.5:1)
- **P1-16** [UX]: Footer text rgba(255,255,255,0.4) on dark background fails contrast
- **P1-17** [UX]: Booking widget has no step progress indicator (Step 2 of 5)
- **P1-18** [Frontend]: 5 CSS classes used in HTML but never defined: `.section-inner`, `.section-sub`, `.eyebrow`, `.info-cards`, `.suit-grid-narrow`
- **P1-19** [Software Eng]: /api/slots 500 response silently shows "No appointments" instead of error
- **P1-20** [Software Eng]: showPage() pushes duplicate history entries on popstate — Back button feels stuck
- **P1-21** [Software Eng]: No fetch timeout on /api/book — user stuck on "Processing..." forever
- **P1-22** [Software Eng]: IntersectionObserver never unobserves — wastes CPU on scroll

## P2 -- Minor (18)

- **P2-1** [Security]: Weak email validation (`includes('@')` only)
- **P2-2** [Security]: No `Secure` cookie flag when NODE_ENV not set
- **P2-3** [Security]: Default admin password hardcoded in source
- **P2-4** [Security]: Server error messages leak Stripe details to admin client
- **P2-5** [UX]: Booking back buttons have no focus-visible style
- **P2-6** [UX]: FAQ answer regions lack `aria-labelledby`
- **P2-7** [UX]: Skip link uses inline JS (onfocus/onblur)
- **P2-8** [UX]: Duplicate `prefers-reduced-motion` media queries
- **P2-9** [UX]: Book CTA in nav goes to #home instead of #pricing-section
- **P2-10** [UX]: FAQ max-height: 400px could truncate long answers on mobile
- **P2-11** [Clinical Safety]: Evidence citations lack full references/DOIs
- **P2-12** [Clinical Safety]: "Movement is medicine" — slightly overclaimed
- **P2-13** [Clinical Safety]: CAST trial narrative overclaims ("more powerful than any drug")
- **P2-14** [Clinical Safety]: Cookie consent needed for Stripe cookies
- **P2-15** [Frontend]: No favicon declared
- **P2-16** [Frontend]: Images should use `loading="lazy"`
- **P2-17** [Frontend]: ~120 lines dead CSS (unused classes)
- **P2-18** [Frontend]: PNGs could be WebP for smaller sizes

## False Positive Watch
- The booking "Unable to load appointments" is expected without a running Express server — NOT a bug
- The `pk_live_PLACEHOLDER` is a known placeholder — NOT a leaked key
- Div balance 155 vs 151 on raw grep is due to 4 `<div` in JS innerHTML strings — actual balance is 151/151

---

## USER REQUEST: Add Clinician Profile Section
User noted the clinician bio/transparency is buried in #clinicians (a page labelled "for healthcare professionals") and the footer. Patients need to easily see who they're seeing. **Add a prominent "Your Clinician" section to the Home page with Dr Ahmad's bio and transparency statement.**

---

Status: REVIEW COMPLETE — awaiting fix decisions
