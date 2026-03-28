# SEO Landing Pages + Blog Articles — Design Spec

**Date**: 2026-03-19
**Status**: Draft
**Scope**: Create 3 SEO landing pages + 5 educational blog articles + shared CSS + blog index

## Summary

Add 9 static HTML pages to the OpenPalp website for search engine indexing and organic traffic. These are standalone pages (not part of the SPA) sharing the same design system. Content uses Quranic storytelling techniques (secular) — leading with lessons, direct address, real cases as parables, rhetorical questions, and hope after hardship.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Static HTML pages, not SPA | Google needs separate indexable URLs |
| CSS | Shared `css/pages.css` | Avoid duplicating 1,100+ lines per page |
| Design | Same nav/footer/fonts/colors as index.html | Consistent brand |
| Content tone | Quranic storytelling (secular) | Empathetic, engaging, leads with purpose |
| Article length | Landing: 700-1000 words; Blog: 500-800 words | Long enough for SEO, short enough to read |
| Caddyfile | No changes needed | Static files served directly |

## Writing Style — Quranic Storytelling Techniques (Secular)

Every article follows these principles:

1. **Lead with the lesson** — state the insight first, then tell the story that proves it. Don't bury the point at the end.
2. **Direct address** — speak to the reader: "Have you ever lain awake...?" "You are not imagining this."
3. **Real cases as parables** — use real studies and anonymised patient experiences as narrative illustrations. Never fabricate data.
4. **Rhetorical questions** — "What would happen if you simply stopped checking your pulse?" Provoke reflection, not anxiety.
5. **Repetition with variation** — revisit the core truth from different angles. Each section reinforces the same message through a new lens.
6. **Hope after hardship** — every article moves from worry to understanding. The arc is always: fear → knowledge → relief → action.
7. **Economy of language** — no filler. Every sentence earns its place. Short paragraphs. White space.
8. **Nature analogies** — the nervous system as a river, the heart as a rhythm that responds to life. Ground abstract medical concepts in tangible imagery.
9. **The turning point** — build to a moment where the reader's understanding shifts. This is the emotional centre of the article.
10. **The reader as participant** — "You are already doing the hardest part." The reader is not passive — they are on a journey.

**Tone:** Warm, calm, authoritative. Like a wise clinician speaking to you across a desk. Never patronising. Never cold. Never salesy.

**Evidence:** All medical claims cite real studies. No fabricated statistics or cases. Hedge appropriately ("studies suggest", "in many patients") but don't hedge so much that the message is lost.

## File Structure

```
css/pages.css                                    — shared stylesheet
palpitations.html                                — SEO landing page
heart-monitoring.html                            — SEO landing page
ecg-wimbledon.html                               — SEO landing page
articles/index.html                              — blog listing page
articles/what-are-ectopic-beats.html             — blog article
articles/palpitations-at-night.html              — blog article
articles/caffeine-and-heart-rhythm.html          — blog article
articles/breathing-exercises-for-palpitations.html — blog article
articles/when-to-worry-about-palpitations.html   — blog article
```

## Shared CSS (`css/pages.css`)

**IMPORTANT:** `pages.css` is a NEW file extracted from `index.html`'s inline `<style>` block. Do NOT import or extend `css/style.css`, which belongs to the old general-cardiology design and uses different variables/classes.

**Font paths** in `@font-face` declarations must use `/fonts/...` (absolute from web root) since the CSS file is at `/css/pages.css` and pages exist at multiple URL depths.

**Heading font-family:** The base styles must include `h1, h2, h3, h4 { font-family: var(--font-serif); }` to match the main site.

Extract from `index.html`'s inline `<style>`:
- Font-face declarations (Libre Baskerville + Inter, `/fonts/` paths — absolute)
- CSS custom properties (`:root` block — all color/spacing/radius/transition vars)
- Reset and base styles (box-sizing, html, body, headings with `font-family: var(--font-serif)`, links)
- Nav styles (`.nav`, `.nav-inner`, `.nav-logo`, `.nav-links`, `.nav-hamburger`, mobile)
- Button styles (`.btn`, `.btn-primary`, `.btn-secondary`)
- Footer styles (`.site-footer`, `.footer-inner`, `.footer-brand`, `.footer-links`, `.footer-bottom`)
- Safety banner styles
- Utility (`.sr-only`, `.container`, `.container-narrow`)
- Reduced motion media query

New additions:
```css
/* ── Article layout ── */
.article-hero {
  background: linear-gradient(175deg, var(--blue-50) 0%, var(--warm-white) 60%, var(--white) 100%);
  padding: 80px 24px 48px;
  text-align: center;
}

.article-hero h1 {
  font-size: clamp(28px, 4vw, 40px);
  margin-bottom: 12px;
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
}

.article-meta {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--mid-grey);
  margin-bottom: 32px;
}

.article-content {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.article-content h2 {
  font-size: clamp(22px, 3vw, 28px);
  margin: 40px 0 16px;
}

.article-content h3 {
  font-size: 20px;
  margin: 32px 0 12px;
}

.article-content p {
  font-size: 16px;
  line-height: 1.8;
  color: var(--dark-grey);
  margin-bottom: 20px;
}

.article-content blockquote {
  border-left: 4px solid var(--blue-400);
  padding: 16px 24px;
  margin: 28px 0;
  background: var(--blue-50);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-style: italic;
  color: var(--dark-grey);
}

.article-content ul, .article-content ol {
  padding-left: 24px;
  margin-bottom: 20px;
}

.article-content li {
  font-size: 15px;
  line-height: 1.7;
  color: var(--dark-grey);
  margin-bottom: 8px;
}

.article-cta {
  background: var(--blue-50);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius);
  padding: 32px;
  text-align: center;
  margin: 48px 0 0;
}

.article-cta h3 { margin-bottom: 8px; }
.article-cta p { margin-bottom: 16px; }

/* ── Blog listing ── */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  max-width: var(--max-w, 1120px);
  margin: 0 auto;
}

.blog-card {
  background: var(--white);
  border: 1px solid var(--light-grey);
  border-radius: var(--radius, 12px);
  padding: 28px 24px;
  transition: box-shadow 0.3s, transform 0.3s;
}

.blog-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.blog-card h3 { margin-bottom: 8px; }
.blog-card p { font-size: 14px; color: var(--dark-grey); line-height: 1.6; }
.blog-card .read-more {
  display: inline-block;
  margin-top: 12px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--blue-600);
}

/* ── Related articles ── */
.related-articles {
  border-top: 1px solid var(--light-grey);
  padding-top: 40px;
  margin-top: 48px;
}

.related-articles h3 { margin-bottom: 20px; }
.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .article-hero { padding: 56px 20px 36px; }
  .article-content { padding: 36px 20px 60px; }
}
```

## Page Template

Every page follows this HTML structure:

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[UNIQUE TITLE] — OpenPalp by London Cardiology Clinic</title>
  <meta name="description" content="[UNIQUE 150-160 char description]">
  <link rel="canonical" href="https://londoncardiologyclinic.uk/[path]">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://londoncardiologyclinic.uk/[path]">
  <meta property="og:title" content="[TITLE]">
  <meta property="og:description" content="[DESCRIPTION]">
  <meta property="og:locale" content="en_GB">
  <meta property="og:site_name" content="OpenPalp by London Cardiology Clinic">
  <meta property="og:image" content="https://londoncardiologyclinic.uk/img/openpalp-7.png">
  <meta http-equiv="X-Frame-Options" content="DENY">
  <meta name="robots" content="index, follow">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="stylesheet" href="/css/pages.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage"
    "name": "[TITLE]",
    "description": "[DESCRIPTION]",
    "url": "https://londoncardiologyclinic.uk/[path]",
    "author": {
      "@type": "Physician",
      "name": "Dr Mahmood Ahmad",
      "description": "Specialist in Cardiology (SAS), MRCP(UK), GMC 6071047"
    },
    "publisher": {
      "@type": "MedicalClinic",
      "name": "OpenPalp by London Cardiology Clinic"
    },
    "datePublished": "2026-03-19",
    "dateModified": "2026-03-19"
  }
  </script>
</head>
<body>
  <!-- Safety banner -->
  <div class="safety-banner" role="alert">
    <strong>If you have chest pain, fainting, severe breathlessness, or feel acutely unwell, call 999 immediately.</strong> This is not an emergency service.
  </div>

  <!-- Nav (same as index.html but links point to /index.html#section) -->
  <nav class="nav" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-logo">OpenPalp <em>by London Cardiology Clinic</em></a>
      <button class="nav-hamburger" aria-label="Toggle menu" aria-expanded="false">...</button>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/index.html#programme">The Programme</a></li>
        <li><a href="/index.html#devices">Your Devices</a></li>
        <li><a href="/index.html#suitability">Is This Right for You?</a></li>
        <li><a href="/index.html#evidence">The Evidence</a></li>
        <li><a href="/articles/">Articles</a></li>
        <li><a href="/index.html#clinicians">For Clinicians</a></li>
        <li><a href="/index.html#home" class="nav-cta">Book</a></li>
      </ul>
    </div>
  </nav>

  <main>
    <div class="article-hero">
      <h1>[Title]</h1>
      <p class="article-meta">By Dr Mahmood Ahmad · Updated March 2026</p>
    </div>
    <article class="article-content">
      <!-- Content -->

      <!-- CTA at bottom -->
      <div class="article-cta">
        <h3>Worried about your heart rhythm?</h3>
        <p>The OpenPalp programme combines 30 days of monitoring with a 6-week guided plan. Friday evenings in Wimbledon.</p>
        <a href="/index.html#home" class="btn btn-primary">Book Your &pound;49.99 Assessment</a>
      </div>

      <!-- Related articles -->
      <div class="related-articles">
        <h3>Related reading</h3>
        <div class="related-grid">
          <!-- 2-3 linked article cards -->
        </div>
      </div>
    </article>
  </main>

  <!-- Footer (same as index.html) -->
  <footer class="site-footer">...</footer>

  <!-- Mobile hamburger JS (minimal) -->
  <script>
  document.querySelector('.nav-hamburger').addEventListener('click', function() {
    document.querySelector('.nav-links').classList.toggle('open');
    this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });
  </script>
</body>
</html>
```

## Page Content Outlines

### Landing Page 1: `/palpitations.html`

**Title:** Private Palpitations Assessment in Wimbledon — OpenPalp
**Meta:** Worried about skipped beats or a racing heart? Structured 30-day monitoring and 6-week programme. From £49.99. Friday evenings, Wimbledon SW19.
**Target keywords:** palpitations Wimbledon, private palpitations clinic, heart palpitations assessment London

**Content outline:**
- Opening (Quranic style): "There is something your heart has been trying to tell you." Direct address to the worried reader.
- What palpitations are — 100,000 beats a day, most palpitations are signals not dangers
- The attention loop — brief explanation with link to the main site
- What the OpenPalp programme offers — 3-step summary
- Who this is for / who this is NOT for — brief suitability
- Pricing: £49.99 + £49.99
- CTA: Book your assessment

### Landing Page 2: `/heart-monitoring.html`

**Title:** Heart Rhythm Monitoring — Wellue Patch + KardiaMobile — OpenPalp
**Meta:** 48-hour continuous recording plus 30 days of event monitoring. Catch what a single ECG misses. Part of the OpenPalp programme.
**Target keywords:** heart monitor Wimbledon, ECG monitoring private, Kardia heart monitor UK

**Content outline:**
- Opening: "A single ECG captures ten seconds. Your symptoms happen on their own schedule."
- Why extended monitoring matters — the diagnostic yield problem
- Two devices: Wellue (continuous 48hr) + Kardia (event-based 30 days)
- What the data shows your clinician — real examples of what monitoring reveals
- The sleep study parable — Miner et al., same hearts different sleep
- How monitoring fits within the OpenPalp programme
- CTA

### Landing Page 3: `/ecg-wimbledon.html`

**Title:** ECG and Private Cardiology in Wimbledon SW19 — OpenPalp
**Meta:** Private cardiology assessment in Wimbledon. ECG review, heart rhythm monitoring, and a structured improvement programme. Friday evenings from £49.99.
**Target keywords:** ECG Wimbledon, private cardiology Wimbledon, cardiologist SW19, heart check near me

**Content outline:**
- Opening: "You should not have to wait months to understand your own heart."
- What we offer — focused palpitations assessment (not general cardiology)
- Location: 40-44 The Broadway, Wimbledon SW19 1RQ — 5 minutes from station
- Friday evenings — no time off work
- Your clinician: Dr Mahmood Ahmad
- NHS comparison: 12-18 weeks vs this Friday
- Pricing and booking CTA

### Blog Article 1: `/articles/what-are-ectopic-beats.html`

**Title:** What Are Ectopic Beats? A Cardiologist Explains
**Meta:** Ectopic beats are extra heartbeats that feel like a skip, a thud, or a flutter. Most are harmless. Here is what causes them and when to seek help.
**Target keywords:** what are ectopic beats, ectopic heartbeats, extra heartbeats, PACs PVCs

**Content outline:**
- Opening parable: "Imagine a choir singing in perfect unison. Now imagine one voice comes in a fraction of a second early." That is an ectopic beat.
- What happens electrically — one cell fires before the conductor signals
- The turning point: "Here is what most people do not know: ectopic beats are not extra beats. They are early beats. The heart still beats the same number of times."
- Why you notice them — the compensatory pause (the "thud" is the normal beat after the early one)
- How common they are — almost everyone has them; most never notice
- Triggers (caffeine, sleep, stress, dehydration)
- The CAST trial lesson — suppressing them is not always the answer
- When to seek help (red flags)
- CTA

### Blog Article 2: `/articles/palpitations-at-night.html`

**Title:** Why Do Palpitations Feel Worse at Night?
**Meta:** Palpitations at night are common and usually not dangerous. Here is why your heart feels louder when the world goes quiet — and what you can do.
**Target keywords:** palpitations at night, heart palpitations when lying down, heart racing at night

**Content outline:**
- Opening: "The world is finally quiet. And then you hear it." Direct address to the 2am reader.
- Why night amplifies palpitations — reduced sensory input, vagal tone changes, lying position shifts blood volume
- The attention loop at night — hypervigilance in silence
- The sleep study parable — Miner et al. (PVCs +33% with disrupted sleep)
- The turning point: "Your heart has not changed. The silence has changed what you notice."
- Practical steps: sleep anchor, 4-6 breathing before bed, fixed wake time
- UK Biobank study: 29% lower AF risk with healthy sleep
- CTA

### Blog Article 3: `/articles/caffeine-and-heart-rhythm.html`

**Title:** Caffeine and Your Heart — What the Evidence Says
**Meta:** Does caffeine cause palpitations? The evidence is more nuanced than you think. A cardiologist explains what studies actually show.
**Target keywords:** caffeine palpitations, coffee heart rhythm, does caffeine cause ectopic beats

**Content outline:**
- Opening: "You have probably been told to stop drinking coffee. The truth is more interesting than that."
- The paradox: some studies show caffeine reduces arrhythmia risk
- But: in susceptible individuals, caffeine is the most commonly self-identified trigger (62% in studies)
- The caffeine experiment from the booklet — 7-day elimination, then reintroduce and compare
- The turning point: "Caffeine does not cause palpitations in everyone. But if it causes them in you, you now know."
- Individual variation — genetics, metabolism, tolerance
- Practical guidance: the 2pm cut-off, the experiment, what to replace it with
- CTA

### Blog Article 4: `/articles/breathing-exercises-for-palpitations.html`

**Title:** The 4-6 Breathing Technique for Palpitations
**Meta:** Slow breathing can change your heart rhythm within minutes — not weeks. A cardiologist explains the technique and the evidence behind it.
**Target keywords:** breathing exercises palpitations, vagal manoeuvres palpitations, slow breathing heart, 4-6 breathing technique

**Content outline:**
- Opening: "What if the most powerful thing you could do for your heart took five minutes and cost nothing?"
- The evidence: Springer Nature 2024, 31 studies, 1,133 people — rhythm changed within the same session
- The vagus nerve explained — the body's brake on the heart
- The technique: 4 seconds in, 6 seconds out. Five minutes. Twice a day.
- The turning point: "The exhale is the key. Longer out than in. That ratio activates the nerve. Within minutes."
- Why most people stop too early — the effect compounds over weeks
- Link to the interactive breathing exercise on the main site
- HRV as a feedback measure
- CTA

### Blog Article 5: `/articles/when-to-worry-about-palpitations.html`

**Title:** When Should You Worry About Palpitations?
**Meta:** Most palpitations are harmless. But some need urgent attention. A cardiologist explains the red flags and the reassuring signs.
**Target keywords:** when to worry about palpitations, dangerous palpitations symptoms, palpitations red flags

**Content outline:**
- Opening: "You came here because you are worried. That means you are paying attention. And paying attention is the first step."
- The reassuring truth: most palpitations in otherwise healthy people are benign ectopics
- Signs that suggest LOW risk (brief, self-terminating, no fainting, no chest pain, triggered by stress/caffeine/sleep)
- Red flags that need URGENT attention: syncope, chest pain, sustained >20 min, exertion-triggered, family history of sudden death
- The turning point: "The question is not whether your heart skipped a beat. The question is what your heart does between the skips."
- What a structured assessment can tell you — why monitoring for 30 days beats a single ECG
- The CAST trial lesson — understanding is more powerful than fear
- CTA

### Blog Index: `/articles/index.html`

**Title:** Heart Rhythm Articles — OpenPalp by London Cardiology Clinic
**Meta:** Educational articles about palpitations, heart rhythm, breathing exercises, and when to seek help. Written by Dr Mahmood Ahmad, Specialist in Cardiology.

**Content:**
- Simple heading + brief intro
- Grid of 5 article cards (title, 2-line description, "Read article" link)
- CTA at bottom

## Internal Linking Strategy

Each page links to:
- The main OpenPalp site (`/` or `/index.html#section`) for programme details and booking
- 2-3 related articles at the bottom
- The blog index (`/articles/`) from the nav

The main `index.html` nav should be updated to add an "Articles" link pointing to `/articles/`.

## Consistency Requirements

- **Address:** Always use "40-44 The Broadway, Wimbledon, London SW19 1RQ" (NOT "146 Church Road" which is from the old site)
- **Pricing:** Always £49.99 for clinic appointment, £49.99 for monitoring/programme, £99.98 total
- **Schema.org @type:** Use `MedicalWebPage` for the 3 landing pages and blog index. Use `Article` for the 5 blog articles.
- **Nav divergence:** The existing `privacy-policy.html` and `terms.html` use the old design system — this is accepted. They will be migrated in a future pass.

## What Is NOT In Scope

- RSS feed
- Comments system
- Search functionality
- CMS or dynamic content generation
- Social sharing buttons
- Image/illustration per article (text-only for now)
- Changes to the main index.html SPA (except adding "Articles" nav link)
