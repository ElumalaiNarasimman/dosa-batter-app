import { PaymentMethod } from './orders';

export interface PaymentResult {
  success: boolean;
  reference: string; // transaction reference / confirmation id
  message?: string;
}

// ---------------------------------------------------------------------------
// Pluggable payment gateway.
//
// This is a MOCK. Real card/PayPal charges must happen on a server, because
// the secret API keys for Stripe/PayPal can never ship inside a mobile app.
// The real integration would be:
//   1. App calls your backend to create a PaymentIntent (Stripe) or Order
//      (PayPal) and gets back a client secret / approval URL.
//   2. App completes the payment with the Stripe/PayPal SDK.
//   3. Backend confirms via webhook and marks the order paid.
//
// Keeping this behind one function means swapping the mock for the real
// backend call later touches only this file.
// ---------------------------------------------------------------------------
export async function processPayment(
  method: PaymentMethod,
  amount: number
): Promise<PaymentResult> {
  // Cash is collected in person, so there is nothing to charge now.
  if (method === 'cash') {
    return {
      success: true,
      reference: 'CASH-ON-PICKUP',
      message: 'Pay in cash when you collect your order.',
    };
  }

  // Simulate a short network round-trip to a payment provider.
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const reference = `${method.toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;

  return {
    success: true,
    reference,
    message: `Mock ${method} payment of ${amount.toFixed(2)} € approved.`,
  };
}
