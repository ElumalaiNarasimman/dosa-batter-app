// Stripe Checkout (hosted redirect) integration.
//
// Flow:
//   1. createCheckoutSession(amount, urls) uses the Stripe SECRET key to create
//      a Checkout Session and returns its hosted URL (checkout.stripe.com/...).
//   2. The app redirects the buyer's browser to that URL — Stripe's own page.
//   3. After paying, Stripe redirects to successUrl; cancelUrl on abandon.
//
// The secret key stays here on the server and never reaches the app.

const Stripe = require('stripe');

const { STRIPE_SECRET_KEY } = process.env;

// Treat the placeholder from .env.example as "not set".
const isPlaceholder = (v) => !v || v.startsWith('your-') || v.startsWith('sk_test_xxx');

const isConfigured = !isPlaceholder(STRIPE_SECRET_KEY);

let stripe = null;
if (isConfigured) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
} else {
  console.warn(
    '[stripe] No secret key set. Stripe payments are disabled. ' +
      'Add STRIPE_SECRET_KEY to server/.env (see .env.example).'
  );
}

function assertConfigured() {
  if (!stripe) {
    const err = new Error(
      'Stripe is not configured on the server. Add STRIPE_SECRET_KEY to server/.env.'
    );
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
}

// Create a hosted Checkout Session for a single dosa-batter order.
// amountEuros is authoritative here; Stripe wants the amount in cents.
async function createCheckoutSession(amountEuros, { successUrl, cancelUrl }) {
  assertConfigured();
  const unitAmount = Math.round(Number(amountEuros) * 100);

  // NOTE: we deliberately do NOT pass `payment_method_types`. When it is
  // omitted, Stripe Checkout automatically offers every payment method that is
  // enabled in the dashboard for this account + currency (card, SEPA, giropay,
  // Klarna, PayPal, etc.). Manage them at
  // dashboard.stripe.com/settings/payment_methods - no code change needed.
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: unitAmount,
          product_data: { name: 'Fresh dosa batter pickup order' },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { id: session.id, url: session.url };
}

// Look up a session's payment status (used when the buyer returns).
async function getCheckoutSession(sessionId) {
  assertConfigured();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    id: session.id,
    paymentStatus: session.payment_status, // 'paid' when complete
    status: session.status,
  };
}

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
  isConfigured,
};
