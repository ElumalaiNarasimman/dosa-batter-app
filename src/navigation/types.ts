import { PickupSlot } from '../data/orders';

// Draft order carried from checkout into the payment screen.
export interface OrderDraft {
  customer: { name: string; phone: string };
  pickup: PickupSlot;
}

export type RootStackParamList = {
  Shop: undefined;
  Cart: undefined;
  Checkout: undefined;
  Payment: { draft: OrderDraft };
  Orders: undefined;
  OrderTracking: { orderId: string };
  Owner: undefined;
  Notifications: undefined;
};
