// PayPal Orders v2 integration using the official server SDK.
//
// The SDK is initialised with your PayPal app's client id + secret. These are
// SERVER-ONLY credentials and must never reach the mobile/web client. The
// client only ever learns the opaque PayPal order id.
//
// Flow:
//   1. createOrder(amount)        -> returns { id } (status CREATED)
//   2. buyer approves in PayPal UI (handled on the client by the JS SDK)
//   3. captureOrder(orderId)      -> actually takes the money (status COMPLETED)

const {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
} = require('@paypal/paypal-server-sdk');

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_ENV = 'sandbox',
} = process.env;

// Treat placeholder values from .env.example as "not set".
const isPlaceholder = (v) => !v || v.startsWith('your-');

const isConfigured =
  !isPlaceholder(PAYPAL_CLIENT_ID) && !isPlaceholder(PAYPAL_CLIENT_SECRET);

// Only build the PayPal client when real credentials are present. Without them
// the server still boots and stays reachable, but PayPal calls return a clear
// "not configured" error instead of crashing the whole backend.
let ordersController = null;
if (isConfigured) {
  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: PAYPAL_CLIENT_ID,
      oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    environment:
      PAYPAL_ENV === 'live' ? Environment.Production : Environment.Sandbox,
  });
  ordersController = new OrdersController(client);
} else {
  console.warn(
    '[paypal] No credentials set. The server will run but PayPal payments are disabled. ' +
      'Add PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET to server/.env (see .env.example).'
  );
}

function assertConfigured() {
  if (!ordersController) {
    const err = new Error(
      'PayPal is not configured on the server. Add credentials to server/.env.'
    );
    err.code = 'PAYPAL_NOT_CONFIGURED';
    throw err;
  }
}

// Create a PayPal order for the given euro amount. The amount is authoritative
// here on the server; the client never gets to set its own price.
async function createOrder(amountEuros) {
  assertConfigured();
  const value = Number(amountEuros).toFixed(2);
  const { body } = await ordersController.ordersCreate({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: {
            currencyCode: 'EUR',
            value,
          },
          description: 'Fresh dosa batter pickup order',
        },
      ],
    },
    prefer: 'return=representation',
  });
  // The SDK returns the response body as a JSON string.
  return typeof body === 'string' ? JSON.parse(body) : body;
}

// Capture (charge) a previously approved order.
async function captureOrder(orderId) {
  assertConfigured();
  const { body } = await ordersController.ordersCapture({
    id: orderId,
    prefer: 'return=representation',
  });
  return typeof body === 'string' ? JSON.parse(body) : body;
}

module.exports = {
  createOrder,
  captureOrder,
  PAYPAL_ENV,
  PAYPAL_CLIENT_ID,
  isConfigured,
};
