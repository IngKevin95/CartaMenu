export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export type Cart = Record<string, CartItem>;

export function addItem(
  cart: Cart,
  item: { id: string; name: string; price: number }
): Cart {
  const existing = cart[item.id];
  return {
    ...cart,
    [item.id]: existing
      ? { ...existing, qty: existing.qty + 1 }
      : { id: item.id, name: item.name, price: item.price, qty: 1 },
  };
}

export function changeQty(cart: Cart, id: string, delta: number): Cart {
  const existing = cart[id];
  if (!existing) return cart;
  const qty = existing.qty + delta;
  if (qty <= 0) {
    const rest = { ...cart };
    delete rest[id];
    return rest;
  }
  return { ...cart, [id]: { ...existing, qty } };
}

export function total(cart: Cart): number {
  return Object.values(cart).reduce((sum, i) => sum + i.price * i.qty, 0);
}

export interface OrderPayload {
  name: string;
  email: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  timestamp: string;
}

export function toOrderPayload(
  cart: Cart,
  customer: { name: string; email: string }
): OrderPayload {
  return {
    name: customer.name,
    email: customer.email,
    items: Object.values(cart).map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
    total: total(cart),
    timestamp: new Date().toISOString(),
  };
}
