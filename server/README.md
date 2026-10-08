# Dosa Batter PayPal backend

A small Express server that creates and captures PayPal orders using the
official `@paypal/paypal-server-sdk`. The PayPal **secret** lives here on the
server and never reaches the app.

## Why a server is required

PayPal's secure flow (Orders v2) splits into two parts:

- **Client**: the PayPal button + login/approval window (buyer logs into their
  own PayPal account).
- **Server (this)**: `create order` and `capture order`, both signed with your
  PayPal secret. The secret must never ship in a mobile/web app, so these two
  calls have to run server-side.

## Setup (PayPal Sandbox)

1. Create a REST app at
   https://developer.paypal.com/dashboard/applications/sandbox and copy its
   **Client ID** and **Secret**.
2. `cp .env.example .env` and paste them in. Keep `PAYPAL_ENV=sandbox` while
   testing.
3. Install and run:

   ```bash
   npm install
   npm start
   ```

   The server listens on http://localhost:4000.

4. Test a buyer login using a **sandbox personal account** from
   https://developer.paypal.com/dashboard/accounts (email + the generated
   password). No real money moves in sandbox.

## Endpoints

| Method | Path                                  | Purpose                          |
| ------ | ------------------------------------- | -------------------------------- |
| GET    | `/health`                             | Liveness + current PayPal env    |
| GET    | `/api/paypal/config`                  | Public client id for the JS SDK  |
| POST   | `/api/paypal/orders`                  | Create an order `{ amount }`     |
| POST   | `/api/paypal/orders/:orderId/capture` | Capture (charge) an order        |

## Going live

Swap the `.env` values for your **live** app credentials and set
`PAYPAL_ENV=live`. Before accepting real money you should also:

- Recompute the order total on the server from the cart (don't trust the
  client-sent amount).
- Add a webhook listener for `PAYMENT.CAPTURE.COMPLETED` to confirm payments
  out of band.
- Persist orders in a database.
