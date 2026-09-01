import { z } from 'zod';
import {
  multiplyMoney,
  sumMoney,
  SUPPORTED_CURRENCIES,
  type Money,
} from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';

export const MAX_LINE_QUANTITY = 20;

/**
 * Bumped from `v1` for two format changes that happened together: the stored
 * currency moved from PHP to USD, and a line's identity became variant-aware.
 *
 * `parseCartState` already discards anything that fails the schema, so a v1
 * blob would have emptied the cart either way. The key bump makes that explicit
 * rather than incidental, and lets the old blob be deleted.
 *
 * There is deliberately **no PHP→USD conversion** of a stored line. Converting
 * a saved price invents a price that was never quoted to that buyer. The cost of
 * discarding is zero: `/checkout` does not exist and no order has ever been
 * placed.
 */
export const CART_STORAGE_KEY = 'sals3-cart-v2';

/** Removed on first hydrate. A cart blob is purchase intent, so it is not left behind. */
export const LEGACY_CART_STORAGE_KEYS = ['sals3-cart-v1'] as const;

/**
 * Which paid checkouts have already emptied the cart.
 *
 * Without this the receipt would empty the cart every time it rendered, and the
 * receipt is a page buyers come back to: Back after browsing on, a link from
 * history, a second tab. Any of those would wipe a cart filled *after* the
 * purchase. Keyed by Stripe session id, so each checkout clears exactly once.
 *
 * The list is capped because it only exists to answer "have I already handled
 * this id" for a receipt the buyer might revisit; older ids lead to receipts
 * whose carts are long gone.
 */
export const CLEARED_CHECKOUTS_STORAGE_KEY = 'sals3-cleared-checkouts-v1';

const MAX_REMEMBERED_CHECKOUTS = 10;

const ClearedCheckoutsSchema = z.array(z.string().min(1).max(200));

function parseClearedCheckouts(raw: string | null): string[] {
  if (raw === null) {
    return [];
  }

  try {
    const result = ClearedCheckoutsSchema.safeParse(JSON.parse(raw));

    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** True when this checkout has already emptied the cart once. */
export function hasClearedCheckout(
  raw: string | null,
  sessionId: string,
): boolean {
  return parseClearedCheckouts(raw).includes(sessionId);
}

/** The next value to store, newest first and capped. */
export function rememberClearedCheckout(
  raw: string | null,
  sessionId: string,
): string {
  const existing = parseClearedCheckouts(raw).filter((id) => id !== sessionId);

  return JSON.stringify(
    [sessionId, ...existing].slice(0, MAX_REMEMBERED_CHECKOUTS),
  );
}

export type CartLineVariant = {
  id: string;
  sku?: string;
  /** "Black · XL". Display only — never parsed back into options. */
  optionSummary?: string;
};

export type CartLineItem = {
  /** The product slug. Still the PDP link and the analytics key. */
  productId: string;
  /** Absent for a product with no option axes — one implicit variant. */
  variant?: CartLineVariant;
  title: string;
  category?: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  unitPrice: Money;
  quantity: number;
};

export type CartState = {
  items: CartLineItem[];
  /**
   * The opt-out set, not the opt-in one. A newly added line is never in here,
   * so it is selected the moment it exists — no separate "select the new
   * item" step is needed on add, and an old `sals3-cart-v2` blob written
   * before selection existed parses with this absent, defaulting to
   * everything selected rather than everything hidden from checkout.
   */
  deselectedLineIds: string[];
};

export type CartToastMessage = {
  id: number;
  text: string;
};

export const EMPTY_CART: CartState = { items: [], deselectedLineIds: [] };

const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

const CartLineVariantSchema = z.object({
  id: z.string().min(1).max(120),
  sku: z.string().min(1).max(80).optional(),
  optionSummary: z.string().min(1).max(120).optional(),
});

const CartLineItemSchema = z.object({
  productId: z.string().min(1),
  variant: CartLineVariantSchema.optional(),
  title: z.string().min(1),
  category: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  imageAlt: z.string(),
  tone: z.enum(['ocean', 'dusk', 'meadow', 'clay']),
  unitPrice: MoneySchema,
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const CartStateSchema = z.object({
  items: z.array(CartLineItemSchema),
  deselectedLineIds: z.array(z.string()).default([]),
});

/**
 * A cart line's identity.
 *
 * Derived, never stored: a stored composite key would be a second source of
 * truth that could drift from the fields it was built from. Two variants of the
 * same product are two lines; the same variant added twice is one line at
 * quantity two.
 */
export function cartLineId(productId: string, variantId?: string): string {
  return variantId === undefined ? productId : `${productId}::${variantId}`;
}

export function lineIdOf(line: CartLineItem): string {
  return cartLineId(line.productId, line.variant?.id);
}

/**
 * localStorage is client-controlled and can be edited or corrupted outside
 * the app (devtools, an old schema version). Never trust it directly.
 */
export function parseCartState(raw: string | null): CartState {
  if (!raw) {
    return EMPTY_CART;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = CartStateSchema.safeParse(parsed);

    return result.success ? result.data : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function clampQuantity(quantity: number): number {
  return Math.min(Math.max(Math.round(quantity), 0), MAX_LINE_QUANTITY);
}

export function addCartItem(
  state: CartState,
  item: Omit<CartLineItem, 'quantity'>,
  quantity = 1,
): CartState {
  const id = cartLineId(item.productId, item.variant?.id);
  const existingIndex = state.items.findIndex((line) => lineIdOf(line) === id);

  if (existingIndex === -1) {
    const nextQuantity = clampQuantity(quantity);

    if (nextQuantity <= 0) {
      return state;
    }

    return {
      ...state,
      items: [...state.items, { ...item, quantity: nextQuantity }],
    };
  }

  const existing = state.items[existingIndex]!;
  const nextQuantity = clampQuantity(existing.quantity + quantity);

  return {
    ...state,
    items: state.items.map((line, index) =>
      index === existingIndex ? { ...line, quantity: nextQuantity } : line,
    ),
  };
}

/**
 * Replaces the stored unit price on the lines named, leaving the rest alone.
 *
 * A cart line freezes the price it was added at, which is right for a cart —
 * nothing should change under a shopper while they browse. It stops being right
 * at checkout, where that stored figure was being totalled and shown while
 * Stripe was charging the Portal's current price. Repricing is therefore an
 * explicit step the checkout takes, not something the cart does on its own.
 *
 * Keyed by `lineIdOf` so a product held in two variants reprices each
 * separately, and unknown ids are ignored rather than appended: this only ever
 * corrects lines that are already here.
 */
export function repriceCartItems(
  state: CartState,
  prices: { lineId: string; unitPrice: Money }[],
): CartState {
  const byLine = new Map(
    prices.map((entry) => [entry.lineId, entry.unitPrice]),
  );

  return {
    ...state,
    items: state.items.map((line) => {
      const next = byLine.get(lineIdOf(line));

      if (next === undefined) return line;
      if (
        next.amountMinor === line.unitPrice.amountMinor &&
        next.currency === line.unitPrice.currency
      ) {
        return line;
      }

      return { ...line, unitPrice: next };
    }),
  };
}

export function removeCartItem(state: CartState, lineId: string): CartState {
  return {
    items: state.items.filter((line) => lineIdOf(line) !== lineId),
    // Dropped alongside the line rather than left as a dead id: nothing reads
    // an entry for a line that no longer exists, but a growing pile of stale
    // ids is still a leak nothing would ever notice.
    deselectedLineIds: state.deselectedLineIds.filter((id) => id !== lineId),
  };
}

export function setCartItemQuantity(
  state: CartState,
  lineId: string,
  quantity: number,
): CartState {
  const nextQuantity = clampQuantity(quantity);

  if (nextQuantity <= 0) {
    return removeCartItem(state, lineId);
  }

  return {
    ...state,
    items: state.items.map((line) =>
      lineIdOf(line) === lineId ? { ...line, quantity: nextQuantity } : line,
    ),
  };
}

/** True unless the line was explicitly opted out — see `CartState.deselectedLineIds`. */
export function isLineSelected(state: CartState, lineId: string): boolean {
  return !state.deselectedLineIds.includes(lineId);
}

export function selectedItemsOf(state: CartState): CartLineItem[] {
  return state.items.filter((line) => isLineSelected(state, lineIdOf(line)));
}

export function setLineSelected(
  state: CartState,
  lineId: string,
  selected: boolean,
): CartState {
  const without = state.deselectedLineIds.filter((id) => id !== lineId);

  return {
    ...state,
    deselectedLineIds: selected ? without : [...without, lineId],
  };
}

/**
 * Narrows selection to exactly one line, deselecting every other.
 *
 * "Buy Now" needs this: it adds a line to a cart that may already hold
 * others, and only the line just bought should be checked out with it — the
 * rest of the cart's own selection is a separate decision the buyer already
 * made or has yet to.
 */
export function selectOnlyLine(state: CartState, lineId: string): CartState {
  return {
    ...state,
    deselectedLineIds: state.items.map(lineIdOf).filter((id) => id !== lineId),
  };
}

export function selectAllLines(state: CartState): CartState {
  return { ...state, deselectedLineIds: [] };
}

export function deselectAllLines(state: CartState): CartState {
  return { ...state, deselectedLineIds: state.items.map(lineIdOf) };
}

/**
 * Removes exactly the lines that are currently selected, leaving anything
 * deselected untouched, and resets selection so what remains starts fully
 * selected again for the next checkout.
 *
 * This is what a paid checkout calls instead of emptying the cart outright:
 * once selection exists, "the whole cart" and "what was just bought" are
 * different sets, and wiping the former would delete items the buyer
 * deliberately excluded and never paid for.
 */
export function clearSelectedItems(state: CartState): CartState {
  const deselected = new Set(state.deselectedLineIds);

  return {
    items: state.items.filter((line) => deselected.has(lineIdOf(line))),
    deselectedLineIds: [],
  };
}

export function getCartItemCount(state: CartState): number {
  return state.items.reduce((total, line) => total + line.quantity, 0);
}

export function getCartLineTotal(line: CartLineItem): Money {
  return multiplyMoney(line.unitPrice, line.quantity);
}

export function getCartSubtotal(state: CartState): Money {
  return sumMoney(state.items.map(getCartLineTotal));
}

/** Same as `getCartItemCount`, restricted to what is selected. */
export function getSelectedItemCount(state: CartState): number {
  return selectedItemsOf(state).reduce(
    (total, line) => total + line.quantity,
    0,
  );
}

/** Same as `getCartSubtotal`, restricted to what is selected. */
export function getSelectedSubtotal(state: CartState): Money {
  return sumMoney(selectedItemsOf(state).map(getCartLineTotal));
}
