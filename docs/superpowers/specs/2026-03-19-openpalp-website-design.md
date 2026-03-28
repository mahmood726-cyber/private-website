# OpenPalp Website Redesign — Design Spec

**Date**: 2026-03-19
**Status**: Draft
**Scope**: Transform London Cardiology Clinic website into a focused OpenPalp programme site

## Summary

Replace the current two-page website (general cardiology landing + palpitations pathway) with a single OpenPalp-focused site. The existing `pathway.html` SPA architecture is reused; its content is completely rewritten to match the OpenPalp Booklet v4.0. The old `index.html` is replaced. All 7 booklet diagrams are incorporated.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Site structure | Single OpenPalp site (option A) | Clinic is pivoting to this programme; one clear message |
| Base architecture | Rewrite pathway.html content, keep SPA shell | Existing hash routing, responsive layout, animations are solid |
| Address | 40-44 The Broadway, London SW19 1RQ | Per user direction |
| Pricing | £49.99 clinic + £49.99 monitoring/programme | Two-part, each £49.99 |
| Device deposit | £200 pre-auth mentioned on site | Plus replacement costs (Wellue £90, Kardia £70) |
| Booking | Cal.com embed for initial £49.99 appointment only | Second payment in-person after suitability confirmed; simpler than custom Stripe flow |
| Booking system | Cal.com (not custom Stripe) | Supersedes 2026-03-17 spec; custom booking deferred to future phase |
| General conditions | Removed | BP, breathlessness, murmurs no longer advertised |
| Radar diagram | Removed | Was for 5 general conditions; no longer relevant |
| #safety page | Merged into #suitability + #clinicians | Governance items split by audience; see Page Migration Map |
| Mobile sticky CTA | Kept with updated text | "Book Your £49.99 Heart Check" — links to #home booking section |

## Architecture

### File Changes

| File | Action |
|------|--------|
| `index.html` | Replaced with rewritten pathway.html (becomes the new index) |
| `pathway.html` | Retired (content moves to index.html) |
| `book.html` | Retired (booking via Cal.com embed in index.html) |
| `index-old-general.html` | Kept as archive |
| `css/style.css` | No longer referenced (new site uses inline styles like current pathway.html) |
| `js/main.js` | No longer referenced (SPA JS is inline in new index.html) |
| `js/spider-diagram.js` | No longer referenced |
| `img/openpalp-*.png` | 7 booklet diagrams, already extracted (numbered 6-12; gap is from docx extraction order) |
| `Caddyfile` | Update `try_files {path} /pathway.html` to `try_files {path} /index.html` |
| `privacy-policy.html` | Kept as-is |
| `terms.html` | Kept as-is |
| `404.html` | Kept as-is |

**Image src paths:** All diagram images use `/img/openpalp-N.png` (absolute from web root). Image map:

| File | Content |
|------|---------|
| `/img/openpalp-6.png` | Attention loop diagram |
| `/img/openpalp-7.png` | 6-week journey visual |
| `/img/openpalp-8.png` | Wellue patch placement |
| `/img/openpalp-9.png` | Kardia recording positions |
| `/img/openpalp-10.png` | 4-6 breathing technique |
| `/img/openpalp-11.png` | Vagus nerve mechanism |
| `/img/openpalp-12.png` | Sleep and heart rhythm (PVCs) |

**Note on retired files:** The old address (146 Church Road) appears in pathway.html and book.html — both retired. No migration needed for those files.

### Page Migration Map

| Old page | New destination | Content |
|----------|----------------|---------|
| `#home` | `#home` | Hero rewritten; radar diagram removed; pricing/booking kept |
| `#how-it-works` | `#home` (journey visual) + `#programme` (timeline) | Merged |
| `#whats-included` | `#home` (pricing) + `#devices` (device details) | Merged |
| `#suitability` | `#suitability` | Criteria updated to match booklet |
| `#programme` | `#programme` | Completely rewritten with 6-week booklet content |
| `#safety` | `#suitability` (safety banner, escalation) + `#clinicians` (governance, transparency) | Split by audience |
| `#faq` | `#faq` | Questions updated for OpenPalp |
| `#clinicians` | `#clinicians` | Updated for OpenPalp specifics |
| — | `#devices` (NEW) | Wellue + Kardia setup and usage |
| — | `#evidence` (NEW) | 4 research stories with diagrams |

### SPA Page Structure

The site is a single HTML file with hash-routed pages, matching the current pathway.html pattern.

```
#home          — Hero + introduction + journey overview + pricing + booking
#programme     — 6-week programme detail + daily practice + palpitation response protocol
#devices       — Wellue patch + KardiaMobile 6L setup and usage
#suitability   — Inclusion/exclusion criteria + safety
#evidence      — 4 research stories with diagrams
#faq           — Updated FAQ accordion
#clinicians    — For healthcare professionals (largely unchanged)
```

### Navigation

```
OpenPalp | The Programme | Your Devices | Is This Right for You? | The Evidence | FAQ | For Clinicians | [Book]
```

- Logo: "**OpenPalp** *by London Cardiology Clinic*"
- "Book" is a pill-shaped CTA button
- Mobile hamburger menu unchanged

## Page Designs

### #home — Hero + Introduction

**Hero:**
- Animated ECG background traces (copy SVG markup + CSS keyframes verbatim from current pathway.html lines 889-915, 1111-1115)
- Eyebrow: "OPENPALP — YOUR PERSONAL HEART RHYTHM PROGRAMME"
- Symptom line (italic): "Experiencing skipped beats, fluttering, or a racing heart?"
- H1: "30 days of monitoring. 6 weeks of understanding."
- Sub text: structured programme description, Friday evenings in Wimbledon
- CTAs: "Book Your £49.99 Heart Check" (primary) + "See if this is right for you" (secondary)

**"You are not alone" section:**
- Empathetic copy from booklet (p.3)
- "Millions of people experience palpitations..."
- Common triggers list: caffeine, poor sleep, stress/anxiety, alcohol, dehydration, hormonal changes
- "You will find your personal triggers through this programme"

**Attention loop diagram:**
- `img/openpalp-6.png` displayed full-width (max ~750px, centred)
- Alt text: "Diagram showing the attention loop: heartbeat noticed leads to attention focusing on heart, which finds more beats. The OpenPalp programme breaks this loop."
- Caption text from booklet: "The more you monitor your heartbeat, the more you find it — until you learn not to look."

**6-week journey visual:**
- `img/openpalp-7.png` displayed full-width (max ~850px, centred)
- Explanatory text: "Two things happen at once: monitoring runs for 30 days, your lifestyle programme runs for 6 weeks."

**NHS comparison (kept):**
- Two-card grid: "12-18 weeks" (NHS) vs "This Friday" (OpenPalp)
- Note about typical private cardiology costing £200-350

**Pricing section:**
- Two price cards side by side:

**Clinic Appointment — £49.99:**
- Face-to-face assessment
- Symptom and trigger review
- Risk factor assessment
- ECG if clinically indicated
- Suitability confirmation
- Clear explanation and next steps

**Monitoring & Programme — £49.99:**
- Wellue patch (48-hour continuous recording)
- KardiaMobile 6L (30 days of event recording)
- OpenPalp printed booklet
- 6-week guided programme
- Review of all recordings
- Results appointment and findings letter

**Total box:** £99.98

**Notes below pricing:**
- £200 pre-authorisation (not a charge) for device loan, released on return
- Device replacement if lost/damaged: Wellue £90 / Kardia £70
- Clinic appointment is standalone — no commitment to full programme
- You decide about monitoring and the programme after your appointment

**Booking section:**
- H2: "Ready to take the first step?"
- Sub: "Your £49.99 clinic appointment is standalone — no commitment to the full programme. You decide about monitoring after your appointment."
- Cal.com inline calendar embed
- Address: 40-44 The Broadway, London SW19 1RQ
- Friday evenings, 17:00-20:00
- Cancellation: 48hr notice = full refund; <48hr or no-show = no refund

### #programme — The 6-Week Programme

**Section header:**
- Eyebrow: "THE PROGRAMME"
- H2: "Six weeks of structured support"
- Sub: "Each week has one focus. Build on the one before."

**Timeline (vertical, using existing timeline CSS):**

- **Week 1 — Listen**: Wear your Wellue patch for 48 hours. Start your Kardia. Begin your diary. Simply observe. Every entry is a clue.
- **Week 2 — Breathe**: Five minutes of slow breathing, twice a day. 4 seconds in, 6 seconds out. In a meta-analysis of 31 studies, this changed heart rhythm within the same session.
- **Week 3 — Discover**: Look back at your diary. Find your two personal triggers. In studies, 71% found stress, 62% caffeine, 58% sleep disruption.
- **Week 4 — Change**: Act on your top trigger. One change. Seven days. The same heart responds differently to a different life.
- **Week 5 — Move**: Monitoring has ended. Devices returned. Your programme continues. Set your step baseline and add 500 per day.
- **Week 6 — Understand**: Final week. No more devices. Just you and your diary and six weeks of evidence about your own heart.

**"When you feel palpitations" — 6-step protocol:**
- Cards or numbered steps layout (using existing step-card CSS)
1. **Stay calm** — Anxiety amplifies palpitations. Take one slow breath. Most palpitations are not dangerous.
2. **Sit or lie down** — Reduce demand on your heart.
3. **Breathe slowly** — 4 seconds in. 6 seconds out. Repeat five times. Activates your vagus nerve.
4. **Try a vagal technique** — Bear down gently (Valsalva), or splash cold water on your face. Only if you feel well enough.
5. **Record on Kardia** — As quickly as possible. Even if symptoms are settling.
6. **Write in your diary** — Time, duration, severity, what you were doing, what helped.

**Vagal techniques safety note** (callout box):
- Not suitable if you have known eye disease or significant heart valve problems
- If you feel very unwell, do not attempt them. Always sit or lie down first.

**Daily practice section:**
- Two-column layout:
- **Every morning**: Check HRV, resting Kardia recording, 5 min breathing (4-6), fill in diary
- **Every evening**: 5 min breathing, note one thing that helped, rate heart anxiety (1-10), note steps

**Understanding HRV callout:**
- "Heart rate variability is the variation between heartbeats. Higher = calm and adaptable. Lower = under strain."
- "Just watch the trend. Most people see HRV rise over six weeks."

**Lifestyle experiments section:**
- Experiment 1: The caffeine test (week 3) — replace first coffee with hot water and lemon for 7 days
- Experiment 2: The sleep anchor (week 4) — fixed wake time for 7 days, no caffeine after 2pm

### #devices — Your Devices

**Section header:**
- Eyebrow: "YOUR TOOLS"
- H2: "Two devices, one clear picture"

**Two-column cards grid:**

**Wellue Patch — 48 hours:**
- `img/openpalp-8.png` (placement diagram)
- "This small device records every heartbeat for 48 hours — day and night, while you sleep, while you live your life."
- **Setup steps**: Clean skin, press electrode 30 seconds, clip device (R marker faces right), green light confirms recording
- **Placement**: One palm-width below left collarbone, angled 45 degrees toward left side
- **Showering**: Not waterproof — remove before showering, reattach after drying
- **Returning**: Remove device, place in prepaid envelope, post same day or bring to clinic. Continue Kardia for remaining 28 days.

**KardiaMobile 6L — 30 days:**
- `img/openpalp-9.png` (recording diagram)
- "Your heart's voice recorder — activated by you, at the moment that matters."
- **Setup**: Download free Kardia app, tap 'Add a device', follow pairing steps. No paid subscription needed.
- **How to record**: Right hand index+thumb on top, left thumb on bottom, optionally rest device on left knee for 6-lead. Hold still, breathe gently, 30 seconds.
- **When to record**: Whenever you feel symptoms (as quickly as possible) + one morning resting recording each day before getting up
- **"Unclassified" note**: Means the AI could not read it — your clinician will review the trace directly

**Device loan callout:**
- £200 pre-authorisation (not a charge), released when devices returned
- Replacement costs: Wellue £90 / Kardia £70

### #suitability — Is This Right for You?

**Largely unchanged from current design.** Green/red/amber card layout.

**Suitable (green card):**
- Intermittent palpitations — awareness of heartbeat
- Episodes brief — seconds to minutes
- Generally well between episodes
- No known significant structural heart disease

**Not suitable (red card):**
- Syncope or near-syncope
- Chest pain of possible cardiac origin
- Severe or unexplained breathlessness
- Sustained palpitations >20-30 minutes
- Known structural heart disease or heart failure
- Known significant arrhythmia requiring management
- Abnormal baseline ECG requiring investigation
- Strong family history of sudden cardiac death
- Symptoms clearly triggered by exertion
- Pacemaker or ICD in situ

**Borderline (amber card):**
- More frequent or prolonged episodes
- Mild exertional symptoms without other red flags
- Unclear history
- Previous investigations but persistent symptoms
- Note: "These patients may enter the pathway after clinician review, or be referred onward directly."

**Safety banner:**
- "If you have chest pain, fainting, severe breathlessness, or feel acutely unwell, do not use this service. Call 999 or attend A&E immediately."

**Escalation callout:**
- "If monitoring reveals atrial fibrillation, SVT, significant pauses, or a high ectopy burden, you will be referred promptly to NHS or private cardiology. You will not be left without a plan."

### #evidence — The Evidence Behind the Programme

**Section header:**
- Eyebrow: "THE EVIDENCE"
- H2: "These are not theories"
- Sub: "They are findings from real studies involving real people — people whose hearts changed when they changed how they lived."

**4 evidence stories, each as a card with optional diagram:**

**The breathing story:**
- `img/openpalp-10.png` (4-6 breathing technique)
- `img/openpalp-11.png` (vagus nerve mechanism)
- Springer Nature 2024, meta-analysis of 31 studies, n=1,133
- "In every group, the heart rhythm changed. Not after weeks of practice. Within the same session. Within minutes."

**The sleep story:**
- `img/openpalp-12.png` (PVCs +33% vs -33%)
- Miner et al., SLEEP 2016: disrupted sleep nights → 33% more PVCs, stayed elevated next day
- JACC 2021: 403,187 people, healthy sleep → 29% lower AF risk
- "Your sleep is not separate from your heart rhythm. It is part of it."

**The movement story:**
- No diagram — CSS stat callout
- 22,516 adults, 14-year follow-up
- "Every additional unit of BMI added 4% more risk. Not because of a disease — because of how they were living."

**The CAST trial — the most important story in modern cardiology:**
- No diagram — blockquote-style callout
- 1989 trial: drug that suppressed extra beats → patients dying at 3x the rate
- "Extra heartbeats are a signal, not always the problem. Silencing them without understanding them can be worse than leaving them alone."
- "Understanding them — as you are doing — is more powerful than any drug designed to suppress them."

### #faq — Frequently Asked Questions

**Accordion component (unchanged).** Updated questions:

1. **What happens at the appointment?** — 30-min consultation, symptom review, ECG if indicated, suitability assessment. 40-44 The Broadway, Wimbledon.
2. **What are the two devices?** — Wellue ER1-LW (48hr patch) and KardiaMobile 6L (30-day event recorder). Both loaned for the programme duration.
3. **Do I have to commit to the full programme?** — No. £49.99 clinic appointment is standalone. You decide after.
4. **What if my ECG is normal?** — A single ECG captures seconds. This pathway monitors for 30 days to catch what a single ECG misses.
5. **What if something significant is found?** — Referred to NHS or private cardiology with documented findings. AF, SVT, pauses, high ectopy burden — all escalated.
6. **What if nothing is found after monitoring?** — That itself is useful. Normal monitoring + normal assessment = meaningful reassurance. Programme still helps.
7. **What about the device deposit?** — £200 pre-auth (not a charge), released on return. Replacement costs: Wellue £90 / Kardia £70.
8. **Is this suitable if I have fainted?** — No. Fainting requires urgent specialist assessment.
9. **Where is the clinic?** — 40-44 The Broadway, Wimbledon, London SW19 1RQ. Friday evenings 17:00-20:00.
10. **Why combine monitoring with lifestyle changes?** — Monitoring tells you what your heart is doing. The programme helps you influence what it does next.
11. **Can I still be referred to a cardiologist?** — Yes. This pathway does not prevent referral. Significant findings or persistent symptoms are escalated.

### #clinicians — For Clinicians

**Content to keep verbatim from current pathway.html:**
- Clinician info banner ("This page is written for healthcare professionals...")
- Dr Mahmood Ahmad credentials + full transparency statement (no CCT, no Specialist Register — this is a regulatory requirement, must be prominent)
- Communication section (GP summary within 5 working days)
- Referral callout (patients may self-refer, email for discussion)

**Content to update:**
- Programme name → OpenPalp
- Monitoring protocol → Wellue ER1-LW (48hr continuous) + KardiaMobile 6L (30 days event recording). Replaces stepped Kardia-only approach.
- Six-week programme → specific week-by-week structure: Week 1 Listen, Week 2 Breathe, Week 3 Discover, Week 4 Change, Week 5 Move, Week 6 Understand
- Inclusion/exclusion criteria → match booklet suitability checklist exactly
- Escalation thresholds → unchanged (SVT, AF, pauses >3s, ectopy >10%, unexplained symptoms, persistent concern)

**Content to remove:**
- References to general conditions (BP, breathlessness, murmurs)
- References to "stepped" monitoring (now specific devices)

**Governance content (migrated from old #safety page):**
The following governance items from the old `#safety` page must appear in `#clinicians`:
- "This service is for selected low-risk patients with palpitations only. Not a substitute for comprehensive cardiology care."
- "Every patient assessed at initial appointment to confirm suitability."
- "Clear referral thresholds defined" (list of escalation criteria)
- "Not an emergency service"
- "Monitoring recordings reviewed within clinic pathway; complex findings escalated"
- "Improvement programme is supportive and behavioural; does not replace medical treatment"
- "Unexplained symptoms after pathway completion are escalated"
- Full transparency statement about Dr Ahmad's career pathway (MUST appear here AND in footer)

### Footer

- Brand: "**OpenPalp** *by London Cardiology Clinic*"
- Address: 40-44 The Broadway, Wimbledon, London SW19 1RQ
- Email: drmahmoodclinic@pm.me
- Links: The Programme | Your Devices | Suitability | Evidence | FAQ | Privacy | Terms
- Credentials: Dr Mahmood Ahmad — Specialist in Cardiology (SAS), MRCP(UK) — GMC 6071047
- Safety line: "This service is for selected low-risk patients only. Not an emergency service. Call 999 for chest pain, fainting, or severe breathlessness."
- "OpenPalp Pathway v1.0"

## SEO & Metadata

```html
<title>OpenPalp — Private Palpitations Programme in Wimbledon | London Cardiology Clinic</title>
<meta name="description" content="Structured 30-day heart rhythm monitoring and 6-week improvement programme for low-risk palpitations. Wellue patch, KardiaMobile, guided lifestyle support. From £49.99. Friday evenings, Wimbledon SW19.">
<link rel="canonical" href="https://londoncardiologyclinic.uk/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://londoncardiologyclinic.uk/">
<meta property="og:title" content="OpenPalp — Private Palpitations Programme in Wimbledon">
<meta property="og:description" content="30 days of monitoring. 6 weeks of understanding. Structured assessment for low-risk palpitations. Friday evenings in Wimbledon. From £49.99.">
<meta property="og:locale" content="en_GB">
<meta property="og:site_name" content="OpenPalp by London Cardiology Clinic">
```

**Schema.org JSON-LD** — updated MedicalClinic structured data:
- `name`: "OpenPalp by London Cardiology Clinic"
- `description`: "Structured palpitations assessment and improvement programme..."
- `url`: "https://londoncardiologyclinic.uk/"
- `address`: 40-44 The Broadway, London SW19 1RQ, GB
- `openingHours`: "Fr 17:00-20:00"
- `priceRange`: "£49.99-£99.98"
- `medicalSpecialty`: "Cardiology"
- `availableService`: single entry for "OpenPalp Palpitations Programme" (remove BP, breathlessness, murmurs)
- `employee`: Dr Mahmood Ahmad, MRCP(UK), GMC 6071047

## Booking Embed

Cal.com is self-hosted on a **subdomain**: `booking.londoncardiologyclinic.uk` (Caddyfile line 29-31, reverse proxied to localhost:3000).

**Embed code** — adapted from existing index.html lines 429-442, updated to use subdomain:
- Script loads from `https://booking.londoncardiologyclinic.uk/embed/embed.js`
- `Cal("init", { origin: "https://booking.londoncardiologyclinic.uk" })`
- `Cal("inline", { elementOrSelector: "#cal-embed", calLink: "USERNAME/cardiology-consultation", ... })`
- Brand colour: `#4d7a65` (sage, matching existing)
- Target element: `<div id="cal-embed">` inside the booking section of `#home`

**Note:** The Cal.com `calLink` slug ("USERNAME/cardiology-consultation") needs to be updated by the user to match their actual Cal.com event type. This is a placeholder in the current code.

## Mobile Sticky CTA

Kept from current pathway.html. Updated:
```html
<div class="sticky-cta-mobile" aria-hidden="true">
  <a href="#home">Book Your £49.99 Heart Check</a>
</div>
```
Visible below 768px viewport width. Links to the booking section within `#home`.

## Design System

**Kept from current pathway.html:**
- Blue/white medical colour scheme (blue-50 through blue-800, sage accents)
- Libre Baskerville (serif headings) + Inter (sans body)
- Self-hosted fonts (GDPR compliance — no Google Fonts CDN)
- CSS custom properties for colours, spacing, shadows
- Responsive breakpoints: 900px (nav), 768px (layout), 480px (single column)
- Reduced motion media query
- Print styles

**New CSS additions:**
- `.evidence-card` — for evidence stories with large diagrams
- `.device-card` — for Wellue/Kardia sections with embedded images
- `.protocol-steps` — for the 6-step palpitation response
- `.daily-practice` — two-column morning/evening layout
- Image styling: `max-width: 100%; border-radius: var(--radius); box-shadow: var(--shadow-sm);`

## Accessibility

- All 7 diagrams get descriptive `alt` text
- Skip-to-content link kept
- `aria-live` region for SPA page changes kept (`<div id="page-announce" aria-live="polite">` — copy from pathway.html line 1076)
- FAQ buttons with `aria-expanded` kept
- Focus management on page change kept
- Keyboard support for all interactive elements
- WCAG AA contrast ratios maintained

## What Is NOT In Scope

- Stripe integration (booking via Cal.com only)
- Patient diary/tracker web app (diary is in the printed booklet)
- Online consent form (consent is in the printed booklet, signed in person)
- Device tracking system
- Patient portal or login
- Changes to privacy-policy.html, terms.html, 404.html, or server config (except Caddyfile `try_files` update noted in File Changes)
