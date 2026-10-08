import { API_BASE_URL } from '../config';
import { Order, OrderStatus, PaymentStatus } from './orders';

// Client for the shared order store on the server. The customer app pushes new
// orders here on checkout; the owner app polls the list and updates statuses.
// This is what lets an order placed on one device appear on another.

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

// Wrap fetch so a connection failure becomes a clear, actionable message.
async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(
      `Can't reach the order server at ${API_BASE_URL}. Start it with "cd server && npm start".`
    );
  }
}

// Push a newly placed order to the server so the owner can see it.
export async function createRemoteOrder(order: Order): Promise<Order> {
  const res = await request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  return toJson<Order>(res);
}

// Fetch all orders (owner listing). Newest first.
export async function fetchRemoteOrders(): Promise<Order[]> {
  const res = await request('/api/orders');
  return toJson<Order[]>(res);
}

// Advance an order's status (owner action).
export async function updateRemoteOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const res = await request(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return toJson<Order>(res);
}

// Mark an order paid/pending on the server (e.g. after confirming Stripe).
export async function updateRemoteOrderPayment(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<Order> {
  const res = await request(`/api/orders/${orderId}/payment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus }),
  });
  return toJson<Order>(res);
}
