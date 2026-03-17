## Multi-Persona Review: concept3-pastel.html
### Date: 2026-03-16
### Summary: 23 P0, 31 P1, 24 P2

---

## P0 -- Critical

### Security (5)
- **[SEC-1]** Google Fonts @import leaks IP to Google without consent — GDPR violation. Fix: self-host fonts.
- **[SEC-2]** No Privacy Policy page (placeholder # link). Required under UK GDPR Art 13 for health data.
- **[SEC-3]** No GDPR page (placeholder # link). Healthcare must address Art 9 special category data.
- **[SEC-4]** No Content Security Policy. Critical before Stripe integration.
- **[SEC-5]** No lawful basis stated for health data processing. No consent mechanism.

### UX/Accessibility (10)
- **[UX-1]** White text on sage-deep buttons (#7ba393) = 2.80:1 contrast. WCAG AA needs 4.5:1. Fix: darken to #4d7a65.
- **[UX-2]** Sage-deep (#7ba393) used as text colour everywhere fails AA (2.54-2.75:1). Fix: use #3d6b55 for text.
- **[UX-3]** Light-grey (#b5aea6) text fails AA at 2.05:1. Fix: darken to #7a756e.
- **[UX-4]** Footer link colour (rgba 0.4 white on charcoal) = 2.43:1. Fix: raise to 0.75 opacity.
- **[UX-5]** No visible focus indicators anywhere. Keyboard users cannot navigate.
- **[UX-6]** Service cards are div+cursor:pointer but no role/tabindex/keyboard. Inaccessible.
- **[UX-7]** Safety banner has no role="alert" or ARIA landmark.
- **[UX-8]** 999 text colour (#c45a5a on #f5e5e5) = 3.47:1. Emergency number illegible.
- **[UX-9]** No skip-to-content link.
- **[UX-10]** No `<main>` landmark.

### Domain/Regulatory (8)
- **[DOM-1]** "Expert" used repeatedly — implies specialist register status without CCT. GMC misleading.
- **[DOM-2]** "NHS-grade expertise" is a fabricated quality benchmark. ASA non-compliant.
- **[DOM-3]** No disclosure that clinician is NOT a consultant and has no CCT. Most critical issue.
- **[DOM-4]** No CQC registration mentioned. Operating without CQC = criminal offence.
- **[DOM-5]** No indemnity insurance mentioned. GMC Reg 2.5 requirement.
- **[DOM-6]** "Chest Pain — Low-risk triage" unsafe without troponin/echo/stress testing facilities.
- **[DOM-7]** No complaints procedure identified. CQC Regulation 16 requirement.
- **[DOM-8]** No privacy/data protection contact. Required before processing health data.

---

## P1 -- Important

### Security (10)
- **[SEC-6]** Stripe integration must use Checkout/Payment Links, never embed keys.
- **[SEC-7]** No X-Frame-Options — clickjacking risk.
- **[SEC-8]** No Referrer-Policy — URL leakage to third parties.
- **[SEC-9]** No Permissions-Policy (camera/mic/geo should be denied).
- **[SEC-10]** Google Fonts has no SRI hash.
- **[SEC-11]** Verify clinic address is commercial, not personal.
- **[SEC-12]** External links need rel="noopener noreferrer".
- **[SEC-13]** No X-Content-Type-Options: nosniff.
- **[SEC-14]** No DPO/data controller/ICO registration number.
- **[SEC-15]** No Terms of Service for paid medical consultations.

### UX/Accessibility (12)
- **[UX-11]** Zero @media queries — no mobile responsiveness at all.
- **[UX-12]** Heading hierarchy skips: h1→h2→h4 (no h3).
- **[UX-13]** Spider diagram SVG has no aria-label/role="img".
- **[UX-14]** ECG decoration SVG needs aria-hidden="true".
- **[UX-15]** Nav needs aria-label="Main navigation".
- **[UX-16]** "Book Appointment" appears 3x with identical text — screen reader confusion.
- **[UX-17]** Duplicate link texts between services strip and footer.
- **[UX-18]** Safety banner is below the fold — should be at top for anxious patients.
- **[UX-19]** 12px body text too small for older cardiology demographic. Minimum 14px.
- **[UX-20]** Eyebrow div duplicates logo text — add aria-hidden.
- **[UX-21]** Price at font-weight:300 too thin for readability.
- **[UX-22]** Service cards look clickable but do nothing — broken affordance.

### Domain/Regulatory (9)
- **[DOM-9]** "Specialist" has legal meaning under Medical Act 1983 — not on Specialist Register.
- **[DOM-10]** "Royal Free Hospital" badge implies endorsement — needs Trust permission.
- **[DOM-11]** "No GP referral needed" risks attracting acutely unwell patients.
- **[DOM-12]** Safety exclusions incomplete — missing heart failure, devices, pregnancy, syncope.
- **[DOM-13]** No disclosure of available vs unavailable diagnostics (no echo/Holter/CT/MRI).
- **[DOM-14]** "Cardiac screening" misuses public health term. Should be "assessment."
- **[DOM-15]** GP report sharing needs explicit consent mention.
- **[DOM-16]** No cancellation/refund policy. Consumer Contracts Regulations require it.
- **[DOM-17]** "London Cardiology Clinic" geographically misleading + trademark risk.

---

## P2 -- Minor (24 items across 3 personas — see full agent outputs)

Key items: remove palette bar, add prefers-reduced-motion, structured data (Schema.org), semantic timeline (ol), £49.99→£50 pricing psychology, contact phone/email, escalation protocol, hypertension scope clarification, lang="en-GB", favicon.

---

## Top 5 Actions Before Launch

1. **Disclose clinician grade honestly** — no CCT, not a consultant. Most critical GMC issue.
2. **Confirm CQC registration** — operating without it is criminal.
3. **Remove "Chest Pain"** from services — unsafe without diagnostics.
4. **Fix colour contrast** — sage-deep fails AA everywhere. Darken text shade.
5. **Self-host fonts + create Privacy Policy** — GDPR compliance for health data.
