'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useCart } from '@/components/cart/CartProvider';
import useCheckout from '@/components/checkout/useCheckout';
import useCartReprice from '@/components/checkout/useCartReprice';
import type { CheckoutPriceChange } from '@/lib/checkout/price-change';
import type { CartLineItem } from '@/lib/cart';
import type { CheckoutCountry } from '@/lib/checkout/locations';
import type { Money } from '@/lib/money';

type CheckoutFlowValue = ReturnType<typeof useCheckout> & {
  /**
   * The lines this checkout operates on — the cart's *selected* subset, not
   * the whole cart. A line a buyer left unchecked on `/cart` was never
   * awaited here in the first place, so it is never quoted, priced, or
   * charged by anything downstream of this provider.
   */
  items: CartLineItem[];
  itemCount: number;
  subtotal: Money;
  /**
   * Whether the cart itself has nothing in it, as opposed to having items
   * with none of them selected. `CheckoutFlowChrome` needs both empty states
   * kept apart — "add something" and "go back and check something off" are
   * different instructions, and conflating them would send a buyer with a
   * full but fully-deselected cart to the home page instead of back to it.
   */
  cartIsEmpty: boolean;
  /**
   * Lines whose price moved between the cart and this checkout. Empty on the
   * ordinary path; the summary renders a notice when it is not.
   */
  priceChanges: CheckoutPriceChange[];
  /**
   * Drop a line from the order summary. Writes the cart and invalidates the
   * quote in one call, so no caller can do the first without the second.
   */
  removeLine: (lineId: string) => void;
};

const CheckoutFlowContext = createContext<CheckoutFlowValue | undefined>(
  undefined,
);

/**
 * Holds the checkout flow's state for the whole of `/checkout`,
 * `/checkout/delivery`, and `/checkout/payment`.
 *
 * It is rendered from the flow's `layout.tsx` rather than from any one page,
 * and that placement is the entire point: Next keeps a layout mounted while the
 * buyer moves between its child routes, so the address, the courier quote, the
 * selection, and the Stripe client secret survive the steps. Put this in a page
 * instead and every navigation would unmount it and lose the checkout.
 *
 * It does not survive a full reload, which is deliberate rather than a gap —
 * the alternative was persisting a name, phone, email, and street address into
 * web storage, and the steps bounce to the start of checkout instead.
 *
 * `initialCountry` is the buyer's resolved destination, already narrowed to a
 * country checkout accepts. The layout reads it because only a Server Component
 * can, and hands it down here — this provider is the boundary it has to cross.
 */
export function CheckoutFlowProvider({
  children,
  initialCountry,
  initialEmail,
}: {
  children: ReactNode;
  initialCountry?: CheckoutCountry;
  /** The signed-in account's own address, seeded into the contact field. */
  initialEmail?: string | undefined;
}) {
  const {
    selectedItems: items,
    selectedItemCount: itemCount,
    selectedSubtotal: subtotal,
    items: cartItems,
    removeItem,
  } = useCart();
  const cartIsEmpty = cartItems.length === 0;
  // Before anything is totalled. This rewrites the cart's stored prices, so
  // `items` and `subtotal` below are already the corrected ones. Repriced by
  // the same subset that is about to be charged — an unselected line's price
  // moving does not need this checkout's attention.
  const { changes: priceChanges, applyServerChanges } = useCartReprice(items);
  const checkout = useCheckout(
    items,
    subtotal,
    initialCountry,
    initialEmail,
    applyServerChanges,
  );

  const { invalidateQuote } = checkout;

  /*
    Removing a line is a cart write *and* an invalidation, and the two cannot be
    separated — which is why the summary is given this rather than the cart's own
    `removeItem`.

    A courier quote is priced for one basket. Drop an item and the prices on the
    delivery step, the selected option, and any Stripe session already prepared
    all belong to an order the buyer is no longer placing. `invalidateQuote`
    already exists for the address edit, whose argument is identical: paying
    against a session created for something else is the failure either way. The
    buyer re-quotes, which is the honest cost of changing their mind here.
  */
  const removeLine = useCallback(
    (lineId: string) => {
      removeItem(lineId);
      invalidateQuote();
    },
    [removeItem, invalidateQuote],
  );

  const value = useMemo<CheckoutFlowValue>(
    () => ({
      ...checkout,
      items,
      itemCount,
      subtotal,
      cartIsEmpty,
      priceChanges,
      removeLine,
    }),
    [
      checkout,
      items,
      itemCount,
      subtotal,
      cartIsEmpty,
      priceChanges,
      removeLine,
    ],
  );

  return <CheckoutFlowContext value={value}>{children}</CheckoutFlowContext>;
}

export function useCheckoutFlow(): CheckoutFlowValue {
  const context = useContext(CheckoutFlowContext);

  if (!context) {
    throw new Error(
      'useCheckoutFlow must be used within a CheckoutFlowProvider.',
    );
  }

  return context;
}
