import { CartLine } from '../state/CartContext';

export type OrderStatus =
  | 'placed'
  | 'preparing'
  | 'ready'
  | 'completed';

export interface PickupSlot {
  // ISO date string of the pickup day (date only, time comes from the slot).
  dateISO: string;
  startMinutes: number;
  endMinutes: number;
  label: string; // e.g. "18:00 - 18:30"
}

export interface Customer {
  name: string;
  phone: string;
}

export type PaymentMethod = 'paypal' | 'stripe' | 'cash';

// 'pending' = cash on pickup, not yet collected.
// 'paid'    = online payment captured (mocked here).
export type PaymentStatus = 'pending' | 'paid';

export const PAYMENT_META: Record<
  PaymentMethod,
  { label: string; icon: string; blurb: string; online: boolean }
> = {
  paypal: {
    label: 'PayPal',
    icon: '🅿️',
    blurb: 'Pay securely with your PayPal account.',
    online: true,
  },
  stripe: {
    label: 'Card (Stripe)',
    icon: '💳',
    blurb: 'Pay by credit or debit card.',
    online: true,
  },
  cash: {
    label: 'Cash on pickup',
    icon: '💶',
    blurb: 'Pay in cash when you collect your order.',
    online: false,
  },
};

export interface Order {
  id: string;
  createdAt: number; // epoch ms
  lines: CartLine[];
  total: number;
  pickup: PickupSlot;
  customer: Customer;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

// Ordered list of statuses used to render the tracking timeline.
export const STATUS_FLOW: OrderStatus[] = [
  'placed',
  'preparing',
  'ready',
  'completed',
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; description: string }
> = {
  placed: {
    label: 'Order placed',
    description: 'We received your order and will start preparing it.',
  },
  preparing: {
    label: 'Preparing',
    description: 'Your fresh batter is being ground and packed.',
  },
  ready: {
    label: 'Ready for pickup',
    description: 'Your order is waiting at Königstraße 20, Dresden.',
  },
  completed: {
    label: 'Picked up',
    description: 'Order collected. Enjoy your dosas!',
  },
};

export function shortOrderId(id: string): string {
  // Show a friendly tail of the id for display.
  return id.slice(-6).toUpperCase();
}

// A notification targeted at one audience. In a real app these would be
// delivered via push / email / SMS from a backend; here they live in state
// so both the owner and customer views can show them.
export type NotificationAudience = 'owner' | 'customer';

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  orderId: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}
