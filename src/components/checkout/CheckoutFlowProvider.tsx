'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import useCheckout from '@/components/checkout/useCheckout';
import useCartReprice, {
  type CheckoutPriceChange,
} from '@/components/checkout/useCartReprice';
import type { CartLineItem } from '@/lib/cart';
import type { CheckoutCountry } from '@/lib/checkout/locations';
import type { Money } from '@/lib/money';

type CheckoutFlowValue = ReturnType<typeof useCheckout> & {
  items: CartLineItem[];
  itemCount: number;
  subtotal: Money;
  /**
   * Lines whose price moved between the cart and this checkout. Empty on the
   * ordinary path; the summary renders a notice when it is not.
   */
  priceChanges: CheckoutPriceChange[];
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
  const { items, itemCount, subtotal } = useCart();
  // Before anything is totalled. This rewrites the cart's stored prices, so
  // `items` and `subtotal` below are already the corrected ones.
  const { changes: priceChanges } = useCartReprice(items);
  const checkout = useCheckout(items, subtotal, initialCountry, initialEmail);

  const value = useMemo<CheckoutFlowValue>(
    () => ({ ...checkout, items, itemCount, subtotal, priceChanges }),
    [checkout, items, itemCount, subtotal, priceChanges],
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
