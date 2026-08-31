import { describe, it, expect } from 'vitest';
import { addItem, changeQty, total, toOrderPayload, type Cart } from './cart';

describe('cart', () => {
  it('total is 0 for an empty cart', () => {
    expect(total({})).toBe(0);
  });

  it('total sums price*qty across items', () => {
    const cart: Cart = {
      a: { id: 'a', name: 'Burger', price: 10, qty: 2 },
      b: { id: 'b', name: 'Fries', price: 5, qty: 1 },
    };
    expect(total(cart)).toBe(25);
  });

  it('addItem adds a new item with qty 1', () => {
    const cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    expect(cart.a).toEqual({ id: 'a', name: 'Burger', price: 10, qty: 1 });
  });

  it('addItem increments qty for an existing item', () => {
    let cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    cart = addItem(cart, { id: 'a', name: 'Burger', price: 10 });
    expect(cart.a.qty).toBe(2);
  });

  it('changeQty removes the item when qty drops to 0', () => {
    let cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    cart = changeQty(cart, 'a', -1);
    expect(cart.a).toBeUndefined();
  });

  it('changeQty on a missing id is a no-op', () => {
    const cart: Cart = {};
    expect(changeQty(cart, 'missing', 1)).toBe(cart);
  });

  it('toOrderPayload includes a valid ISO timestamp and the correct total', () => {
    const cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    const payload = toOrderPayload(cart, { name: 'Kevin', email: 'k@example.com' });
    expect(payload.total).toBe(10);
    expect(payload.items).toEqual([{ name: 'Burger', price: 10, qty: 1 }]);
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  });
});
