# Dosa Batter

A simple mobile app for selling fresh dosa batter, built with Expo + React Native (TypeScript).

## Products

| Product            | Weight | Price |
| ------------------ | ------ | ----- |
| Dosa Batter 1 kg   | 1 kg   | 5.50 €|
| Dosa Batter 4 kg   | 4 kg   | 20 €  |

Pickup location: Königstraße 20, 01097 Dresden.

## Features

- Top-right menu for navigation (Shop, Cart, My orders, Notifications)
- Cart with quantity controls and euro totals
- Checkout with a popup calendar (earliest pickup = order date + 2 days) and
  weekday/weekend time slots
- Payment step with **real PayPal login/checkout** (web), plus Card (Stripe,
  still mocked) and Cash on pickup
- Order tracking with a status timeline
- Customer / Owner role switch (menu): the owner sees incoming orders and marks
  them Preparing / Ready / Picked up; the customer gets a notification on each
  change

## Roles and notifications

This is a client app with in-memory state and no backend, so the owner view and
the notification feed are simulated locally to demonstrate the real data flow:

- Placing an order notifies the **owner** ("New order") and confirms to the
  **customer**.
- When the owner advances an order's status, the **customer** is notified
  (e.g. "Ready for pickup").

In production these events come from a server over push / email / SMS, and the
owner view would be a separate authenticated app or dashboard. Payments are
mocked in `src/data/payments.ts`; real Stripe/PayPal charges require a backend
because secret keys cannot live in a mobile app.

## Getting started

```bash
npm install
npm start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, `w` for web,
or scan the QR code with the Expo Go app on your phone.

## Real PayPal checkout

PayPal login/checkout runs on the **web** target and needs the backend in
`server/` running. Full guide: [`server/README.md`](./server/README.md).

Quick start (two terminals), using PayPal **Sandbox** test accounts:

```bash
# terminal 1 - backend (needs server/.env with your sandbox credentials)
cd server
npm install
npm start            # http://localhost:4000

# terminal 2 - app on web
npm run web          # http://localhost:8081
```

On the Payment screen choose PayPal, click the PayPal button, and log in with a
**sandbox personal account**. The order is only placed after the server
confirms the capture completed. No real money moves in sandbox.

If the app runs on a different host than the backend, point it at the backend
with `EXPO_PUBLIC_API_URL`, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
npm run web`.

Card (Stripe) is still simulated; wiring it up would follow the same
server-side pattern as PayPal.

## Project structure

```
App.tsx                      Navigation + providers
src/data/products.ts         Product catalog and price formatting
src/state/CartContext.tsx    Cart state (add / remove / totals)
src/screens/ShopScreen.tsx   Product listing
src/screens/CartScreen.tsx   Cart review
src/screens/CheckoutScreen.tsx  Delivery form + confirmation
src/theme.ts                 Shared colors
```
