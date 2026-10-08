require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  createOrder,
  captureOrder,
  PAYPAL_ENV,
  PAYPAL_CLIENT_ID,
  isConfigured,
} = require('./paypal');
const {
  createCheckoutSession,
  getCheckoutSession,
  isConfigured: stripeConfigured,
} = require('./stripe');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Log errors WITHOUT their message. Payment SDK error messages can embed
// fragments of the API key or other sensitive data, so we deliberately log
// only safe, non-sensitive fields (name/type/code/http status) and never
// err.message or the raw error object.
function safeLogError(label, err) {
  const info = {
    name: err?.name,
    type: err?.type,
    code: err?.code,
    statusCode: err?.statusCode ?? err?.status,
  };
  // For invalid-request errors, the rejected parameter and its description are
  // safe to log (they describe the request, not credentials) and are essential
  // for debugging. We never log messages for auth/permission error types, which
  // can echo key material.
  if (err?.type === 'StripeInvalidRequestError') {
    info.param = err?.param;
    info.reason = err?.raw?.message;
  }
  console.error(label, info);
}

// Health check so the client can tell whether the backend is reachable, and
// so it can learn the PayPal environment (sandbox vs live) for display.
app.get('/health', (_req, res) => {
  res.json({ ok: true, paypalEnv: PAYPAL_ENV });
});

// Expose only the PUBLIC client id to the frontend (needed to load the JS SDK).
// The secret stays on the server.
app.get('/api/paypal/config', (_req, res) => {
  res.json({
    clientId: isConfigured ? PAYPAL_CLIENT_ID : null,
    currency: 'EUR',
    env: PAYPAL_ENV,
    configured: isConfigured,
  });
});

// Step 1: create an order. The client sends the cart total; in a hardened
// build you would recompute the total from the cart server-side instead of
// trusting the amount sent here.
app.post('/api/paypal/orders', async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || !(amount > 0)) {
      return res.status(400).json({ error: 'A positive numeric amount is required.' });
    }
    const order = await createOrder(amount);
    res.status(201).json({ id: order.id, status: order.status });
  } catch (err) {
    if (err?.code === 'PAYPAL_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('createOrder failed:', err);
    res.status(500).json({ error: 'Could not create PayPal order.' });
  }
});

// Step 2: capture (charge) the approved order.
app.post('/api/paypal/orders/:orderId/capture', async (req, res) => {
  try {
    const { orderId } = req.params;
    const capture = await captureOrder(orderId);
    const status = capture.status;
    const captureId =
      capture?.purchaseUnits?.[0]?.payments?.captures?.[0]?.id ?? null;
    res.json({ id: capture.id, status, captureId });
  } catch (err) {
    safeLogError('captureOrder failed:', err);
    res.status(500).json({ error: 'Could not capture PayPal order.' });
  }
});

// ---------------------------------------------------------------------------
// Stripe Checkout (hosted redirect)
// ---------------------------------------------------------------------------

// Tell the client whether Stripe is usable.
app.get('/api/stripe/config', (_req, res) => {
  res.json({ configured: stripeConfigured });
});

// Create a hosted Checkout Session and return its URL for the client to open.
app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { amount, successUrl, cancelUrl } = req.body;
    if (typeof amount !== 'number' || !(amount > 0)) {
      return res.status(400).json({ error: 'A positive numeric amount is required.' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'successUrl and cancelUrl are required.' });
    }
    const session = await createCheckoutSession(amount, { successUrl, cancelUrl });
    res.status(201).json(session); // { id, url }
  } catch (err) {
    if (err?.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('createCheckoutSession failed:', err);
    res.status(500).json({ error: 'Could not start Stripe checkout.' });
  }
});

// Check a session's payment status when the buyer returns from Stripe.
app.get('/api/stripe/session/:sessionId', async (req, res) => {
  try {
    const result = await getCheckoutSession(req.params.sessionId);
    res.json(result);
  } catch (err) {
    if (err?.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('getCheckoutSession failed:', err);
    res.status(500).json({ error: 'Could not retrieve Stripe session.' });
  }
});

// ---------------------------------------------------------------------------
// Orders (persisted in Postgres so the owner app sees customer orders)
// ---------------------------------------------------------------------------

// Minimal validation of the order payload the customer app sends. We trust the
// client shape here for brevity; a hardened build would recompute totals and
// validate the cart server-side.
function validateOrderPayload(body) {
  if (!body || typeof body !== 'object') return 'Order body is required.';
  if (typeof body.id !== 'string' || !body.id) return 'Order id is required.';
  if (typeof body.total !== 'number' || !(body.total >= 0)) return 'A numeric total is required.';
  if (!Array.isArray(body.lines) || body.lines.length === 0) return 'Order lines are required.';
  if (!body.customer || typeof body.customer !== 'object') return 'Customer is required.';
  if (!body.pickup || typeof body.pickup !== 'object') return 'Pickup is required.';
  return null;
}

// Create / save an order (called by the customer app on checkout).
app.post('/api/orders', async (req, res) => {
  try {
    const problem = validateOrderPayload(req.body);
    if (problem) return res.status(400).json({ error: problem });

    const order = await db.insertOrder({
      id: req.body.id,
      createdAt: req.body.createdAt ?? Date.now(),
      total: req.body.total,
      status: req.body.status ?? 'placed',
      paymentMethod: req.body.paymentMethod ?? 'cash',
      paymentStatus: req.body.paymentStatus ?? 'pending',
      customer: req.body.customer,
      pickup: req.body.pickup,
      lines: req.body.lines,
    });
    res.status(201).json(order);
  } catch (err) {
    if (err?.code === 'DB_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('insertOrder failed:', err);
    res.status(500).json({ error: 'Could not save the order.' });
  }
});

// List all orders (polled by the owner app).
app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await db.listOrders();
    res.json(orders);
  } catch (err) {
    if (err?.code === 'DB_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('listOrders failed:', err);
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

// Update an order's status (owner advances placed -> preparing -> ready ...).
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['placed', 'preparing', 'ready', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }
    const updated = await db.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Order not found.' });
    res.json(updated);
  } catch (err) {
    if (err?.code === 'DB_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('updateOrderStatus failed:', err);
    res.status(500).json({ error: 'Could not update the order.' });
  }
});

// Update an order's payment status (e.g. after a Stripe payment is confirmed).
app.patch('/api/orders/:id/payment', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const allowed = ['pending', 'paid'];
    if (!allowed.includes(paymentStatus)) {
      return res.status(400).json({ error: `paymentStatus must be one of: ${allowed.join(', ')}` });
    }
    const updated = await db.updateOrderPaymentStatus(req.params.id, paymentStatus);
    if (!updated) return res.status(404).json({ error: 'Order not found.' });
    res.json(updated);
  } catch (err) {
    if (err?.code === 'DB_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    safeLogError('updateOrderPaymentStatus failed:', err);
    res.status(500).json({ error: 'Could not update the order.' });
  }
});

// Bind to 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) can reach the server
// via the laptop's LAN IP, not just localhost on the laptop itself.
// Initialise the DB schema first (no-op when DATABASE_URL is unset), then boot.
db.init()
  .catch((err) => {
    // Don't crash the whole server if schema init fails - payments can still
    // work. Order endpoints will surface the error per-request.
    console.error('[db] init failed:', err?.code ?? err?.message);
  })
  .finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `Dosa payments backend listening on http://0.0.0.0:${PORT} ` +
          `(reachable on your LAN IP:${PORT}) ` +
          `(PayPal: ${PAYPAL_ENV}, orders DB: ${db.isConfigured ? 'on' : 'off'})`
      );
    });
  });
