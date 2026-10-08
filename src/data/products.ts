export interface Product {
  id: string;
  name: string;
  weightKg: number;
  price: number; // in euros
  description: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'batter-1kg',
    name: 'Dosa Batter 1 kg',
    weightKg: 1,
    price: 5.5,
    description: 'Freshly ground, fermented dosa batter. Serves 2-3 people.',
  },
  {
    id: 'batter-4kg',
    name: 'Dosa Batter 4 kg',
    weightKg: 4,
    price: 20,
    description: 'Family pack of fresh dosa batter. Best value for gatherings.',
  },
];

export const CURRENCY = '€';

// Single pickup location for all orders.
export const PICKUP_ADDRESS = 'Königstraße 20, 01097 Dresden';

export function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} ${CURRENCY}`;
}
