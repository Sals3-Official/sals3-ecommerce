import { describe, expect, it } from 'vitest';
import {
  addCartItem,
  EMPTY_CART,
  getCartItemCount,
  getCartLineTotal,
  getCartSubtotal,
  MAX_LINE_QUANTITY,
  parseCartState,
  removeCartItem,
  setCartItemQuantity,
  type CartLineItem,
} from './cart';
import { peso } from './money';

function lineFixture(
  overrides: Partial<CartLineItem> = {},
): Omit<CartLineItem, 'quantity'> {
  return {
    productId: '1',
    title: 'Essence Mascara Lash Princess',
    imageUrl: 'https://cdn.dummyjson.com/product-images/beauty/1/1.webp',
    imageAlt: 'Essence Mascara Lash Princess product image',
    tone: 'ocean',
    unitPrice: peso(99900),
    ...overrides,
  };
}

describe('addCartItem', () => {
  it('adds a new line item with the given quantity', () => {
    const state = addCartItem(EMPTY_CART, lineFixture(), 2);

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ productId: '1', quantity: 2 });
  });

  it('increases quantity when the same product is added again', () => {
    let state = addCartItem(EMPTY_CART, lineFixture(), 1);
    state = addCartItem(state, lineFixture(), 3);

    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.quantity).toBe(4);
  });

  it('clamps quantity to the maximum line quantity', () => {
    const state = addCartItem(
      EMPTY_CART,
      lineFixture(),
      MAX_LINE_QUANTITY + 50,
    );

    expect(state.items[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('ignores a zero or negative add', () => {
    const state = addCartItem(EMPTY_CART, lineFixture(), 0);

    expect(state.items).toHaveLength(0);
  });
});

describe('setCartItemQuantity', () => {
  it('updates the quantity of an existing line', () => {
    const withItem = addCartItem(EMPTY_CART, lineFixture(), 1);
    const updated = setCartItemQuantity(withItem, '1', 5);

    expect(updated.items[0]?.quantity).toBe(5);
  });

  it('removes the line when quantity drops to zero', () => {
    const withItem = addCartItem(EMPTY_CART, lineFixture(), 1);
    const updated = setCartItemQuantity(withItem, '1', 0);

    expect(updated.items).toHaveLength(0);
  });
});

describe('removeCartItem', () => {
  it('removes a line by product id and leaves others untouched', () => {
    let state = addCartItem(EMPTY_CART, lineFixture({ productId: '1' }), 1);
    state = addCartItem(state, lineFixture({ productId: '2' }), 1);

    const updated = removeCartItem(state, '1');

    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]?.productId).toBe('2');
  });
});

describe('totals', () => {
  it('counts total quantity across lines', () => {
    let state = addCartItem(EMPTY_CART, lineFixture({ productId: '1' }), 2);
    state = addCartItem(state, lineFixture({ productId: '2' }), 3);

    expect(getCartItemCount(state)).toBe(5);
  });

  it('computes a line total and a cart subtotal', () => {
    let state = addCartItem(
      EMPTY_CART,
      lineFixture({ productId: '1', unitPrice: peso(10000) }),
      2,
    );
    state = addCartItem(
      state,
      lineFixture({ productId: '2', unitPrice: peso(5000) }),
      1,
    );

    expect(getCartLineTotal(state.items[0]!)).toEqual(peso(20000));
    expect(getCartSubtotal(state)).toEqual(peso(25000));
  });
});

describe('parseCartState', () => {
  it('returns an empty cart for null input', () => {
    expect(parseCartState(null)).toEqual(EMPTY_CART);
  });

  it('returns an empty cart for malformed JSON', () => {
    expect(parseCartState('{not json')).toEqual(EMPTY_CART);
  });

  it('rejects a tampered/invalid shape instead of trusting it', () => {
    expect(
      parseCartState(
        JSON.stringify({ items: [{ productId: '1', quantity: -5 }] }),
      ),
    ).toEqual(EMPTY_CART);
  });

  it('accepts a valid, previously-saved cart', () => {
    const state = addCartItem(EMPTY_CART, lineFixture(), 2);

    expect(parseCartState(JSON.stringify(state))).toEqual(state);
  });
});
