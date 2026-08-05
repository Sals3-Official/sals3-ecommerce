import { z } from 'zod';
import { multiplyMoney, sumMoney, type Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';

export const MAX_LINE_QUANTITY = 20;
export const CART_STORAGE_KEY = 'sals3-cart-v1';

export type CartLineItem = {
  productId: string;
  title: string;
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
  currency: z.literal('PHP'),
});

const CartLineItemSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
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
  const existingIndex = state.items.findIndex(
    (line) => line.productId === item.productId,
  );

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

export function removeCartItem(state: CartState, productId: string): CartState {
  return {
    items: state.items.filter((line) => line.productId !== productId),
  };
}

export function setCartItemQuantity(
  state: CartState,
  productId: string,
  quantity: number,
): CartState {
  const nextQuantity = clampQuantity(quantity);

  if (nextQuantity <= 0) {
    return removeCartItem(state, productId);
  }

  return {
    items: state.items.map((line) =>
      line.productId === productId ? { ...line, quantity: nextQuantity } : line,
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
