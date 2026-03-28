# Custom Booking Widget — Design Spec

**Date**: 2026-03-19
**Status**: Draft
**Scope**: Replace Cal.com embed with a custom booking UI wired to the existing Express backend

## Summary

Replace the Cal.com `#cal-embed` placeholder in `index.html` with an inline booking widget that calls the existing Express API (`/api/slots`, `/api/book`). Update the Caddyfile to route API and dashboard traffic to the Express server on port 3001. Update Stripe amount from £50.00 to £49.99. Always book as tier 1 (clinic appointment only).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Booking tier | Always tier 1 (clinic only) | Tier 2 (monitoring) is discussed and paid in person |
| Price | £49.99 (4999 pence) | Updated from £50.00 |
| Payment | Stripe Elements (card input) | Already integrated in backend |
| Cal.com | Removed entirely | No longer needed; docker-compose Cal.com services can be stopped |
| Cal.com subdomain | Remove from Caddyfile | `booking.londoncardiologyclinic.uk` block deleted to avoid 502 errors |
| Admin dashboard | No changes | Already built at `/dashboard`, works with same SQLite DB |
| Backend changes | Minimal — price update + hardcode tier 1 | Existing routes are sufficient |
| Language field | Hardcode `'en'` | Multilingual not needed for OpenPalp; intentional omission |
| book.html | Deprecated — no changes | Served by Express at `/book` but superseded by inline widget; remove from nav |
| Stripe key delivery | Hardcoded in index.html | Publishable keys are safe to expose client-side per Stripe docs |
| 3D Secure / SCA | Known limitation — documented | Full SCA handling deferred to v2; most UK cards require it |

## Architecture

### Data Flow

```
Patient clicks "Book" in index.html
  → Step 1: GET /api/slots → show available Fridays + times
  → Step 2: Patient picks date + time
  → Step 3: Patient fills in name, email, phone, DOB + consent
  → Step 4: Stripe Elements collects card → POST /api/book (with payment_method_id)
  → Step 5: Backend creates PaymentIntent (£49.99), books slot, creates patient, sends SMS
  → Step 6: Frontend shows confirmation
```

### File Changes

| File | Action |
|------|--------|
| `index.html` | Replace `#cal-embed` div and Cal.com scripts with inline booking widget |
| `server/index.js` | Update Stripe amount 5000 → 4999; hardcode tier=1 for online bookings |
| `Caddyfile` | Add `handle /api/*` and `handle /dashboard*` reverse proxy to localhost:3001 |

### Caddyfile Update

The current Caddyfile only serves static files. Add API and dashboard routing:

```caddyfile
londoncardiologyclinic.uk, www.londoncardiologyclinic.uk {
    # API and dashboard → Express server
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

# REMOVED: booking.londoncardiologyclinic.uk block (Cal.com no longer used)
```

**Notes:**
- `handle` blocks ordered: specific paths (`/api/*`, `/dashboard*`) before catch-all `handle {}`
- CSP header added to allow Stripe.js (`js.stripe.com`) for scripts/frames and `api.stripe.com` for connections
- The `booking.londoncardiologyclinic.uk` Caddyfile block is removed entirely (Cal.com no longer used)

## Booking Widget Design

### Location

Replaces the `<div id="cal-embed">` and the Cal.com `<script>` blocks in `index.html`. The widget is inline HTML + JS within the existing booking section of `#home`.

### UI Steps

The widget is a multi-step form, all rendered client-side within a single container div. Steps are shown/hidden with JS (no page navigation).

**Step 1 — Choose a date:**
- Heading: "Choose a Friday"
- Grid of date cards (next 4-8 available Fridays)
- Each card shows: "Friday 4 April" + "5 slots available" (or "4 slots" etc.)
- Click a card → advance to step 2
- Fetched from `GET /api/slots` on page load / when booking section is visible
- **Empty state:** If API returns zero slots, show: "No appointments currently available. Please check back later or email drmahmoodclinic@pm.me."
- **Grouping logic:** `GET /api/slots` returns a flat array of `{slot_date, slot_time}` objects. The frontend must group by `slot_date` and count available slots per date to render the date cards.

**Step 2 — Choose a time:**
- Heading: "Choose a time" + selected date shown
- Row of time buttons: 17:00, 17:30, 18:00, 18:30, 19:00, 19:30 (only available ones)
- "Back" link to return to step 1
- Click a time → advance to step 3

**Step 3 — Your details:**
- Heading: "Your details"
- Form fields:
  - Full name (required)
  - Email (required)
  - Phone (required)
  - Date of birth (required, `<input type="date">`)
- Consent checkboxes:
  - "I consent to my data being processed for this appointment" (required, maps to `consent_data_processing`)
  - "I consent to a summary being sent to my GP" (optional, maps to `consent_gp_sharing`)
  - "I consent to receiving appointment confirmation and reminders by SMS" (optional, maps to `consent_sms`)
- "Back" link to return to step 2
- "Continue to payment" button → advance to step 4

**Step 4 — Payment:**
- Heading: "Pay £49.99"
- Summary line: "Clinic appointment — [date] at [time]"
- Stripe Elements card input (card number, expiry, CVC in one field)
- "Pay £49.99" button
- "Back" link to return to step 3
- On submit:
  1. Create Stripe PaymentMethod from card element
  2. POST `/api/book` with all data + `stripe_payment_method_id`
  3. Show loading state
  4. On success → step 5
  5. On error → show error message, stay on step 4

**Step 5 — Confirmation:**
- Heading: "Booking confirmed"
- Details: date, time, address (40-44 The Broadway, Wimbledon SW19 1RQ)
- "You will receive an SMS confirmation shortly"
- "If you need to cancel, use the link in your SMS or email drmahmoodclinic@pm.me"
- No back button (booking is complete)

### Stripe Elements Integration

Load Stripe.js from `https://js.stripe.com/v3/` (standard CDN, already allowed in CSP).

```javascript
const stripe = Stripe('PUBLISHABLE_KEY'); // user provides this
const elements = stripe.elements();
const cardElement = elements.create('card', {
  style: {
    base: {
      fontSize: '16px',
      color: '#2C2A27',
      fontFamily: 'Inter, sans-serif',
      '::placeholder': { color: '#9B9690' }
    }
  }
});
cardElement.mount('#card-element');
```

On submit:
```javascript
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
  billing_details: { name, email }
});
// Then POST to /api/book with paymentMethod.id
```

**Note:** The Stripe publishable key needs to be provided by the user. Use a placeholder `pk_live_PLACEHOLDER` that must be replaced before deployment.

### CSS

The booking widget uses existing CSS classes where possible:
- `.btn`, `.btn-primary` for buttons
- Form inputs styled to match existing `.form-group` patterns from book.html
- Date cards use a new `.date-card` class (simple grid cards)
- Time buttons use a new `.time-btn` class
- Steps use `.booking-step` with show/hide

New CSS additions (inline in the existing `<style>` block):

```css
/* Booking widget */
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
.date-card:hover { border-color: var(--blue-400); box-shadow: var(--shadow-sm); }
.date-card .date-day { font-family: var(--font-serif); font-size: 18px; font-weight: 700; }
.date-card .date-slots { font-size: 13px; color: var(--mid-grey); margin-top: 4px; }

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
  cursor: pointer;
  transition: all 0.2s;
}
.time-btn:hover { border-color: var(--blue-400); background: var(--blue-50); }

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
  margin-bottom: 16px;
}

.booking-form input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(74,127,168,0.2);
  outline: none;
}

.booking-summary {
  background: var(--blue-50);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 20px;
  font-size: 15px;
}

#card-element {
  padding: 12px 14px;
  border: 1.5px solid var(--light-grey);
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
}

.booking-error {
  color: var(--red-600);
  background: var(--red-50);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  margin-bottom: 16px;
  display: none;
}

.booking-back {
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
```

### Accessibility

- All form fields have associated `<label>` elements
- Required fields marked with `aria-required="true"`
- Error messages use `aria-live="polite"` region
- Step transitions manage focus (heading of new step gets focus)
- Card element has `aria-label="Card payment details"`
- Back buttons are `<button>` elements (not links)
- Date cards and time buttons are keyboard-accessible

### Error Handling

- **Slot no longer available** (409 from API): Show "This slot was just taken — please choose another" and return to step 1 with refreshed slots
- **Stripe card error**: Show Stripe's error message below the card element
- **Network error**: Show "Something went wrong. Please try again or email drmahmoodclinic@pm.me"
- **Validation errors**: Inline below each field, prevent advancement to next step

## Backend Changes

### server/index.js

**Line ~444:** Change `amount: 5000` to `amount: 4999`

**Line ~451:** Change description to `London Cardiology Clinic — OpenPalp clinic appointment`

**CRITICAL: The frontend MUST always send `tier: 1` in the POST body.** The backend does NOT default to tier 1 — omitting tier causes `Number(undefined) = NaN`, which fails validation with a 400 error. The frontend must explicitly include `tier: 1` in every booking request.

**POST body must include:** `{ name, email, phone, dob, tier: 1, language: 'en', slot_date, slot_time, consent_data_processing, consent_gp_sharing, consent_sms, stripe_payment_method_id }`

### 3D Secure / SCA — Known Limitation

The current backend creates a PaymentIntent with `confirm: true` and assumes immediate success. Under PSD2/SCA (mandatory for most UK cards), some payments will return `requires_action` status instead of `succeeded`. Full SCA handling requires:
1. Backend returns `client_secret` when status is `requires_action`
2. Frontend calls `stripe.handleCardAction(client_secret)`
3. After 3DS authentication, frontend confirms to backend

**For v1:** Accept that some cards may fail with a generic error. The patient can retry or pay in person. This is the same behavior as the existing `book.html`.

**For v2 (future):** Add proper SCA flow with `stripe.confirmCardPayment()` instead of server-side confirm.

### No other backend changes needed

The existing slot generation, booking, cancellation, SMS, and admin dashboard all work as-is.

## What Is NOT In Scope

- Changes to admin dashboard (already functional)
- Tier 2 online booking (discussed in person)
- Email confirmations (SMS via Twilio handles this)
- Patient log page changes (already built)
- Docker/Cal.com removal (can be stopped separately)
- Stripe publishable key configuration (user provides this)
