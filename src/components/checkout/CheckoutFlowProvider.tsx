'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import useCheckout from '@/components/checkout/useCheckout';
import type { CartLineItem } from '@/lib/cart';
import type { Money } from '@/lib/money';

type CheckoutFlowValue = ReturnType<typeof useCheckout> & {
  items: CartLineItem[];
  itemCount: number;
  subtotal: Money;
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
 */
export function CheckoutFlowProvider({ children }: { children: ReactNode }) {
  const { items, itemCount, subtotal } = useCart();
  const checkout = useCheckout(items, subtotal);

  const value = useMemo<CheckoutFlowValue>(
    () => ({ ...checkout, items, itemCount, subtotal }),
    [checkout, items, itemCount, subtotal],
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
