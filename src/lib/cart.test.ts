import { describe, expect, it } from 'vitest';
import {
  addCartItem,
  cartLineId,
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
import { usd } from './money';

function lineFixture(
  overrides: Partial<CartLineItem> = {},
): Omit<CartLineItem, 'quantity'> {
  return {
    productId: '1',
    title: 'Essence Mascara Lash Princess',
    imageUrl: 'https://cdn.dummyjson.com/product-images/beauty/1/1.webp',
    imageAlt: 'Essence Mascara Lash Princess product image',
    tone: 'ocean',
    unitPrice: usd(99900),
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
      lineFixture({ productId: '1', unitPrice: usd(10000) }),
      2,
    );
    state = addCartItem(
      state,
      lineFixture({ productId: '2', unitPrice: usd(5000) }),
      1,
    );

    expect(getCartLineTotal(state.items[0]!)).toEqual(usd(20000));
    expect(getCartSubtotal(state)).toEqual(usd(25000));
  });
});

describe('variant-aware line identity', () => {
  function variantLine(id: string) {
    return {
      ...lineFixture(),
      variant: { id, sku: `SKU-${id}`, optionSummary: id },
    };
  }

  /**
   * Two variants of one product are two lines. Before this, identity was the
   * product slug alone, so adding Black then White silently merged them into
   * one line at quantity two — a buyer would be charged for two of whichever
   * arrived first.
   */
  it('keeps two variants of the same product as separate lines', () => {
    const state = addCartItem(
      addCartItem(EMPTY_CART, variantLine('black')),
      variantLine('white'),
    );

    expect(state.items).toHaveLength(2);
    expect(getCartItemCount(state)).toBe(2);
  });

  it('merges the same variant added twice into one line', () => {
    const state = addCartItem(
      addCartItem(EMPTY_CART, variantLine('black')),
      variantLine('black'),
    );

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!.quantity).toBe(2);
  });

  it('addresses a line by its composite id', () => {
    const state = addCartItem(
      addCartItem(EMPTY_CART, variantLine('black')),
      variantLine('white'),
    );
    const blackId = cartLineId(state.items[0]!.productId, 'black');

    expect(removeCartItem(state, blackId).items).toHaveLength(1);
    expect(setCartItemQuantity(state, blackId, 4).items[0]!.quantity).toBe(4);
  });

  it('still addresses a variant-less line by its product id', () => {
    const state = addCartItem(EMPTY_CART, lineFixture());
    const id = cartLineId(state.items[0]!.productId);

    expect(removeCartItem(state, id).items).toEqual([]);
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

  /**
   * A v1 blob is PHP-priced. It is discarded rather than converted: converting a
   * saved price invents a price that was never quoted to that buyer. Nothing is
   * lost — `/checkout` does not exist and no order has ever been placed.
   */
  it('discards a v1 PHP cart instead of converting its prices', () => {
    const v1 = JSON.stringify({
      items: [
        {
          productId: 'air-cooler',
          title: 'Quiet tower air cooler',
          imageAlt: 'Quiet tower air cooler',
          tone: 'ocean',
          unitPrice: { amountMinor: 199900, currency: 'PHP' },
          quantity: 1,
        },
      ],
    });

    expect(parseCartState(v1)).toEqual(EMPTY_CART);
  });

  it('rejects a line whose variant shape is malformed', () => {
    const tampered = JSON.stringify({
      items: [
        {
          ...addCartItem(EMPTY_CART, lineFixture()).items[0],
          variant: { sku: 'no-id' },
        },
      ],
    });

    expect(parseCartState(tampered)).toEqual(EMPTY_CART);
  });
});
