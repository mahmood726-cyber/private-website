# OpenPalp Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the London Cardiology Clinic website as a focused OpenPalp palpitations programme site, incorporating all content and diagrams from the OpenPalp Booklet v4.0.

**Architecture:** Single HTML file with inline CSS and JS, using hash-based SPA routing (carried over from current `pathway.html`). 7 SPA pages: `#home`, `#programme`, `#devices`, `#suitability`, `#evidence`, `#faq`, `#clinicians`. All booklet diagrams served as static PNGs from `/img/`.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla JavaScript, self-hosted Libre Baskerville + Inter fonts, Cal.com embed for booking.

**Spec:** `docs/superpowers/specs/2026-03-19-openpalp-website-design.md`

**Source material:** OpenPalp Booklet v4.0 (`C:\Users\user\Downloads\OpenPalp_Booklet_v4.0.docx`) — content already extracted during brainstorming.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | **Rewrite** (backup old first) | Entire OpenPalp site — HTML structure, inline CSS, inline JS |
| `Caddyfile` | **Modify line 12** | Change `try_files {path} /pathway.html` to `try_files {path} /index.html` |
| `img/openpalp-6.png` through `img/openpalp-12.png` | Already exist | 7 booklet diagrams |
| `pathway.html` | Retired (keep on disk) | No longer served |
| `book.html` | Retired (keep on disk) | No longer served |
| `privacy-policy.html`, `terms.html`, `404.html` | No changes | Keep as-is |

**Note:** The entire site is a single HTML file with inline `<style>` and `<script>` blocks. This matches the existing `pathway.html` architecture. No external CSS or JS files are created.

---

## Task 1: Backup and scaffold

**Files:**
- Backup: `index.html` → `index-old-openpalp-backup.html`
- Create: `index.html` (new, ~empty scaffold)
- Modify: `Caddyfile:12`

- [ ] **Step 1: Backup current index.html**

```bash
cp "index.html" "index-old-openpalp-backup.html"
```

- [ ] **Step 2: Create new index.html with head, fonts, CSS custom properties, and empty body**

Write the `<!DOCTYPE>` through the closing `</style>` tag. This includes:
- `<head>`: charset, viewport, title, SEO meta, Open Graph, canonical, security headers
- Schema.org JSON-LD (MedicalClinic, updated for OpenPalp)
- Self-hosted font `@font-face` declarations (copy from pathway.html lines 40-67)
- CSS custom properties (copy `:root` block from pathway.html lines 75-119)
- CSS reset and base styles (copy from pathway.html lines 121-161)
- Empty `<body>` with skip-to-content link and aria-live region

**SEO metadata** (from spec):
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

**Schema.org JSON-LD** — update from pathway.html with all fields:
- `name`: "OpenPalp by London Cardiology Clinic"
- `description`: "Structured palpitations assessment and improvement programme combining clinic review, ECG monitoring, and a six-week guided lifestyle programme."
- `url`: "https://londoncardiologyclinic.uk/"
- `email`: "drmahmoodclinic@pm.me"
- `address.streetAddress`: "40-44 The Broadway"
- `address.addressLocality`: "Wimbledon, London"
- `address.postalCode`: "SW19 1RQ"
- `address.addressCountry`: "GB"
- `openingHours`: "Fr 17:00-20:00"
- `priceRange`: "£49.99-£99.98"
- `medicalSpecialty`: "Cardiology"
- `availableService`: single entry "OpenPalp Palpitations Programme"
- `employee`: `{ "@type": "Physician", "name": "Dr Mahmood Ahmad", "description": "Specialist in Cardiology (SAS), MRCP(UK), GMC 6071047" }`

**Body scaffold** must include:
```html
<body>
<a href="#main-content" class="sr-only" ...>Skip to main content</a>
<div id="page-announce" class="sr-only" aria-live="polite" aria-atomic="true"></div>
<main id="main-content">
<!-- page sections added in subsequent tasks -->
</main>
</body>
```

**Font paths:** Ensure all `@font-face` `src` URLs use `/fonts/` (absolute from web root), not `../fonts/` (relative). Pathway.html uses `/fonts/` — keep that.

- [ ] **Step 3: Update Caddyfile**

Change line 12 from:
```
try_files {path} /pathway.html
```
to:
```
try_files {path} /index.html
```

- [ ] **Step 4: Verify scaffold loads in browser**

Open `index.html` in a browser. Should see a blank page with no console errors. Check that fonts load (inspect network tab or check `@font-face` URLs resolve — they point to `../fonts/` or `/fonts/`).

- [ ] **Step 5: Commit**

```bash
git add index.html index-old-openpalp-backup.html Caddyfile
git commit -m "scaffold: backup old site, create OpenPalp index.html shell with SEO and fonts"
```

---

## Task 2: Navigation + CSS component styles

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add navigation CSS**

Copy navigation styles from pathway.html lines 163-257 (`.nav`, `.nav-inner`, `.nav-logo`, `.nav-links`, `.nav-hamburger`, mobile breakpoint). Update:
- `.nav-logo em` colour: keep `var(--blue-600)`

- [ ] **Step 2: Add all shared CSS component styles**

Copy from pathway.html and add to the `<style>` block. These sections:
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary` (lines 293-324)
- Sections: `.section`, `.section-alt`, `.section-blue`, `.section-header`, `.section-eyebrow` (lines 326-355)
- Steps grid: `.steps-grid`, `.step-card`, `.step-number` (lines 357-393)
- Timeline: `.timeline`, `.timeline-item`, `.timeline-dot`, `.timeline-week` (lines 395-445)
- Cards grid: `.cards-grid`, `.info-card`, `.info-card-icon` (lines 447-476)
- Pricing: `.pricing-row`, `.price-card`, `.price-amount`, `.price-per`, `.price-features`, `.price-total`, `.price-total-box` (lines 478-570)
- Suitability: `.suit-grid`, `.suit-card`, `.suit-yes`, `.suit-no`, `.suit-maybe`, `.suit-list` (lines 572-624)
- Programme: `.prog-grid`, `.prog-card` (lines 626-644)
- FAQ: `.faq-list`, `.faq-item`, `.faq-q`, `.faq-a` (lines 646-699)
- Callout: `.callout`, `.callout-urgent` (lines 701-716)
- Governance list: `.governance-list` (lines 718-744)
- Safety banner: `.safety-banner` (lines 746-763)
- Footer: `.site-footer`, `.footer-inner`, `.footer-brand`, `.footer-links`, `.footer-bottom` (lines 765-817)
- SPA pages: `.page-section { display: none }`, `.page-section.active { display: block }` (lines 819-821)
- Animations: `@keyframes fadeUp`, `.fade-up` (lines 823-838)
- Responsive: mobile breakpoints (lines 840-882)
- Reduced motion: `@media (prefers-reduced-motion)` (lines 884-887)
- ECG animation: `.ecg-bg`, `.ecg-line`, `@keyframes ecg-draw` (lines 889-914)
- Compare grid: `.compare-grid`, `.compare-card` (lines 1009-1054)
- Print: `@media print` (lines 1067-1071)
- Sticky mobile CTA: `.sticky-cta-mobile` (lines 841-864)

- [ ] **Step 3: Add NEW CSS classes for OpenPalp-specific content**

```css
/* ── Evidence cards ── */
.evidence-card {
  background: var(--white);
  border: 1px solid var(--light-grey);
  border-radius: var(--radius);
  padding: 40px 32px;
  margin-bottom: 32px;
}
.evidence-card h3 { margin-bottom: 12px; }
.evidence-card p { color: var(--dark-grey); font-size: 15px; line-height: 1.7; }
.evidence-card blockquote {
  border-left: 4px solid var(--blue-400);
  padding-left: 20px;
  margin: 20px 0;
  font-style: italic;
  color: var(--dark-grey);
}
.evidence-stat {
  background: var(--blue-50);
  border-radius: var(--radius);
  padding: 24px 28px;
  text-align: center;
  margin: 20px 0;
}
.evidence-stat .stat-number {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 700;
  color: var(--blue-700);
}
.evidence-stat .stat-label {
  font-size: 14px;
  color: var(--dark-grey);
  margin-top: 4px;
}

/* ── Device cards ── */
.device-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 28px;
  max-width: var(--max-w);
  margin: 0 auto;
}
.device-card {
  background: var(--white);
  border: 1px solid var(--light-grey);
  border-radius: var(--radius);
  padding: 36px 32px;
}
.device-card h3 { margin-bottom: 8px; }
.device-card p { color: var(--dark-grey); font-size: 15px; line-height: 1.7; }
.device-card img {
  width: 100%;
  max-width: 100%;
  border-radius: var(--radius-sm);
  margin: 20px 0;
  box-shadow: var(--shadow-sm);
}
.device-card .setup-steps {
  list-style: none;
  margin-top: 16px;
}
.device-card .setup-steps li {
  padding: 6px 0;
  padding-left: 28px;
  position: relative;
  font-size: 14px;
  color: var(--dark-grey);
}
.device-card .setup-steps li::before {
  content: attr(data-step);
  position: absolute;
  left: 0;
  top: 6px;
  width: 20px;
  height: 20px;
  background: var(--blue-50);
  color: var(--blue-600);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Protocol steps (when you feel palpitations) ── */
.protocol-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  max-width: var(--max-w);
  margin: 0 auto;
}
.protocol-step {
  background: var(--white);
  border: 1px solid var(--light-grey);
  border-radius: var(--radius);
  padding: 24px 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.protocol-step .step-num {
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: var(--blue-50);
  color: var(--blue-600);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 16px;
}
.protocol-step h4 { font-size: 16px; margin-bottom: 4px; }
.protocol-step p { font-size: 14px; color: var(--dark-grey); line-height: 1.5; }

/* ── Daily practice two-column ── */
.daily-practice {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: var(--max-w-narrow);
  margin: 32px auto 0;
}
.daily-col {
  background: var(--white);
  border: 1px solid var(--light-grey);
  border-radius: var(--radius);
  padding: 28px 24px;
}
.daily-col h4 { margin-bottom: 12px; font-size: 16px; }
.daily-col ol {
  list-style: decimal;
  padding-left: 20px;
  font-size: 14px;
  color: var(--dark-grey);
}
.daily-col ol li { padding: 4px 0; line-height: 1.6; }
@media (max-width: 600px) {
  .daily-practice { grid-template-columns: 1fr; }
  .device-cards { grid-template-columns: 1fr; }
}

/* ── Booklet images ── */
.booklet-img {
  display: block;
  max-width: 100%;
  margin: 28px auto;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}
.booklet-img-wide { max-width: 850px; }
.booklet-img-medium { max-width: 750px; }
```

- [ ] **Step 4: Write navigation HTML**

```html
<nav class="nav" aria-label="Main navigation">
  <div class="nav-inner">
    <a href="#home" class="nav-logo" aria-label="OpenPalp home">
      OpenPalp <em>by London Cardiology Clinic</em>
    </a>
    <button class="nav-hamburger" aria-label="Toggle menu" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <ul class="nav-links">
      <li><a href="#home" data-page="home">Home</a></li>
      <li><a href="#programme" data-page="programme">The Programme</a></li>
      <li><a href="#devices" data-page="devices">Your Devices</a></li>
      <li><a href="#suitability" data-page="suitability">Is This Right for You?</a></li>
      <li><a href="#evidence" data-page="evidence">The Evidence</a></li>
      <li><a href="#faq" data-page="faq">FAQ</a></li>
      <li><a href="#clinicians" data-page="clinicians">For Clinicians</a></li>
      <li><a href="#home" class="nav-cta" data-page="home">Book</a></li>
    </ul>
  </div>
</nav>
```

- [ ] **Step 5: Verify nav renders correctly**

Open in browser. Nav should be sticky, logo on left, links on right, "Book" pill button. At <900px, hamburger should appear and links should hide.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add navigation and all CSS component styles for OpenPalp"
```

---

## Task 3: #home page — hero, introduction, attention loop, journey

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #home page section with hero**

Inside `<main id="main-content">`, add:

```html
<div id="home" class="page-section active">
  <!-- Hero with animated ECG background -->
  <section class="hero">
    <!-- Copy ECG SVG from pathway.html lines 1111-1114 verbatim -->
    <svg class="ecg-bg" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
      <!-- 3 ecg-line paths -->
    </svg>
    <div class="container">
      <p class="hero-eyebrow fade-up">OpenPalp — Your Personal Heart Rhythm Programme</p>
      <p class="fade-up" style="font-family:var(--font-serif);font-size:20px;font-style:italic;color:var(--dark-grey);margin-bottom:12px;">
        Experiencing skipped beats, fluttering, or a racing heart?
      </p>
      <h1 class="fade-up fade-up-d1">30 days of monitoring.<br>6 weeks of understanding.</h1>
      <p class="hero-sub fade-up fade-up-d2">
        A structured programme combining clinic assessment, ECG monitoring with two devices,
        and a guided lifestyle programme. Friday evenings in Wimbledon &mdash; no time off work.
      </p>
      <div class="hero-ctas fade-up fade-up-d3">
        <a href="#pricing-section" class="btn btn-primary">Book Your &pound;49.99 Heart Check</a>
        <a href="#suitability" class="btn btn-secondary" data-page="suitability">See if this is right for you</a>
      </div>
    </div>
  </section>
</div>
```

- [ ] **Step 2: Add "You are not alone" section**

After the hero, still inside `#home`:

```html
<section class="section">
  <div class="container">
    <div class="section-header">
      <p class="section-eyebrow">You are not alone</p>
      <h2>Many palpitations are distressing but not dangerous</h2>
    </div>
    <div class="container-narrow">
      <p style="font-size:17px;color:var(--dark-grey);margin-bottom:20px;">
        If you are reading this, you have probably spent time worrying about your heart &mdash;
        perhaps lying awake, perhaps checking your pulse repeatedly, perhaps avoiding things
        you used to enjoy. You are not imagining your symptoms. And you are not alone.
      </p>
      <p style="font-size:17px;color:var(--dark-grey);margin-bottom:20px;">
        Your heart beats about 100,000 times every day. Palpitations happen when something
        makes those beats noticeable &mdash; an extra beat, a brief change in rhythm, or a
        heightened sensitivity to normal variation.
      </p>
      <h3 style="margin:28px 0 14px;">Common triggers</h3>
      <ul style="padding-left:20px;color:var(--dark-grey);font-size:15px;line-height:1.8;">
        <li>Caffeine &mdash; coffee, tea, cola, energy drinks</li>
        <li>Poor sleep &mdash; even one disturbed night increases sensitivity</li>
        <li>Stress and anxiety &mdash; activates the nervous system directly</li>
        <li>Alcohol &mdash; particularly the morning after drinking</li>
        <li>Dehydration &mdash; reduces blood volume and raises heart rate</li>
        <li>Hormonal changes &mdash; menstrual cycle, thyroid, perimenopause</li>
      </ul>
      <p style="font-size:15px;color:var(--dark-grey);margin-top:20px;font-style:italic;">
        You will find your personal triggers through this programme. Most people are surprised
        by what they discover.
      </p>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add attention loop diagram and 6-week journey visual**

```html
<!-- Attention loop -->
<section class="section section-alt">
  <div class="container" style="text-align:center;">
    <div class="section-header">
      <p class="section-eyebrow">The attention loop</p>
      <h2>Why palpitations feel worse the more you notice them</h2>
    </div>
    <img src="/img/openpalp-6.png" alt="Diagram showing the attention loop: heartbeat noticed leads to attention focusing on heart, which finds more beats. The OpenPalp programme breaks this loop." class="booklet-img booklet-img-medium">
    <p style="font-style:italic;color:var(--mid-grey);margin-top:16px;font-size:15px;">
      The more you monitor your heartbeat, the more you find it &mdash; until you learn not to look.
    </p>
  </div>
</section>

<!-- 6-week journey -->
<section class="section">
  <div class="container" style="text-align:center;">
    <div class="section-header">
      <p class="section-eyebrow">Your journey</p>
      <h2>30 days of monitoring. 6 weeks of change.</h2>
      <p>Two things happen at once: your monitoring runs for 30 days, your lifestyle programme runs for 6 weeks.</p>
    </div>
    <img src="/img/openpalp-7.png" alt="6-week journey timeline: Week 1 Listen, Week 2 Breathe, Week 3 Discover, Week 4 Change, Week 5 Move, Week 6 Understand. Monitoring ends after week 4, lifestyle programme continues." class="booklet-img booklet-img-wide">
  </div>
</section>
```

- [ ] **Step 4: Add NHS comparison section**

Copy from pathway.html lines 1237-1257, update price text:
- "Full pathway &pound;99.98" instead of "£100"
- "A typical private cardiology initial consultation costs &pound;200&ndash;&pound;350. Our full pathway &mdash; including monitoring and a six-week programme &mdash; costs &pound;99.98 total."

- [ ] **Step 5: Verify in browser**

Open index.html. Hero should show with ECG animation, "You are not alone" section, both diagrams, and NHS comparison. Check images load from `/img/` paths.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add #home page — hero, introduction, diagrams, NHS comparison"
```

---

## Task 4: #home page — pricing, booking, benefits

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add pricing section**

Inside `#home`, after NHS comparison. Two price cards (reuse `.pricing-row`, `.price-card` CSS):

Clinic Appointment — &pound;49.99:
- Face-to-face assessment
- Symptom and trigger review
- Risk factor assessment
- ECG if clinically indicated
- Suitability confirmation
- Clear explanation and next steps

Monitoring & Programme — &pound;49.99:
- Wellue patch (48-hour continuous recording)
- KardiaMobile 6L (30 days of event recording)
- OpenPalp printed booklet
- 6-week guided programme
- Review of all recordings
- Results appointment and findings letter

Total box: &pound;99.98

Notes:
- &pound;200 pre-authorisation (not a charge) for device loan, released on return
- Device replacement: Wellue &pound;90 / Kardia &pound;70
- Clinic appointment is standalone &mdash; no commitment to full programme

- [ ] **Step 2: Add booking section with Cal.com embed**

```html
<section class="section section-blue" id="pricing-section" style="text-align:center;">
  <div class="container">
    <h2>Ready to take the first step?</h2>
    <p style="color:var(--dark-grey);font-size:17px;max-width:560px;margin:14px auto 8px;">
      Your &pound;49.99 clinic appointment is standalone &mdash; no commitment to the full
      programme. You decide about monitoring after your appointment.
    </p>
    <p style="font-size:14px;color:var(--mid-grey);margin-bottom:24px;">
      40&ndash;44 The Broadway, Wimbledon, London SW19 1RQ &middot; Friday evenings 17:00&ndash;20:00
    </p>
    <div id="cal-embed" aria-label="Appointment booking calendar" style="max-width:700px;margin:0 auto;"></div>
    <p style="font-size:13px;color:var(--mid-grey);margin-top:20px;max-width:500px;margin-left:auto;margin-right:auto;">
      <strong>Cancellation:</strong> More than 48 hours&rsquo; notice: full refund.
      Less than 48 hours or non-attendance: no refund.
    </p>
  </div>
</section>
```

- [ ] **Step 3: Close the #home page-section div**

```html
</div><!-- end #home -->
```

- [ ] **Step 4: Verify pricing and booking section render**

Check two price cards display side-by-side, total box shows, Cal.com embed placeholder visible.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add pricing cards, booking section with Cal.com embed to #home"
```

---

## Task 5: #programme page

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #programme page with timeline**

```html
<div id="programme" class="page-section">
  <section class="section">
    <div class="container">
      <div class="section-header">
        <p class="section-eyebrow">The Programme</p>
        <h2>Six weeks of structured support</h2>
        <p>Each week has one focus. Build on the one before.</p>
      </div>
      <div class="timeline">
        <!-- Week 1-6 timeline items using .timeline-item, .timeline-dot, .timeline-week -->
        <!-- Content from spec lines 174-179 -->
      </div>
    </div>
  </section>
```

Each `.timeline-item` has: `.timeline-dot`, `.timeline-week` (e.g., "WEEK 1"), `h3` (e.g., "Listen"), `p` (description from spec).

- [ ] **Step 2: Add "When you feel palpitations" 6-step protocol**

Use `.protocol-steps` grid with `.protocol-step` cards. 6 steps from spec lines 183-188.

- [ ] **Step 3: Add vagal techniques safety callout**

```html
<div class="callout callout-urgent" style="max-width:var(--max-w-narrow);margin:32px auto 0;">
  <h4>Important note on vagal techniques</h4>
  <p>Not suitable if you have known eye disease or significant heart valve problems.
  If you feel very unwell, do not attempt them. Always sit or lie down first.</p>
</div>
```

- [ ] **Step 4: Add daily practice section**

Two-column `.daily-practice` layout. Morning (4 items) and evening (4 items) from spec lines 196-197.

- [ ] **Step 5: Add HRV callout and lifestyle experiments**

HRV understanding as a `.callout` box. Two experiments (caffeine test, sleep anchor) as `.info-card` cards.

- [ ] **Step 6: Close #programme div, verify in browser**

Navigate to `#programme`. Timeline should render vertically with dots. Protocol steps in grid. Daily practice in two columns. Check all text matches booklet.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add #programme page — 6-week timeline, protocol, daily practice"
```

---

## Task 6: #devices page

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #devices page with two device cards**

```html
<div id="devices" class="page-section">
  <section class="section">
    <div class="container">
      <div class="section-header">
        <p class="section-eyebrow">Your Tools</p>
        <h2>Two devices, one clear picture</h2>
      </div>
      <div class="device-cards">
        <!-- Wellue card with img/openpalp-8.png -->
        <!-- Kardia card with img/openpalp-9.png -->
      </div>
    </div>
  </section>
</div>
```

**Wellue card** content from spec lines 215-221. Include setup steps as `<ol class="setup-steps">` with `data-step` attributes.

**Kardia card** content from spec lines 223-229. Include "Unclassified" note.

- [ ] **Step 2: Add device loan callout**

```html
<div class="callout" style="max-width:var(--max-w-narrow);margin:40px auto 0;">
  <h4>Device loan</h4>
  <p>A &pound;200 pre-authorisation (not a charge) is placed on your card when devices are loaned.
  This is released automatically when both devices are returned.</p>
  <p style="margin-top:8px;">If a device is lost or damaged beyond reasonable wear:
  Wellue replacement &pound;90 / Kardia replacement &pound;70.</p>
</div>
```

- [ ] **Step 3: Verify images load and cards display**

Both device images should render. Cards should be side-by-side on desktop, stacked on mobile.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add #devices page — Wellue and Kardia device cards with diagrams"
```

---

## Task 7: #suitability page

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #suitability page**

Reuse `.suit-grid`, `.suit-card`, `.suit-yes`/`.suit-no`/`.suit-maybe` CSS classes.

Green card: 4 inclusion criteria from spec lines 240-243.
Red card: 10 exclusion criteria from spec lines 246-255.
Amber card: 4 borderline criteria from spec lines 258-262.

Safety banner + escalation callout from spec lines 264-268.

- [ ] **Step 2: Verify suitability cards render**

Green/red/amber cards should display with checkmarks/crosses/circles. Safety banner in red at bottom.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add #suitability page with inclusion/exclusion/borderline criteria"
```

---

## Task 8: #evidence page

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #evidence page with 4 research stories**

```html
<div id="evidence" class="page-section">
  <section class="section">
    <div class="container">
      <div class="section-header">
        <p class="section-eyebrow">The Evidence</p>
        <h2>These are not theories</h2>
        <p>They are findings from real studies involving real people &mdash; people whose
        hearts changed when they changed how they lived.</p>
      </div>
      <div class="container-narrow">
        <!-- 4 evidence cards -->
      </div>
    </div>
  </section>
</div>
```

**Breathing story** (`.evidence-card`):
- `img/openpalp-10.png` + `img/openpalp-11.png`
- Springer Nature 2024, 31 studies, n=1,133
- Quote: "In every group, the heart rhythm changed..."

**Sleep story** (`.evidence-card`):
- `img/openpalp-12.png`
- Miner et al SLEEP 2016 + JACC 2021 (403,187 people)
- Quote: "Your sleep is not separate from your heart rhythm..."

**Movement story** (`.evidence-card` with `.evidence-stat`):
- No diagram, stat callout: "22,516 adults" / "14 years" / "4% more risk per BMI unit"
- Quote: "Every additional unit of BMI added 4% more risk..."

**CAST trial** (`.evidence-card` with blockquote):
- 1989 trial story
- Blockquote: "Extra heartbeats are a signal, not always the problem..."
- "Understanding them — as you are doing — is more powerful than any drug designed to suppress them."

- [ ] **Step 2: Verify all 3 images load, evidence cards render**

Check breathing story shows two images, sleep story shows one, movement and CAST have no images.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add #evidence page — 4 research stories with booklet diagrams"
```

---

## Task 9: #faq page

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #faq page with accordion**

11 FAQ items from spec lines 306-316. Use `.faq-list`, `.faq-item`, `.faq-q` (button), `.faq-a` (collapsible div) pattern from current pathway.html.

Each button needs `aria-expanded="false"` and `aria-controls` pointing to its answer div's `id`.

- [ ] **Step 2: Verify accordion opens/closes**

(Will work once JS is added in Task 11. For now, verify HTML structure.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add #faq page with 11 updated questions"
```

---

## Task 10: #clinicians page + footer + mobile CTA

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write #clinicians page**

Copy structure from pathway.html lines 1763-1847. Apply updates from spec:
- Keep verbatim: clinician banner, credentials, transparency statement, communication, referral callout
- Update: programme name (OpenPalp), monitoring protocol (Wellue + Kardia), 6-week structure, inclusion/exclusion
- Remove: references to general conditions, stepped monitoring
- Add: governance items migrated from old #safety page (spec lines 339-346)

- [ ] **Step 2: Write footer**

```html
<footer class="site-footer">
  <div class="footer-inner">
    <div>
      <p class="footer-brand">OpenPalp <em>by London Cardiology Clinic</em></p>
      <p style="margin-top:8px;">40&ndash;44 The Broadway, Wimbledon<br>London SW19 1RQ</p>
      <p style="margin-top:8px;"><a href="mailto:drmahmoodclinic@pm.me">drmahmoodclinic@pm.me</a></p>
    </div>
    <div>
      <h5>Pathway</h5>
      <ul class="footer-links">
        <li><a href="#programme" data-page="programme">The Programme</a></li>
        <li><a href="#devices" data-page="devices">Your Devices</a></li>
        <li><a href="#suitability" data-page="suitability">Suitability</a></li>
        <li><a href="#evidence" data-page="evidence">The Evidence</a></li>
      </ul>
    </div>
    <div>
      <h5>Information</h5>
      <ul class="footer-links">
        <li><a href="#faq" data-page="faq">FAQ</a></li>
        <li><a href="#clinicians" data-page="clinicians">For Clinicians</a></li>
        <li><a href="/privacy-policy.html">Privacy Policy</a></li>
        <li><a href="/terms.html">Terms</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p>Dr Mahmood Ahmad &mdash; Specialist in Cardiology (SAS), MRCP(UK) &mdash; GMC <a href="https://www.gmc-uk.org/doctors/6071047" target="_blank" rel="noopener">6071047</a>. Career pathway different from the NHS consultant training route &mdash; does not hold a CCT or Specialist Register listing.</p>
    <p>This service is for selected low-risk patients only. Not an emergency service. If you have chest pain, fainting, or severe breathlessness, call 999.</p>
    <p>OpenPalp Pathway v1.0</p>
  </div>
</footer>
```

- [ ] **Step 3: Add mobile sticky CTA**

```html
<div class="sticky-cta-mobile" aria-hidden="true">
  <a href="#home">Book Your &pound;49.99 Heart Check</a>
</div>
```

- [ ] **Step 4: Close `</main>` tag before footer**

- [ ] **Step 5: Verify footer and clinicians page render**

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add #clinicians page, footer, and mobile sticky CTA"
```

---

## Task 11: JavaScript — SPA routing, FAQ accordion, Cal.com embed

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add SPA routing JavaScript**

Copy from pathway.html lines 1890-1958. This handles:
- `showPage(pageId)` — toggles `.active` on page sections, updates nav, scrolls to top
- Click handlers on `[data-page]` links
- Hash navigation + popstate handler
- Mobile hamburger toggle (add `onclick` to the hamburger button)

- [ ] **Step 2: Add FAQ accordion JavaScript**

Copy from pathway.html lines 1960-1978. Handles `.faq-q` click toggling.

- [ ] **Step 3: Add scroll-triggered fade-in observer**

Copy from pathway.html lines 1980-1993. Observes `.step-card`, `.info-card`, `.price-card`, `.prog-card`, `.timeline-item`, `.evidence-card`, `.device-card`, `.protocol-step`.

- [ ] **Step 4: Add Cal.com embed script**

```html
<script>
(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://booking.londoncardiologyclinic.uk/embed/embed.js", "init");
Cal("init", { origin: "https://booking.londoncardiologyclinic.uk" });
Cal("inline", {
  elementOrSelector: "#cal-embed",
  calLink: "USERNAME/cardiology-consultation",
  config: {
    theme: "light",
    styles: { branding: { brandColor: "#4d7a65" } }
  }
});
</script>
```

- [ ] **Step 5: Test all interactions**

1. Click each nav link — correct page should show
2. Click FAQ questions — accordion should open/close
3. Resize to mobile — hamburger should work
4. Use browser back/forward — hash navigation should work
5. Check `aria-expanded` toggles on FAQ buttons
6. Check `#page-announce` gets updated text on page change

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add SPA routing, FAQ accordion, Cal.com embed, scroll animations"
```

---

## Task 12: Final verification and div balance check

**Files:**
- Verify: `index.html`

- [ ] **Step 1: Count div balance**

```bash
grep -c '<div' index.html
grep -c '</div>' index.html
```

Counts must match. If they don't, find and fix the imbalance. **Note:** If counts differ, check whether `<div` appears inside `<script>` blocks (e.g., in regex patterns or string literals) and exclude those from the count.

- [ ] **Step 2: Check for literal `</script>` inside script blocks**

```bash
grep -n '</script>' index.html
```

Every match should be a closing tag for a `<script>` block, never inside a template literal or comment.

- [ ] **Step 3: Check all 7 images load**

Open in browser, navigate to each page that has images:
- `#home`: openpalp-6.png (attention loop), openpalp-7.png (journey)
- `#devices`: openpalp-8.png (Wellue), openpalp-9.png (Kardia)
- `#evidence`: openpalp-10.png (breathing), openpalp-11.png (vagus), openpalp-12.png (sleep)

All should render. Check browser console for 404 errors.

- [ ] **Step 4: Test all SPA pages load**

Click through every nav link: Home, The Programme, Your Devices, Is This Right for You?, The Evidence, FAQ, For Clinicians. Each should show content with no broken layout.

- [ ] **Step 5: Test mobile responsive**

Resize browser to 375px width. Check:
- Hamburger menu works
- Sticky CTA visible at bottom
- Device cards stack vertically
- Daily practice columns stack
- Protocol steps stack
- All text readable, no horizontal overflow

- [ ] **Step 6: Test reduced motion**

In browser DevTools, enable "prefers-reduced-motion: reduce". Verify no animations play.

- [ ] **Step 7: Accessibility check**

- Tab through the page — all interactive elements should be focusable
- FAQ buttons should announce expanded/collapsed state
- All images should have alt text
- Skip-to-content link should work

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "verify: div balance, image loading, responsive, accessibility checks pass"
```

---

## Summary

| Task | What it builds | Estimated size |
|------|---------------|----------------|
| 1 | Scaffold + backup + Caddyfile | ~100 lines |
| 2 | Nav + all CSS | ~500 lines CSS |
| 3 | #home hero + intro + diagrams | ~150 lines HTML |
| 4 | #home pricing + booking | ~100 lines HTML |
| 5 | #programme (timeline, protocol, daily practice) | ~200 lines HTML |
| 6 | #devices (Wellue + Kardia cards) | ~120 lines HTML |
| 7 | #suitability (inclusion/exclusion) | ~100 lines HTML |
| 8 | #evidence (4 research stories) | ~150 lines HTML |
| 9 | #faq (11 questions) | ~120 lines HTML |
| 10 | #clinicians + footer + mobile CTA | ~200 lines HTML |
| 11 | JavaScript (SPA + FAQ + Cal.com) | ~150 lines JS |
| 12 | Verification | 0 new lines |

**Total estimated:** ~1,900 lines (vs current pathway.html's 2,046 lines)
