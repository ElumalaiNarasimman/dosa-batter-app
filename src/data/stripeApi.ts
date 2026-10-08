import { API_BASE_URL } from '../config';

// Client for the Stripe Checkout backend. The app never touches the Stripe
// secret; it only asks the server to create a hosted Checkout Session and then
// redirects the buyer to the returned Stripe URL.

export interface StripeConfig {
  configured: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string; // hosted checkout.stripe.com URL
}

export interface SessionStatus {
  id: string;
  paymentStatus: string; // 'paid' when complete
  status: string;
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(
      `Can't reach the payment server at ${API_BASE_URL}. Start it with "cd server && npm start".`
    );
  }
}

export async function fetchStripeConfig(): Promise<StripeConfig> {
  const res = await request('/api/stripe/config');
  return toJson<StripeConfig>(res);
}

// Ask the server to create a Checkout Session and give us the hosted URL.
export async function createStripeCheckout(
  amount: number,
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutSession> {
  const res = await request('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, successUrl, cancelUrl }),
  });
  return toJson<CheckoutSession>(res);
}

// After returning from Stripe, confirm the session was actually paid.
export async function fetchStripeSession(sessionId: string): Promise<SessionStatus> {
  const res = await request(`/api/stripe/session/${sessionId}`);
  return toJson<SessionStatus>(res);
}
