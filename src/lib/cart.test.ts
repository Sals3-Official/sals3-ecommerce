import { describe, expect, it } from 'vitest';
import {
  addCartItem,
  cartLineId,
  clearSelectedItems,
  deselectAllLines,
  EMPTY_CART,
  getCartItemCount,
  getCartLineTotal,
  getCartSubtotal,
  getSelectedItemCount,
  getSelectedSubtotal,
  hasClearedCheckout,
  isLineSelected,
  lineIdOf,
  MAX_LINE_QUANTITY,
  parseCartState,
  rememberClearedCheckout,
  removeCartItem,
  selectAllLines,
  selectedItemsOf,
  selectOnlyLine,
  setCartItemQuantity,
  setLineSelected,
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

describe('selection', () => {
  function twoLines() {
    let state = addCartItem(EMPTY_CART, lineFixture({ productId: '1' }), 1);
    state = addCartItem(state, lineFixture({ productId: '2' }), 1);
    return state;
  }

  it('is selected by default — the opt-out set starts empty', () => {
    const state = addCartItem(EMPTY_CART, lineFixture(), 1);

    expect(isLineSelected(state, '1')).toBe(true);
    expect(selectedItemsOf(state)).toEqual(state.items);
  });

  it('a newly added line joins selected, never opted out', () => {
    let state = twoLines();
    state = setLineSelected(state, '1', false);
    // Adding a third line must not silently exclude it just because
    // something else in the cart happens to be deselected right now.
    state = addCartItem(state, lineFixture({ productId: '3' }), 1);

    expect(isLineSelected(state, '3')).toBe(true);
    expect(isLineSelected(state, '1')).toBe(false);
  });

  it('toggles one line without touching the others', () => {
    let state = twoLines();
    state = setLineSelected(state, '1', false);

    expect(isLineSelected(state, '1')).toBe(false);
    expect(isLineSelected(state, '2')).toBe(true);
    expect(selectedItemsOf(state).map((line) => line.productId)).toEqual(['2']);
  });

  it('re-selecting a deselected line removes it from the opt-out set', () => {
    let state = twoLines();
    state = setLineSelected(state, '1', false);
    state = setLineSelected(state, '1', true);

    expect(isLineSelected(state, '1')).toBe(true);
    expect(state.deselectedLineIds).toEqual([]);
  });

  it('selectOnlyLine narrows to exactly one line — the "Buy Now" case', () => {
    const state = selectOnlyLine(twoLines(), '2');

    expect(isLineSelected(state, '1')).toBe(false);
    expect(isLineSelected(state, '2')).toBe(true);
    // The other line is still in the cart, only its selection changed.
    expect(state.items).toHaveLength(2);
  });

  it('selectAllLines clears every opt-out', () => {
    let state = twoLines();
    state = deselectAllLines(state);
    state = selectAllLines(state);

    expect(state.deselectedLineIds).toEqual([]);
    expect(selectedItemsOf(state)).toEqual(state.items);
  });

  it('deselectAllLines opts every current line out', () => {
    const state = deselectAllLines(twoLines());

    expect(selectedItemsOf(state)).toEqual([]);
  });

  it('counts and totals only the selected subset', () => {
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
    state = setLineSelected(state, '2', false);

    expect(getSelectedItemCount(state)).toBe(2);
    expect(getSelectedSubtotal(state)).toEqual(usd(20000));
    // The whole-cart totals are unaffected by selection.
    expect(getCartItemCount(state)).toBe(3);
    expect(getCartSubtotal(state)).toEqual(usd(25000));
  });

  it('removing a line also drops it from the opt-out set', () => {
    let state = twoLines();
    state = setLineSelected(state, '1', false);
    state = removeCartItem(state, '1');

    expect(state.deselectedLineIds).toEqual([]);
  });

  describe('clearSelectedItems', () => {
    it('removes only the selected lines and resets selection on what remains', () => {
      let state = twoLines();
      state = setLineSelected(state, '2', false);

      const cleared = clearSelectedItems(state);

      expect(cleared.items.map((line) => line.productId)).toEqual(['2']);
      expect(cleared.deselectedLineIds).toEqual([]);
      // What remains is fully selected again, ready for the next checkout.
      expect(isLineSelected(cleared, '2')).toBe(true);
    });

    it('empties the cart when everything was selected — the ordinary checkout', () => {
      const cleared = clearSelectedItems(twoLines());

      expect(cleared.items).toEqual([]);
    });

    it('is a no-op on lines when nothing is selected', () => {
      const state = deselectAllLines(twoLines());
      const cleared = clearSelectedItems(state);

      expect(cleared.items).toHaveLength(2);
    });
  });

  it('addresses selection by composite line id, like every other mutator', () => {
    function variantLine(id: string) {
      return {
        ...lineFixture(),
        variant: { id, sku: `SKU-${id}`, optionSummary: id },
      };
    }

    const state = addCartItem(
      addCartItem(EMPTY_CART, variantLine('black')),
      variantLine('white'),
    );
    const blackId = lineIdOf(state.items[0]!);
    const withoutBlack = setLineSelected(state, blackId, false);

    expect(selectedItemsOf(withoutBlack)).toHaveLength(1);
    expect(selectedItemsOf(withoutBlack)[0]?.variant?.id).toBe('white');
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
   * A cart saved before selection existed has no `deselectedLineIds` at all —
   * not an empty array, the key is simply absent. It must default to "nothing
   * opted out" rather than being rejected outright: the schema change is
   * additive, and a buyer's existing purchase intent should not be discarded
   * over a field that did not exist yet when it was written.
   */
  it('defaults selection to everything selected on a pre-selection blob', () => {
    const preSelectionBlob = JSON.stringify({
      items: addCartItem(EMPTY_CART, lineFixture(), 2).items,
    });

    const parsed = parseCartState(preSelectionBlob);

    expect(parsed.deselectedLineIds).toEqual([]);
    expect(selectedItemsOf(parsed)).toEqual(parsed.items);
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

describe('cleared checkout bookkeeping', () => {
  it('reports a checkout that has not emptied the cart yet', () => {
    expect(hasClearedCheckout(null, 'cs_1')).toBe(false);
    expect(hasClearedCheckout('["cs_2"]', 'cs_1')).toBe(false);
  });

  it('reports a checkout that already emptied the cart', () => {
    const stored = rememberClearedCheckout(null, 'cs_1');

    expect(hasClearedCheckout(stored, 'cs_1')).toBe(true);
  });

  /*
   * The receipt is a page buyers return to. Re-clearing on a second visit would
   * wipe a cart filled after the purchase, which reads as the app losing data.
   */
  it('stays recorded across repeated visits to the same receipt', () => {
    const first = rememberClearedCheckout(null, 'cs_1');
    const second = rememberClearedCheckout(first, 'cs_1');

    expect(JSON.parse(second)).toEqual(['cs_1']);
    expect(hasClearedCheckout(second, 'cs_1')).toBe(true);
  });

  it('keeps the ten most recent checkouts, newest first', () => {
    const stored = Array.from({ length: 12 }, (_unused, index) => index).reduce(
      (raw, index) => rememberClearedCheckout(raw, `cs_${index}`),
      null as string | null,
    );
    const ids = JSON.parse(stored ?? '[]') as string[];

    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe('cs_11');
    expect(hasClearedCheckout(stored, 'cs_0')).toBe(false);
  });

  it('treats unreadable storage as nothing cleared rather than throwing', () => {
    expect(hasClearedCheckout('not json', 'cs_1')).toBe(false);
    expect(hasClearedCheckout('{"not":"an array"}', 'cs_1')).toBe(false);
    expect(JSON.parse(rememberClearedCheckout('not json', 'cs_1'))).toEqual([
      'cs_1',
    ]);
  });
});
