# Booking Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cal.com embed with a custom multi-step booking widget wired to the existing Express API, with Stripe payment.

**Architecture:** Inline HTML/CSS/JS booking widget inside the existing `index.html` SPA. Calls `GET /api/slots` and `POST /api/book` on the existing Express backend (port 3001). Caddyfile updated to proxy `/api/*` and `/dashboard*` to Express. Stripe Elements for card input.

**Tech Stack:** HTML5, CSS3, vanilla JS, Stripe.js (CDN), existing Express + SQLite + Stripe backend.

**Spec:** `docs/superpowers/specs/2026-03-19-booking-widget-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | Modify | Replace Cal.com embed with booking widget (CSS + HTML + JS) |
| `server/index.js` | Modify (2 lines) | Update Stripe amount 5000→4999, update description |
| `Caddyfile` | Rewrite | Add API/dashboard reverse proxy, CSP header, remove Cal.com subdomain |

---

## Task 1: Update Caddyfile routing

**Files:**
- Modify: `Caddyfile`

- [ ] **Step 1: Read the current Caddyfile**

Read `Caddyfile` to confirm current state.

- [ ] **Step 2: Rewrite Caddyfile**

Replace the entire `londoncardiologyclinic.uk` block and remove the `booking.londoncardiologyclinic.uk` block:

```caddyfile
synthesis-medicine.org, www.synthesis-medicine.org {
    reverse_proxy 127.0.0.1:8080 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
}

londoncardiologyclinic.uk, www.londoncardiologyclinic.uk {
    # API and dashboard → Express server on port 3001
    handle /api/* {
        reverse_proxy localhost:3001
    }
    handle /dashboard* {
        reverse_proxy localhost:3001
    }

    # Everything else → static files
    handle {
        root * /var/www/clinic-site
        try_files {path} /index.html
        file_server
    }

    header {
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' js.stripe.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' api.stripe.com; frame-src js.stripe.com; object-src 'none'; upgrade-insecure-requests"
    }

    handle_errors {
        rewrite * /404.html
        file_server
    }
}
```

**Key changes:**
- Added `handle /api/*` and `handle /dashboard*` → `reverse_proxy localhost:3001`
- Moved static file serving into a catch-all `handle {}` block
- Added `Content-Security-Policy` header allowing Stripe.js
- Removed `booking.londoncardiologyclinic.uk` block (Cal.com no longer used)

- [ ] **Step 3: Commit**

```bash
git add Caddyfile
git commit -m "feat: add API/dashboard proxy, CSP header, remove Cal.com subdomain"
```

---

## Task 2: Update backend Stripe amount

**Files:**
- Modify: `server/index.js` (2 lines)

- [ ] **Step 1: Update Stripe payment amount**

In `server/index.js`, find the PaymentIntent creation (~line 444):

Change:
```javascript
amount: 5000,
```
to:
```javascript
amount: 4999,
```

- [ ] **Step 2: Update payment description**

In the same block (~line 450), change:
```javascript
description: `London Cardiology Clinic — Tier ${tierNum} booking`,
```
to:
```javascript
description: `OpenPalp — Clinic appointment`,
```

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "fix: update Stripe amount to £49.99 and description to OpenPalp"
```

---

## Task 3: Add booking widget CSS

**Files:**
- Modify: `index.html` (add CSS to existing `<style>` block)

- [ ] **Step 1: Read index.html to find the end of the `<style>` block**

Find the closing `</style>` tag. Add the new CSS just before it.

- [ ] **Step 2: Add booking widget CSS**

Insert before `</style>`:

```css
/* ── Booking widget ── */
.booking-widget { max-width: 600px; margin: 0 auto; }
.booking-step { display: none; }
.booking-step.active { display: block; }

.date-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.date-card {
  background: var(--white);
  border: 1.5px solid var(--light-grey);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.date-card:hover,
.date-card:focus { border-color: var(--blue-400); box-shadow: var(--shadow-sm); outline: none; }
.date-card .date-day {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--charcoal);
}
.date-card .date-month {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--dark-grey);
  margin-top: 2px;
}
.date-card .date-slots {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--mid-grey);
  margin-top: 6px;
}

.time-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.time-btn {
  padding: 12px 24px;
  background: var(--white);
  border: 1.5px solid var(--light-grey);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  color: var(--charcoal);
  cursor: pointer;
  transition: all 0.2s;
}
.time-btn:hover,
.time-btn:focus { border-color: var(--blue-400); background: var(--blue-50); outline: none; }

.booking-form { text-align: left; }

.booking-form .form-group { margin-bottom: 18px; }

.booking-form label {
  display: block;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--charcoal);
  margin-bottom: 6px;
}

.booking-form input[type="text"],
.booking-form input[type="email"],
.booking-form input[type="tel"],
.booking-form input[type="date"] {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid var(--light-grey);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--charcoal);
  background: var(--white);
}

.booking-form input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(74,127,168,0.2);
  outline: none;
}

.booking-form .consent-group { margin-top: 24px; }

.booking-form .consent-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--dark-grey);
  line-height: 1.5;
}

.booking-form .consent-item input[type="checkbox"] {
  margin-top: 3px;
  min-width: 16px;
}

.booking-summary {
  background: var(--blue-50);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 20px;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--charcoal);
}

#card-element {
  padding: 12px 14px;
  border: 1.5px solid var(--light-grey);
  border-radius: var(--radius-sm);
  background: var(--white);
  margin-bottom: 20px;
}

#card-element.StripeElement--focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(74,127,168,0.2);
}

.booking-error {
  color: #9e3333;
  background: #FDF2F2;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 14px;
  margin-bottom: 16px;
  display: none;
}

.booking-error.visible { display: block; }

.booking-back {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--mid-grey);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  margin-top: 12px;
  display: inline-block;
}
.booking-back:hover { color: var(--blue-600); }

.booking-loading {
  text-align: center;
  padding: 40px;
  font-family: var(--font-sans);
  color: var(--mid-grey);
}

.booking-confirmed {
  text-align: center;
  padding: 20px 0;
}
.booking-confirmed h3 { color: var(--sage-600); margin-bottom: 16px; }
.booking-confirmed p { font-family: var(--font-sans); font-size: 15px; color: var(--dark-grey); margin-bottom: 8px; }

.booking-selected-date {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--blue-600);
  margin-bottom: 8px;
}

@media (max-width: 480px) {
  .date-grid { grid-template-columns: repeat(2, 1fr); }
  .time-btn { padding: 10px 18px; font-size: 14px; }
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add booking widget CSS styles"
```

---

## Task 4: Add booking widget HTML

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Find and remove the Cal.com embed**

In `index.html`, find the `<div id="cal-embed"` div and both Cal.com `<script>` blocks. Remove:
1. The `<div id="cal-embed" ...></div>` line
2. The Cal.com embed `<script>` block (the one containing `Cal("init"` and `Cal("inline"`)

- [ ] **Step 2: Replace with booking widget HTML**

In the same location where `#cal-embed` was, insert:

```html
<!-- Booking widget -->
<div class="booking-widget" id="booking-widget">
  <div class="booking-error" id="booking-error" aria-live="polite"></div>

  <!-- Step 1: Choose a date -->
  <div class="booking-step active" id="step-date">
    <h3 style="text-align:center;margin-bottom:4px;">Choose a Friday</h3>
    <p style="text-align:center;font-family:var(--font-sans);font-size:14px;color:var(--mid-grey);margin-bottom:16px;">Select your preferred appointment date</p>
    <div class="date-grid" id="date-grid">
      <div class="booking-loading">Loading available dates&hellip;</div>
    </div>
  </div>

  <!-- Step 2: Choose a time -->
  <div class="booking-step" id="step-time">
    <button class="booking-back" id="back-to-dates" type="button">&larr; Back to dates</button>
    <h3 style="text-align:center;margin:12px 0 4px;">Choose a time</h3>
    <p class="booking-selected-date" id="selected-date-label" style="text-align:center;"></p>
    <div class="time-grid" id="time-grid"></div>
  </div>

  <!-- Step 3: Your details -->
  <div class="booking-step" id="step-details">
    <button class="booking-back" id="back-to-times" type="button">&larr; Back to times</button>
    <h3 style="text-align:center;margin:12px 0 20px;">Your details</h3>
    <form class="booking-form" id="booking-form" novalidate>
      <div class="form-group">
        <label for="book-name">Full name <span style="color:#C45A5A;">*</span></label>
        <input type="text" id="book-name" name="name" required aria-required="true" autocomplete="name">
      </div>
      <div class="form-group">
        <label for="book-email">Email <span style="color:#C45A5A;">*</span></label>
        <input type="email" id="book-email" name="email" required aria-required="true" autocomplete="email">
      </div>
      <div class="form-group">
        <label for="book-phone">Phone <span style="color:#C45A5A;">*</span></label>
        <input type="tel" id="book-phone" name="phone" required aria-required="true" autocomplete="tel">
      </div>
      <div class="form-group">
        <label for="book-dob">Date of birth <span style="color:#C45A5A;">*</span></label>
        <input type="date" id="book-dob" name="dob" required aria-required="true">
      </div>
      <div class="consent-group">
        <div class="consent-item">
          <input type="checkbox" id="consent-data" name="consent_data_processing" required aria-required="true">
          <label for="consent-data">I consent to my data being processed for this appointment <span style="color:#C45A5A;">*</span></label>
        </div>
        <div class="consent-item">
          <input type="checkbox" id="consent-gp" name="consent_gp_sharing">
          <label for="consent-gp">I consent to a summary being sent to my GP</label>
        </div>
        <div class="consent-item">
          <input type="checkbox" id="consent-sms" name="consent_sms">
          <label for="consent-sms">I consent to receiving appointment confirmation and reminders by SMS</label>
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;margin-top:24px;">Continue to payment</button>
    </form>
  </div>

  <!-- Step 4: Payment -->
  <div class="booking-step" id="step-payment">
    <button class="booking-back" id="back-to-details" type="button">&larr; Back to details</button>
    <h3 style="text-align:center;margin:12px 0 20px;">Pay &pound;49.99</h3>
    <div class="booking-summary" id="payment-summary"></div>
    <label style="font-family:var(--font-sans);font-size:13px;font-weight:500;color:var(--charcoal);margin-bottom:6px;display:block;">Card details</label>
    <div id="card-element" aria-label="Card payment details"></div>
    <div id="card-errors" style="color:#C45A5A;font-size:13px;margin-bottom:12px;" aria-live="polite"></div>
    <button type="button" class="btn btn-primary" id="pay-btn" style="width:100%;">Pay &pound;49.99</button>
  </div>

  <!-- Step 5: Confirmation -->
  <div class="booking-step" id="step-confirm">
    <div class="booking-confirmed">
      <h3>Booking confirmed</h3>
      <p id="confirm-details"></p>
      <p style="margin-top:16px;">40&ndash;44 The Broadway, Wimbledon, London SW19 1RQ</p>
      <p style="margin-top:12px;font-size:13px;color:var(--mid-grey);">You will receive an SMS confirmation shortly (if you opted in).</p>
      <p style="margin-top:8px;font-size:13px;color:var(--mid-grey);">To cancel, email <a href="mailto:drmahmoodclinic@pm.me" style="color:var(--blue-500);">drmahmoodclinic@pm.me</a></p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add booking widget HTML (5-step form)"
```

---

## Task 5: Add booking widget JavaScript

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add Stripe.js script tag**

Before the existing `<script>` block (the SPA routing IIFE), add:

```html
<script src="https://js.stripe.com/v3/"></script>
```

- [ ] **Step 2: Add booking widget JavaScript**

After the existing SPA routing `<script>` block, add a new `<script>` block. This is the complete booking widget logic:

```javascript
(function() {
  'use strict';

  // ── Config ──
  // TODO: Replace with your actual Stripe publishable key before deployment
  var STRIPE_PK = 'pk_live_PLACEHOLDER';

  // ── State ──
  var allSlots = [];       // flat array from API: [{slot_date, slot_time}, ...]
  var grouped = {};        // { '2026-04-04': ['17:00','17:30',...], ... }
  var selectedDate = null;
  var selectedTime = null;

  // ── DOM refs ──
  var steps = document.querySelectorAll('.booking-step');
  var dateGrid = document.getElementById('date-grid');
  var timeGrid = document.getElementById('time-grid');
  var errorBox = document.getElementById('booking-error');
  var dateLbl = document.getElementById('selected-date-label');
  var form = document.getElementById('booking-form');
  var payBtn = document.getElementById('pay-btn');
  var paymentSummary = document.getElementById('payment-summary');
  var confirmDetails = document.getElementById('confirm-details');
  var cardErrors = document.getElementById('card-errors');

  // ── Stripe ──
  var stripe = null;
  var elements = null;
  var cardElement = null;

  try {
    stripe = Stripe(STRIPE_PK);
    elements = stripe.elements();
    cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#2C2A27',
          fontFamily: 'Inter, sans-serif',
          '::placeholder': { color: '#9B9690' }
        }
      }
    });
  } catch (e) {
    console.warn('[booking] Stripe not initialised:', e.message);
  }

  // ── Helpers ──
  function showStep(id) {
    steps.forEach(function(s) { s.classList.remove('active'); });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      var h = el.querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
    }
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('visible');
  }

  function hideError() {
    errorBox.textContent = '';
    errorBox.classList.remove('visible');
  }

  function formatDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  function groupSlots(slots) {
    var g = {};
    slots.forEach(function(s) {
      if (!g[s.slot_date]) g[s.slot_date] = [];
      g[s.slot_date].push(s.slot_time);
    });
    // Sort times within each date
    Object.keys(g).forEach(function(d) {
      g[d].sort();
    });
    return g;
  }

  // ── Step 1: Load and render dates ──
  function loadSlots() {
    dateGrid.innerHTML = '<div class="booking-loading">Loading available dates&hellip;</div>';
    fetch('/api/slots')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        allSlots = data.slots || [];
        grouped = groupSlots(allSlots);
        renderDates();
      })
      .catch(function() {
        dateGrid.innerHTML = '<p style="text-align:center;color:var(--mid-grey);">Unable to load appointments. Please try again or email drmahmoodclinic@pm.me.</p>';
      });
  }

  function renderDates() {
    var dates = Object.keys(grouped).sort();
    if (dates.length === 0) {
      dateGrid.innerHTML = '<p style="text-align:center;color:var(--mid-grey);grid-column:1/-1;">No appointments currently available. Please check back later or email <a href="mailto:drmahmoodclinic@pm.me" style="color:var(--blue-500);">drmahmoodclinic@pm.me</a>.</p>';
      return;
    }
    dateGrid.innerHTML = '';
    dates.forEach(function(iso) {
      var count = grouped[iso].length;
      var card = document.createElement('button');
      card.className = 'date-card';
      card.type = 'button';
      card.setAttribute('aria-label', formatDate(iso) + ', ' + count + ' slots available');
      var d = new Date(iso + 'T00:00:00');
      card.innerHTML =
        '<div class="date-day">' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) + '</div>' +
        '<div class="date-month">' + d.toLocaleDateString('en-GB', { month: 'long' }) + '</div>' +
        '<div class="date-slots">' + count + ' slot' + (count !== 1 ? 's' : '') + ' available</div>';
      card.addEventListener('click', function() {
        selectedDate = iso;
        renderTimes();
        showStep('step-time');
      });
      dateGrid.appendChild(card);
    });
  }

  // ── Step 2: Render times for selected date ──
  function renderTimes() {
    hideError();
    dateLbl.textContent = formatDate(selectedDate);
    var times = grouped[selectedDate] || [];
    timeGrid.innerHTML = '';
    times.forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'time-btn';
      btn.type = 'button';
      btn.textContent = t;
      btn.setAttribute('aria-label', t + ' on ' + formatDate(selectedDate));
      btn.addEventListener('click', function() {
        selectedTime = t;
        showStep('step-details');
      });
      timeGrid.appendChild(btn);
    });
  }

  // ── Step 3: Form validation + advance to payment ──
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError();

      var name = document.getElementById('book-name').value.trim();
      var email = document.getElementById('book-email').value.trim();
      var phone = document.getElementById('book-phone').value.trim();
      var dob = document.getElementById('book-dob').value;
      var consentData = document.getElementById('consent-data').checked;

      if (!name || name.length < 2) { showError('Please enter your full name.'); return; }
      if (!email || !email.includes('@')) { showError('Please enter a valid email address.'); return; }
      if (!phone || phone.length < 7) { showError('Please enter a valid phone number.'); return; }
      if (!dob) { showError('Please enter your date of birth.'); return; }
      if (!consentData) { showError('You must consent to data processing to book.'); return; }

      // Show payment summary
      paymentSummary.textContent = 'Clinic appointment — ' + formatDate(selectedDate) + ' at ' + selectedTime;

      // Mount Stripe card element if not already mounted
      if (cardElement) {
        var container = document.getElementById('card-element');
        if (container && !container.children.length) {
          cardElement.mount('#card-element');
        }
      }

      showStep('step-payment');
    });
  }

  // ── Step 4: Process payment ──
  if (payBtn) {
    payBtn.addEventListener('click', async function() {
      hideError();
      cardErrors.textContent = '';

      if (!stripe || !cardElement) {
        showError('Payment system not available. Please email drmahmoodclinic@pm.me to book.');
        return;
      }

      // Disable button
      payBtn.disabled = true;
      payBtn.textContent = 'Processing\u2026';

      try {
        // Create payment method
        var pmResult = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: document.getElementById('book-name').value.trim(),
            email: document.getElementById('book-email').value.trim()
          }
        });

        if (pmResult.error) {
          cardErrors.textContent = pmResult.error.message;
          payBtn.disabled = false;
          payBtn.textContent = 'Pay \u00A349.99';
          return;
        }

        // POST to backend
        var body = {
          name: document.getElementById('book-name').value.trim(),
          email: document.getElementById('book-email').value.trim(),
          phone: document.getElementById('book-phone').value.trim(),
          dob: document.getElementById('book-dob').value,
          tier: 1,
          language: 'en',
          slot_date: selectedDate,
          slot_time: selectedTime,
          consent_data_processing: document.getElementById('consent-data').checked,
          consent_gp_sharing: document.getElementById('consent-gp').checked,
          consent_sms: document.getElementById('consent-sms').checked,
          stripe_payment_method_id: pmResult.paymentMethod.id
        };

        var resp = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        var result = await resp.json();

        if (!resp.ok) {
          if (resp.status === 409) {
            showError('This slot was just taken. Please choose another.');
            loadSlots();
            showStep('step-date');
          } else {
            showError(result.error || 'Booking failed. Please try again.');
          }
          payBtn.disabled = false;
          payBtn.textContent = 'Pay \u00A349.99';
          return;
        }

        // Success — show confirmation
        confirmDetails.textContent = formatDate(selectedDate) + ' at ' + selectedTime;
        showStep('step-confirm');

      } catch (err) {
        showError('Something went wrong. Please try again or email drmahmoodclinic@pm.me.');
        payBtn.disabled = false;
        payBtn.textContent = 'Pay \u00A349.99';
      }
    });
  }

  // ── Back buttons ──
  var backDates = document.getElementById('back-to-dates');
  var backTimes = document.getElementById('back-to-times');
  var backDetails = document.getElementById('back-to-details');

  if (backDates) backDates.addEventListener('click', function() { showStep('step-date'); });
  if (backTimes) backTimes.addEventListener('click', function() { showStep('step-time'); });
  if (backDetails) backDetails.addEventListener('click', function() { showStep('step-details'); });

  // ── Init: load slots when page becomes visible ──
  // Use IntersectionObserver to lazy-load slots when booking section scrolls into view
  var widget = document.getElementById('booking-widget');
  if (widget && 'IntersectionObserver' in window) {
    var slotObserver = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && allSlots.length === 0) {
        loadSlots();
        slotObserver.disconnect();
      }
    }, { threshold: 0.1 });
    slotObserver.observe(widget);
  } else {
    // Fallback: load immediately
    loadSlots();
  }
})();
```

**IMPORTANT:** This script block must NOT contain a literal `</script>` anywhere inside it. The code above does not — verified.

- [ ] **Step 3: Remove the old Cal.com script block**

Delete the `<script>` block that contained `Cal("init", ...)` and `Cal("inline", ...)`. This was the second-to-last script block before `</body>`.

- [ ] **Step 4: Verify the widget renders**

Open `index.html` in browser. Navigate to the booking section on `#home`. Should see:
- "Choose a Friday" heading
- "Loading available dates..." (will show error since no local server — that's expected)
- No console errors from Stripe (may warn about invalid key — expected with placeholder)

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add booking widget JS — slots, form, Stripe payment, confirmation"
```

---

## Task 6: Verification

- [ ] **Step 1: Div balance check**

```bash
cd "C:/Users/user/Downloads/private website"
grep -c '<div' index.html
grep -c '</div>' index.html
```

Counts must match. If they differ, check whether `<div` appears inside `<script>` blocks and exclude those.

- [ ] **Step 2: Check no literal `</script>` inside script blocks**

```bash
grep -n '</script>' index.html
```

Every match should be a legitimate closing `</script>` tag, not inside JS code.

- [ ] **Step 3: Verify Stripe.js loads**

Open index.html, check browser console for Stripe initialization. Should see no errors (or just the expected "invalid key" warning from the placeholder key).

- [ ] **Step 4: Test booking flow visually**

With the Express server running (`cd server && npm start`):
1. Slots should load and show available Fridays
2. Click a date → times should appear
3. Click a time → form should appear
4. Fill form, submit → payment step should appear
5. Back buttons should work at every step

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "verify: booking widget complete — div balance, Stripe, flow tested"
```

---

## Summary

| Task | What it does | Files |
|------|-------------|-------|
| 1 | Caddyfile routing + CSP | `Caddyfile` |
| 2 | Backend price update | `server/index.js` |
| 3 | Booking widget CSS | `index.html` |
| 4 | Booking widget HTML | `index.html` |
| 5 | Booking widget JS + Stripe | `index.html` |
| 6 | Verification | — |
