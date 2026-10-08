import { API_BASE_URL } from '../config';

// Thin client for the PayPal backend. All PayPal secret handling happens on the
// server; the app only exchanges the opaque order id and amounts.

export interface PayPalConfig {
  clientId: string;
  currency: string;
  env: 'sandbox' | 'live';
}

export interface CreatedOrder {
  id: string;
  status: string;
}

export interface CaptureResult {
  id: string;
  status: string; // 'COMPLETED' on success
  captureId: string | null;
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors, keep default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// Wrap fetch so a connection failure (backend not running) becomes a clear,
// actionable message instead of the browser's bare "Failed to fetch".
async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(
      `Can't reach the payment server at ${API_BASE_URL}. Start it with "cd server && npm start" (see server/README.md).`
    );
  }
}

// Public PayPal client id + environment, used to load the JS SDK on web.
export async function fetchPayPalConfig(): Promise<PayPalConfig> {
  const res = await request(`/api/paypal/config`);
  return toJson<PayPalConfig>(res);
}

// Step 1: ask the server to create a PayPal order for this amount.
export async function createPayPalOrder(amount: number): Promise<CreatedOrder> {
  const res = await request(`/api/paypal/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  return toJson<CreatedOrder>(res);
}

// Step 2: after the buyer approves in PayPal, ask the server to capture it.
export async function capturePayPalOrder(orderId: string): Promise<CaptureResult> {
  const res = await request(`/api/paypal/orders/${orderId}/capture`, {
    method: 'POST',
  });
  return toJson<CaptureResult>(res);
}

// Is the backend reachable? Used to decide whether to offer the live flow.
export async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
