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
};

export type CartToastMessage = {
  id: number;
  text: string;
};

export const EMPTY_CART: CartState = { items: [] };

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

    return { items: [...state.items, { ...item, quantity: nextQuantity }] };
  }

  const existing = state.items[existingIndex]!;
  const nextQuantity = clampQuantity(existing.quantity + quantity);

  return {
    items: state.items.map((line, index) =>
      index === existingIndex ? { ...line, quantity: nextQuantity } : line,
    ),
  };
}

export function removeCartItem(state: CartState, lineId: string): CartState {
  return {
    items: state.items.filter((line) => lineIdOf(line) !== lineId),
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
    items: state.items.map((line) =>
      lineIdOf(line) === lineId ? { ...line, quantity: nextQuantity } : line,
    ),
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
