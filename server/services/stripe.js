'use strict';

/**
 * Stripe service — London Cardiology Clinic
 *
 * All monetary values are in GBP pence (Stripe convention).
 * £50.00  = 5000
 * £200.00 = 20000
 */

const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const BASE_URL = process.env.APP_BASE_URL || 'https://londoncardiology.clinic';

// ─── Tier configuration ───────────────────────────────────────────────────────

const TIER_CONFIG = {
  1: {
    name: 'Cardiology Consultation',
    amount: 5000, // £50.00
    currency: 'gbp',
  },
  2: {
    name: 'CardioTrack Programme',
    amount: 5000, // £50.00
    currency: 'gbp',
  },
};

const DEVICE_DEPOSIT_AMOUNT = 20000; // £200.00

// ─── Checkout ─────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout session for the given patient and tier.
 *
 * @param {object} patient - Must include { id, name, email, tier }
 * @param {1|2}    tier    - Programme tier
 * @returns {Promise<Stripe.Checkout.Session>}
 */
async function createCheckoutSession(patient, tier) {
  const tierNum = Number(tier);
  if (![1, 2].includes(tierNum)) {
    throw new Error(`Invalid tier: ${tier}. Must be 1 or 2.`);
  }
  if (!patient || !patient.id || !patient.email) {
    throw new Error('patient.id and patient.email are required');
  }

  const config = TIER_CONFIG[tierNum];

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: patient.email,
    line_items: [
      {
        price_data: {
          currency: config.currency,
          unit_amount: config.amount,
          product_data: {
            name: config.name,
            description:
              tierNum === 1
                ? 'One-to-one cardiology consultation at the London Cardiology Clinic'
                : '7-week remote cardiac monitoring programme including ECG device',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      patient_id: String(patient.id),
      tier: String(tierNum),
    },
    success_url: `${BASE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/book/cancel`,
    // Expire sessions after 30 minutes so slots are not held indefinitely
    expires_at: Math.floor(Date.now() / 1000) + 1800,
  });

  return session;
}

// ─── Device deposit hold ──────────────────────────────────────────────────────

/**
 * Creates a £200 authorisation hold for Tier 2 device deposit.
 * The hold must be captured or cancelled explicitly.
 *
 * @param {object} patient - Must include { id, email, name }
 * @returns {Promise<string>} The PaymentIntent ID (stored as stripe_hold_id)
 */
async function createDeviceHold(patient) {
  if (!patient || !patient.id || !patient.email) {
    throw new Error('patient.id and patient.email are required');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: DEVICE_DEPOSIT_AMOUNT,
    currency: 'gbp',
    capture_method: 'manual',
    payment_method_types: ['card'],
    metadata: {
      patient_id: String(patient.id),
      purpose: 'device_deposit',
    },
    description: `CardioTrack device deposit — patient ${patient.id}`,
    receipt_email: patient.email,
  });

  return paymentIntent.id;
}

/**
 * Captures the £200 device deposit hold (device not returned).
 *
 * @param {string} holdId - The PaymentIntent ID (stripe_hold_id)
 * @returns {Promise<Stripe.PaymentIntent>}
 */
async function captureDeviceHold(holdId) {
  if (!holdId || typeof holdId !== 'string') {
    throw new Error('holdId must be a non-empty string');
  }

  return stripe.paymentIntents.capture(holdId);
}

/**
 * Releases (cancels) the £200 device deposit hold (device returned).
 *
 * @param {string} holdId - The PaymentIntent ID (stripe_hold_id)
 * @returns {Promise<Stripe.PaymentIntent>}
 */
async function cancelDeviceHold(holdId) {
  if (!holdId || typeof holdId !== 'string') {
    throw new Error('holdId must be a non-empty string');
  }

  return stripe.paymentIntents.cancel(holdId);
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

/**
 * Issues a full refund for the given payment (Checkout session payment_intent).
 * Used for cancellations made more than 48 hours before the appointment.
 *
 * @param {string} paymentId - Stripe PaymentIntent ID or Charge ID
 * @returns {Promise<Stripe.Refund>}
 */
async function refundPayment(paymentId) {
  if (!paymentId || typeof paymentId !== 'string') {
    throw new Error('paymentId must be a non-empty string');
  }

  // Resolve a charge ID from a PaymentIntent ID if needed
  const params = paymentId.startsWith('pi_')
    ? { payment_intent: paymentId }
    : { charge: paymentId };

  return stripe.refunds.create({
    ...params,
    reason: 'requested_by_customer',
  });
}

// ─── Webhook verification ─────────────────────────────────────────────────────

/**
 * Verifies the Stripe webhook signature and constructs the event.
 * The caller is responsible for reading the raw body before any JSON parsing.
 *
 * @param {Buffer|string} payload   - Raw request body
 * @param {string}        sig       - Value of the stripe-signature header
 * @returns {Stripe.Event}
 * @throws {Stripe.errors.StripeSignatureVerificationError} on bad signature
 */
function handleWebhook(payload, sig) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  // constructEvent throws if the signature is invalid — let the route handler
  // catch it and return 400.
  return stripe.webhooks.constructEvent(payload, sig, secret);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createCheckoutSession,
  createDeviceHold,
  captureDeviceHold,
  cancelDeviceHold,
  refundPayment,
  handleWebhook,
};
