import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { Product } from '../data/products';
import {
  AppNotification,
  Customer,
  NotificationAudience,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PickupSlot,
  STATUS_META,
  shortOrderId,
} from '../data/orders';
import {
  createRemoteOrder,
  fetchRemoteOrders,
  updateRemoteOrderStatus,
} from '../data/ordersApi';

export interface CartLine {
  product: Product;
  quantity: number;
}

export type Role = 'customer' | 'owner';

interface StoreState {
  lines: Record<string, CartLine>;
  orders: Order[];
  notifications: AppNotification[];
  role: Role;
}

type StoreAction =
  | { type: 'ADD'; product: Product }
  | { type: 'DECREMENT'; productId: string }
  | { type: 'REMOVE'; productId: string }
  | { type: 'CLEAR' }
  | { type: 'PLACE_ORDER'; order: Order; notifications: AppNotification[]; keepCart?: boolean }
  | { type: 'SYNC_ORDERS'; orders: Order[] }
  | { type: 'SET_STATUS'; orderId: string; status: OrderStatus; notification: AppNotification }
  | { type: 'MARK_PAID'; orderId: string }
  | { type: 'REMOVE_ORDER'; orderId: string }
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'MARK_READ'; audience: NotificationAudience };

const initialState: StoreState = {
  lines: {},
  orders: [],
  notifications: [],
  role: 'customer',
};

// Persist cart/orders/notifications/role across reloads. This matters on web
// because paying through Stripe triggers a full-page redirect that wipes the
// in-memory store. We persist `lines` too so that cancelling a Stripe payment
// returns to the Payment screen with the cart intact (the web flow only clears
// the cart on CONFIRMED success).
const PERSIST_KEY = 'dosa-store-v1';

function loadPersisted(): StoreState {
  if (typeof window === 'undefined' || !window.localStorage) return initialState;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<StoreState>;
    return {
      lines: saved.lines ?? {},
      orders: saved.orders ?? [],
      notifications: saved.notifications ?? [],
      role: saved.role ?? 'customer',
    };
  } catch {
    return initialState;
  }
}

function savePersisted(state: StoreState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const { lines, orders, notifications, role } = state;
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ lines, orders, notifications, role })
    );
  } catch {
    // storage full / unavailable - non-fatal, state just won't persist
  }
}

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.lines[action.product.id];
      const quantity = (existing?.quantity ?? 0) + 1;
      return {
        ...state,
        lines: {
          ...state.lines,
          [action.product.id]: { product: action.product, quantity },
        },
      };
    }
    case 'DECREMENT': {
      const existing = state.lines[action.productId];
      if (!existing) return state;
      const quantity = existing.quantity - 1;
      const lines = { ...state.lines };
      if (quantity <= 0) {
        delete lines[action.productId];
      } else {
        lines[action.productId] = { ...existing, quantity };
      }
      return { ...state, lines };
    }
    case 'REMOVE': {
      const lines = { ...state.lines };
      delete lines[action.productId];
      return { ...state, lines };
    }
    case 'CLEAR':
      return { ...state, lines: {} };
    case 'PLACE_ORDER':
      return {
        ...state,
        // Clear the cart unless the caller wants to keep it. The web Stripe flow
        // keeps it so a cancel / browser-back doesn't lose the cart before the
        // payment is actually confirmed; it is cleared on confirmed success.
        lines: action.keepCart ? state.lines : {},
        orders: [action.order, ...state.orders],
        notifications: [...action.notifications, ...state.notifications],
      };
    case 'SYNC_ORDERS': {
      // Replace the order list with the server's authoritative copy (owner
      // polling). Merge any purely-local orders not yet on the server so a
      // just-placed order never flickers out before its POST lands.
      const serverIds = new Set(action.orders.map((o) => o.id));
      const localOnly = state.orders.filter((o) => !serverIds.has(o.id));
      const merged = [...action.orders, ...localOnly].sort(
        (a, b) => b.createdAt - a.createdAt
      );
      return { ...state, orders: merged };
    }
    case 'MARK_PAID': {
      const orders = state.orders.map((o) =>
        o.id === action.orderId ? { ...o, paymentStatus: 'paid' as const } : o
      );
      return { ...state, orders };
    }
    case 'REMOVE_ORDER': {
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.orderId),
      };
    }
    case 'SET_STATUS': {
      const orders = state.orders.map((o) =>
        o.id === action.orderId ? { ...o, status: action.status } : o
      );
      return {
        ...state,
        orders,
        notifications: [action.notification, ...state.notifications],
      };
    }
    case 'SET_ROLE':
      return { ...state, role: action.role };
    case 'MARK_READ': {
      const notifications = state.notifications.map((n) =>
        n.audience === action.audience ? { ...n, read: true } : n
      );
      return { ...state, notifications };
    }
    default:
      return state;
  }
}

export interface PlaceOrderInput {
  lines: CartLine[];
  total: number;
  pickup: PickupSlot;
  customer: Customer;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  // When true, the cart is NOT emptied on placing the order. Used by the web
  // Stripe flow, which must create a pending order before redirecting but keep
  // the cart so a cancel/back doesn't lose it before payment is confirmed.
  keepCart?: boolean;
}

interface StoreContextValue {
  // Cart
  lines: CartLine[];
  itemCount: number;
  total: number;
  add: (product: Product) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  quantityOf: (productId: string) => number;
  // Orders
  orders: Order[];
  placeOrder: (input: PlaceOrderInput) => Order;
  getOrder: (orderId: string) => Order | undefined;
  setStatus: (orderId: string, status: OrderStatus) => void;
  markPaid: (orderId: string) => void;
  removeOrder: (orderId: string) => void;
  // Role
  role: Role;
  setRole: (role: Role) => void;
  // Notifications
  notifications: AppNotification[];
  notificationsFor: (audience: NotificationAudience) => AppNotification[];
  unreadCount: (audience: NotificationAudience) => number;
  markRead: (audience: NotificationAudience) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Rehydrate persisted orders/notifications/role (lazy init runs once).
  const [state, dispatch] = useReducer(storeReducer, undefined, loadPersisted);

  // Persist whenever the durable parts of the store change.
  useEffect(() => {
    savePersisted(state);
  }, [state]);

  // All builds poll the shared server so order changes propagate between
  // devices without a manual refresh:
  //  - owner sees newly placed customer orders, and
  //  - customer sees status changes the owner makes (placed -> preparing ...).
  // The server copy is authoritative; SYNC_ORDERS merges in any purely-local
  // order whose POST hasn't landed yet, so nothing flickers out.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const remote = await fetchRemoteOrders();
        if (!cancelled) dispatch({ type: 'SYNC_ORDERS', orders: remote });
      } catch {
        // Server unreachable / not configured - keep showing local state.
      }
    };

    sync(); // immediate first fetch
    const timer = setInterval(sync, 10000); // then every 10s
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const value = useMemo<StoreContextValue>(() => {
    const lines = Object.values(state.lines);
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const total = lines.reduce((sum, l) => sum + l.quantity * l.product.price, 0);

    return {
      lines,
      itemCount,
      total,
      add: (product) => dispatch({ type: 'ADD', product }),
      decrement: (productId) => dispatch({ type: 'DECREMENT', productId }),
      remove: (productId) => dispatch({ type: 'REMOVE', productId }),
      clear: () => dispatch({ type: 'CLEAR' }),
      quantityOf: (productId) => state.lines[productId]?.quantity ?? 0,

      orders: state.orders,
      placeOrder: (input) => {
        const order: Order = {
          id: makeId('ord'),
          createdAt: Date.now(),
          lines: input.lines,
          total: input.total,
          pickup: input.pickup,
          customer: input.customer,
          status: 'placed',
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
        };
        // Notify the owner of the new order, and confirm to the customer.
        const now = Date.now();
        const ownerNote: AppNotification = {
          id: makeId('ntf'),
          audience: 'owner',
          orderId: order.id,
          title: `New order #${shortOrderId(order.id)}`,
          body: `${order.customer.name} ordered ${order.lines.reduce(
            (n, l) => n + l.quantity,
            0
          )} item(s). Pickup ${order.pickup.label}.`,
          createdAt: now,
          read: false,
        };
        const customerNote: AppNotification = {
          id: makeId('ntf'),
          audience: 'customer',
          orderId: order.id,
          title: 'Order confirmed',
          body: `We received order #${shortOrderId(order.id)}. We'll let you know when it's ready.`,
          createdAt: now,
          read: false,
        };
        dispatch({
          type: 'PLACE_ORDER',
          order,
          notifications: [ownerNote, customerNote],
          keepCart: input.keepCart,
        });
        // Only push the order to the shared server (so the owner sees it) when
        // it is a REAL order. An online order that hasn't been paid yet
        // (stripe/paypal + pending) is just a placeholder created before the
        // payment redirect - it must NOT reach the owner unless/until payment
        // is confirmed (that happens in markPaid). Cash orders are real at
        // placement (pay at pickup), so they sync immediately.
        const isUnpaidOnlineOrder =
          order.paymentStatus !== 'paid' && order.paymentMethod !== 'cash';
        if (!isUnpaidOnlineOrder) {
          // Best-effort: the local order is already placed, so a network/server
          // failure here must not break checkout.
          createRemoteOrder(order).catch((err) => {
            console.warn('[orders] failed to sync new order to server:', err?.message);
          });
        }
        return order;
      },
      getOrder: (orderId) => state.orders.find((o) => o.id === orderId),
      markPaid: (orderId) => {
        dispatch({ type: 'MARK_PAID', orderId });
        // Payment is now confirmed, so this is the moment the order becomes
        // real: push it to the shared server (as paid) so the owner sees it.
        // For online orders this is the FIRST time it reaches the server - the
        // unpaid placeholder was intentionally never synced.
        const order = state.orders.find((o) => o.id === orderId);
        if (order) {
          createRemoteOrder({ ...order, paymentStatus: 'paid' }).catch((err) => {
            console.warn('[orders] failed to sync paid order to server:', err?.message);
          });
        }
      },
      removeOrder: (orderId) => dispatch({ type: 'REMOVE_ORDER', orderId }),
      setStatus: (orderId, status) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (!order) return;
        // Status changes are driven by the owner, so the customer is notified.
        const note: AppNotification = {
          id: makeId('ntf'),
          audience: 'customer',
          orderId,
          title: `Order #${shortOrderId(orderId)}: ${STATUS_META[status].label}`,
          body: STATUS_META[status].description,
          createdAt: Date.now(),
          read: false,
        };
        dispatch({ type: 'SET_STATUS', orderId, status, notification: note });
        // Persist the status change to the shared server (owner action).
        updateRemoteOrderStatus(orderId, status).catch((err) => {
          console.warn('[orders] failed to sync status change:', err?.message);
        });
      },

      role: state.role,
      setRole: (role) => dispatch({ type: 'SET_ROLE', role }),

      notifications: state.notifications,
      notificationsFor: (audience) =>
        state.notifications.filter((n) => n.audience === audience),
      unreadCount: (audience) =>
        state.notifications.filter((n) => n.audience === audience && !n.read).length,
      markRead: (audience) => dispatch({ type: 'MARK_READ', audience }),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a CartProvider');
  return ctx;
}

export function useCart(): StoreContextValue {
  return useStore();
}

export function useOrders(): StoreContextValue {
  return useStore();
}

export function useApp(): StoreContextValue {
  return useStore();
}
