# London Cardiology Clinic Website — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional, WCAG AA-compliant private cardiology clinic website with Cal.com booking integration, hosted on a Digital Ocean droplet.

**Architecture:** Single-page static HTML site served by Nginx on a Digital Ocean droplet with Let's Encrypt SSL. Cal.com (cloud, free plan) provides the booking calendar embedded inline via JavaScript. Stripe handles payments through Cal.com's Stripe app. All fonts self-hosted. Cloudflare for CDN/DNS.

**Tech Stack:** HTML5, CSS3, JavaScript (vanilla), Three.js (spider diagram), Nginx, Let's Encrypt, Cal.com embed API, Stripe (via Cal.com)

**Spec:** `docs/superpowers/specs/2026-03-16-london-cardiology-clinic-design.md`

---

## File Structure

```
clinic-site/
  index.html              — Main single-page site (all sections + Cal.com embed)
  privacy-policy.html     — UK GDPR privacy policy (health data, Art 9)
  terms.html              — Terms of service + complaints procedure
  404.html                — Branded 404 page
  CNAME                   — Custom domain config
  fonts/
    libre-baskerville-regular.woff2
    libre-baskerville-italic.woff2
    libre-baskerville-bold.woff2
    inter-variable.woff2
  css/
    style.css             — All styles (palette, layout, responsive, a11y)
  js/
    spider-diagram.js     — Three.js heart-shaped spider diagram
    main.js               — Smooth scroll, nav behaviour, Cal.com init
  nginx/
    clinic.conf           — Nginx server block (SSL, headers, caching)
```

---

## Chunk 1: Foundation (HTML + CSS + Fonts)

### Task 1: Initialise project and download self-hosted fonts

**Files:**
- Create: `clinic-site/fonts/` (4 WOFF2 files)
- Create: `clinic-site/css/style.css` (font-face declarations)

- [ ] **Step 1: Create project directory structure**

```bash
mkdir -p clinic-site/{fonts,css,js,nginx}
```

- [ ] **Step 2: Download self-hosted fonts**

Download Libre Baskerville (regular, italic, bold) and Inter (variable) as WOFF2 from Google Fonts API:

```bash
cd clinic-site/fonts
curl -o libre-baskerville-regular.woff2 "https://fonts.gstatic.com/s/librebaskerville/v16/kmKnZrc3Hgbbcjq75U4uslyuy4kqaRIhHDAI.woff2"
curl -o libre-baskerville-italic.woff2 "https://fonts.gstatic.com/s/librebaskerville/v16/kmKhZrc3Hgbbcjq75U4uslyuy4kqaCRSERkNBiIA.woff2"
curl -o libre-baskerville-bold.woff2 "https://fonts.gstatic.com/s/librebaskerville/v16/kmKiZrc3Hgbbcjq75U4uslyuy4kqaCZB_YtyeRpM.woff2"
curl -o inter-variable.woff2 "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ90Rmkw.woff2"
```

- [ ] **Step 3: Create CSS with @font-face declarations**

Create `css/style.css` with font-face rules, CSS custom properties (palette from spec), reset, and skip-link styles.

- [ ] **Step 4: Verify fonts load**

Open index.html in browser, confirm Baskerville headings and Inter body text render correctly with no Google Fonts requests in Network tab.

- [ ] **Step 5: Commit**

```bash
git init && git add . && git commit -m "feat: initialise project with self-hosted fonts and CSS palette"
```

---

### Task 2: Build index.html — structure and safety strip

**Files:**
- Create: `clinic-site/index.html`

- [ ] **Step 1: Create HTML boilerplate**

DOCTYPE, `lang="en-GB"`, charset, viewport, CSP meta tag (temporary — will move to Nginx headers), link to `css/style.css`. Include skip link as first body element.

- [ ] **Step 2: Add safety strip**

`role="alert"` div at top of page with full exclusion list (under 18, congenital, heart failure, devices, pregnancy, chest pain, syncope). Call 999 messaging. Danger-red (#9e3333) for emphasis.

- [ ] **Step 3: Add navigation**

Sticky nav with `aria-label="Main navigation"`. Logo: "London *Cardiology* Clinic". Links: About, Conditions, What to Expect, Fees, Contact. Book Appointment CTA button. All links use `#section-id` anchors.

- [ ] **Step 4: Add `<main>` landmark**

Wrap all content sections in `<main id="main">`.

- [ ] **Step 5: Verify in browser**

Check: safety strip visible at top, nav is sticky, skip link appears on Tab.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat: add HTML structure, safety strip, and navigation"
```

---

### Task 3: Build hero section with placeholder for spider diagram

**Files:**
- Modify: `clinic-site/index.html`
- Modify: `clinic-site/css/style.css`

- [ ] **Step 1: Add hero split-screen HTML**

Left side: eyebrow (aria-hidden), h1 "Cardiology care, *close to home*", description paragraph, two CTA buttons (Book Appointment + View Conditions).

Right side: `<div id="spider-container">` placeholder (Three.js will render here in Task 7).

- [ ] **Step 2: Add hero CSS**

Grid `1fr 1fr`, min-height 85vh. Left: ivory bg, 80px 64px padding. Right: sage gradient background. Responsive: stack at 900px.

- [ ] **Step 3: Add button styles**

`.btn-primary` (sage-btn #4d7a65, white text), `.btn-secondary` (outline, sage-deep text). Hover states, focus-visible outlines.

- [ ] **Step 4: Verify**

Check: hero fills viewport, buttons are AA contrast compliant, responsive stacking works.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat: add hero section with CTA buttons"
```

---

### Task 4: Build services strip, about section, facilities

**Files:**
- Modify: `clinic-site/index.html`
- Modify: `clinic-site/css/style.css`

- [ ] **Step 1: Add services strip HTML**

5 x `<a>` elements in a grid. Each has icon, `<h3>` title, `<p>` description. Conditions: Palpitations, ECG Review, Blood Pressure, Breathlessness, Heart Murmurs. All link to `#about`.

- [ ] **Step 2: Add about/clinician section HTML**

Split grid. Left: h2, two paragraphs about the clinic, credential badges (GMC Registered, MRCP UK, Fully Insured), disclosure paragraph (Specialist in Cardiology, GMC 6071047, no CCT, not consultant, Royal Free + Barnet, not affiliated disclaimer).

Right: decorative ECG SVG animation with `aria-hidden="true"`.

- [ ] **Step 3: Add facilities section HTML**

h2 "Our facilities". Two-column grid: "What we offer" (12-lead ECG + clinical assessment) and "What we do not offer" (echo, Holter, ABP, CT, MRI, stress testing — with referral promise).

- [ ] **Step 4: Add CSS for all three sections**

Services grid (5-col, responsive to 2-col at 900px, 1-col at 480px). About section grid. Facilities grid. All text at minimum 14px for body. ECG animation with `prefers-reduced-motion` guard.

- [ ] **Step 5: Verify**

Check: heading hierarchy (h1→h2→h3, no skips), all text AA contrast, responsive layout, ECG animation respects reduced-motion.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat: add services, about/clinician, and facilities sections"
```

---

### Task 5: Build timeline, booking CTA, and footer

**Files:**
- Modify: `clinic-site/index.html`
- Modify: `clinic-site/css/style.css`

- [ ] **Step 1: Add "What to Expect" timeline HTML**

Semantic `<ol>` with 4 `<li>` steps: Prepare, Book & Pay, Consultation, Follow Up. Step numbers in styled circles. "With your consent" on GP report.

- [ ] **Step 2: Add booking CTA section HTML**

h2 "Ready to *get checked?*", price £49.99 (font-weight:400), price note, appointment details, Book button, cancellation policy text, `<div id="cal-embed">` placeholder for Cal.com inline embed.

- [ ] **Step 3: Add footer HTML**

4-column grid: clinic details (address, hours, start date), conditions links, information links (About, Fees, Privacy Policy, Terms, Complaints), contact (drmahmoodclinic@pm.me, emergency note, escalation protocol).

Footer headings as `<h3>`. Links with `aria-label` for disambiguation. External links with `rel="noopener noreferrer"`.

- [ ] **Step 4: Add CSS for timeline, CTA, footer**

Timeline with connecting line, responsive (vertical on mobile). CTA section with sage-bg. Footer with charcoal bg, link opacity 0.65 (AA compliant). All responsive breakpoints.

- [ ] **Step 5: Verify full page**

Scroll through entire page. Check: all sections present, all links work (anchors), all text legible, responsive at 900px and 480px, keyboard navigation through entire page with visible focus.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat: add timeline, booking CTA, and footer"
```

---

## Chunk 2: Three.js Spider Diagram + Interactive Features

### Task 6: Build Three.js heart-shaped spider diagram

**Files:**
- Create: `clinic-site/js/spider-diagram.js`
- Modify: `clinic-site/index.html` (add Three.js CDN + script tag)

- [ ] **Step 1: Add Three.js CDN to index.html**

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
<script src="js/spider-diagram.js" defer></script>
```

Update CSP to allow `cdnjs.cloudflare.com`.

- [ ] **Step 2: Create spider-diagram.js — scene setup**

Initialise Three.js scene, camera (orthographic), renderer. Mount to `#spider-container`. Handle resize. Set transparent background so the sage gradient shows through.

- [ ] **Step 3: Create heart-shaped wireframe**

Use THREE.Shape to draw heart path (same bezier curves as the SVG mockup). Create 3 concentric heart outlines at different scales (0.6, 0.8, 1.0) using THREE.Line with semi-transparent white material.

- [ ] **Step 4: Add axis lines and condition points**

6 lines from centre to each condition position on the heart outline. 5 condition points as THREE.Mesh spheres (white, subtle glow). Remove the 6th point (chest pain — removed from spec).

- [ ] **Step 5: Add text labels**

Use CSS overlay labels positioned with Three.js `project()` to convert 3D→2D coordinates. Labels: Palpitations, Blood Pressure, ECG Interpretation, Breathlessness, Heart Murmurs. Centre label: "What we assess".

- [ ] **Step 6: Add hover interaction**

Raycaster on mousemove. When hovering a condition sphere: enlarge slightly, show tooltip with condition name + brief description. On click: smooth-scroll to that condition in the services strip.

- [ ] **Step 7: Add subtle animation**

Slow rotation on Y axis (0.001 rad/frame). Respect `prefers-reduced-motion` — disable rotation if set. Gentle pulse on condition spheres (scale oscillation).

- [ ] **Step 8: Fallback for no-JS / mobile**

If Three.js fails to load or on small screens (<600px), show the SVG fallback spider diagram from the mockup. Use `<noscript>` + CSS media query.

- [ ] **Step 9: Verify**

Check: diagram renders, hover tooltips work, click scrolls to correct section, responsive fallback works, no console errors.

- [ ] **Step 10: Commit**

```bash
git add . && git commit -m "feat: add Three.js heart-shaped spider diagram with interactions"
```

---

### Task 7: Add smooth scroll and nav behaviour

**Files:**
- Create: `clinic-site/js/main.js`
- Modify: `clinic-site/index.html` (add script tag)

- [ ] **Step 1: Create main.js with smooth scroll**

Intercept all `a[href^="#"]` clicks. Use `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Account for sticky nav height offset.

- [ ] **Step 2: Add active nav link highlighting**

IntersectionObserver on each section. When section enters viewport, add `.active` class to corresponding nav link. Style with bottom border in sage-deep.

- [ ] **Step 3: Add mobile nav toggle**

Hamburger menu button (hidden on desktop, visible <900px). Toggles nav links visibility. Close on link click. `aria-expanded` attribute management.

- [ ] **Step 4: Verify**

Check: smooth scroll works, nav highlights correct section, mobile hamburger works, keyboard accessible.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat: add smooth scroll, nav highlighting, mobile menu"
```

---

## Chunk 3: Cal.com Booking Integration

### Task 8: Set up Cal.com and embed

**Files:**
- Modify: `clinic-site/index.html` (add Cal.com embed script)
- Modify: `clinic-site/js/main.js` (Cal.com init)
- Modify: `clinic-site/css/style.css` (embed container styles)

- [ ] **Step 1: Create Cal.com account and event type**

Manual step (Dr Mahmood):
1. Go to cal.com, sign up
2. Create event type: "Cardiology Consultation"
3. Duration: 30 minutes
4. Set availability: Fridays 17:00-20:00
5. Install Stripe app, connect Stripe account, set price £49.99
6. Set up workflows: booking confirmation email, 48hr reminder email

- [ ] **Step 2: Add Cal.com embed script to index.html**

```html
<!-- Cal.com embed -->
<script>
(function (C, A, L) {
  let p = function (a, ar) { a.q.push(ar); };
  let d = C.document;
  C.Cal = C.Cal || function () {
    let cal = C.Cal; let ar = arguments;
    if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || [];
      d.head.appendChild(d.createElement("script")).src = A;
      cal.loaded = true; }
    if (ar[0] === L) { const api = function () { p(api, arguments); };
      const namespace = ar[1]; api.q = api.q || [];
      if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api;
        p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); }
      else p(cal, ar); return; }
    p(cal, ar);
  };
})(window, "https://app.cal.com/embed/embed.js", "init");

Cal("init", { origin: "https://app.cal.com" });
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

Replace `USERNAME` with Dr Mahmood's Cal.com username.

- [ ] **Step 3: Style the embed container**

```css
#cal-embed {
  width: 100%;
  min-height: 500px;
  margin-top: 32px;
  border-radius: 12px;
  overflow: hidden;
}
```

- [ ] **Step 4: Update CSP to allow Cal.com**

Add `https://app.cal.com` to script-src, frame-src, and connect-src.

- [ ] **Step 5: Verify**

Check: Cal.com calendar renders inline, slot selection works, Stripe payment flow triggers, booking confirmation received.

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "feat: integrate Cal.com inline booking with Stripe payment"
```

---

## Chunk 4: Secondary Pages + SEO

### Task 9: Create privacy policy page

**Files:**
- Create: `clinic-site/privacy-policy.html`

- [ ] **Step 1: Create privacy-policy.html**

Same nav, safety strip, footer as index.html. Content: UK GDPR compliant privacy policy covering:
- Data controller: Dr Mahmood, drmahmoodclinic@pm.me
- Lawful basis: explicit consent (Art 9(2)(a)) for health data
- Categories collected: name, email, phone, payment (via Stripe), health info discussed in consultation
- Data processors: Cal.com (booking), Stripe (payments), Proton Mail (email)
- Retention: booking records 8 years (medical records requirement), payment records per Stripe
- Patient rights: access, rectification, erasure, portability, complaint to ICO
- ICO registration number: [placeholder for Dr Mahmood to add]
- No cookies used (self-hosted fonts, no analytics)

- [ ] **Step 2: Verify**

Check: safety strip present, nav works, all links functional, content is comprehensive.

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add GDPR-compliant privacy policy page"
```

---

### Task 10: Create terms of service + complaints page

**Files:**
- Create: `clinic-site/terms.html`

- [ ] **Step 1: Create terms.html**

Same nav, safety strip, footer. Content covers:
- Scope of service (non-emergency cardiology assessment only)
- What is NOT offered (echo, Holter, CT, MRI, medications)
- Patient eligibility (18+, no congenital, no heart failure, etc.)
- Payment terms (£49.99 via Stripe at time of booking)
- Cancellation: >48hrs full refund, <48hrs no refund, no-show no refund
- Limitation of liability
- Complaints procedure: contact drmahmoodclinic@pm.me, escalation to GMC and Parliamentary/Health Service Ombudsman

- [ ] **Step 2: Verify and commit**

```bash
git add . && git commit -m "feat: add terms of service and complaints procedure"
```

---

### Task 11: Create 404 page + add SEO structured data

**Files:**
- Create: `clinic-site/404.html`
- Modify: `clinic-site/index.html` (add JSON-LD)

- [ ] **Step 1: Create branded 404.html**

Minimal page with clinic branding, "Page not found" message, link back to homepage. Safety strip included.

- [ ] **Step 2: Add Schema.org MedicalClinic JSON-LD to index.html**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  "name": "London Cardiology Clinic",
  "medicalSpecialty": "Cardiology",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "40-44 The Broadway",
    "addressLocality": "London",
    "postalCode": "SW19 1RQ",
    "addressCountry": "GB"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": "Friday",
    "opens": "17:00",
    "closes": "20:00"
  },
  "priceRange": "GBP 49.99",
  "email": "drmahmoodclinic@pm.me",
  "url": "https://drmahmood.org"
}
</script>
```

- [ ] **Step 3: Add meta description and OG tags to index.html**

```html
<meta name="description" content="Private cardiology consultations in Wimbledon, South London. Palpitations, ECG review, blood pressure, and heart rhythm assessment. Friday evenings, GBP 49.99.">
<meta property="og:title" content="London Cardiology Clinic">
<meta property="og:description" content="Private cardiology consultations in Wimbledon. Book online.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://drmahmood.org">
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat: add 404 page, Schema.org structured data, and SEO meta tags"
```

---

## Chunk 5: Server Setup (Digital Ocean + Nginx)

### Task 12: Create Nginx config with security headers

**Files:**
- Create: `clinic-site/nginx/clinic.conf`

- [ ] **Step 1: Write Nginx server block**

```nginx
server {
    listen 443 ssl http2;
    server_name drmahmood.org www.drmahmood.org;

    ssl_certificate /etc/letsencrypt/live/drmahmood.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drmahmood.org/privkey.pem;

    root /var/www/clinic-site;
    index index.html;

    # Security headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://app.cal.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; frame-src https://app.cal.com https://js.stripe.com; connect-src 'self' https://app.cal.com https://api.stripe.com;" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Cache static assets
    location ~* \.(woff2|css|js|png|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Custom 404
    error_page 404 /404.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 80;
    server_name drmahmood.org www.drmahmood.org;
    return 301 https://$server_name$request_uri;
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add Nginx config with security headers and SSL"
```

---

### Task 13: Deploy to Digital Ocean droplet

**Manual steps:**

- [ ] **Step 1: Create droplet**

DigitalOcean → Create Droplet → Ubuntu 24.04, $4/month (Regular, 512MB). Choose London region (LON1). Add SSH key.

- [ ] **Step 2: Install Nginx and Certbot**

```bash
ssh root@DROPLET_IP
apt update && apt install -y nginx certbot python3-certbot-nginx
```

- [ ] **Step 3: Point domain DNS**

In Squarespace domain settings → DNS → Add A record: `@` → `DROPLET_IP`. Add CNAME: `www` → `drmahmood.org`.

Wait for DNS propagation (5-30 min).

- [ ] **Step 4: Get SSL certificate**

```bash
certbot --nginx -d drmahmood.org -d www.drmahmood.org
```

- [ ] **Step 5: Deploy site files**

```bash
rsync -avz clinic-site/ root@DROPLET_IP:/var/www/clinic-site/
cp clinic-site/nginx/clinic.conf /etc/nginx/sites-available/clinic
ln -s /etc/nginx/sites-available/clinic /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

- [ ] **Step 6: Verify live site**

Visit https://drmahmood.org. Check: SSL valid, all sections load, Cal.com embed works, security headers present (check via securityheaders.com).

- [ ] **Step 7: Final commit**

```bash
git add . && git commit -m "chore: deployment complete — site live at drmahmood.org"
```

---

## Summary

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-5 | Foundation: fonts, HTML structure, all page sections |
| 2 | 6-7 | Three.js spider diagram + interactive JS |
| 3 | 8 | Cal.com booking embed + Stripe |
| 4 | 9-11 | Privacy policy, terms, 404, SEO |
| 5 | 12-13 | Nginx config + Digital Ocean deployment |

**Prerequisites for Dr Mahmood before Task 8:**
1. Create Cal.com account
2. Create Stripe account (or use existing)
3. Connect Stripe to Cal.com
4. Provide Cal.com username for embed code
