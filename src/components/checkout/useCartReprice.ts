'use client';

import { useEffect, useRef, useState } from 'react';
import { repriceCartAction } from '@/app/checkout/actions';
import { useCart } from '@/components/cart/CartProvider';
import { lineIdOf, type CartLineItem } from '@/lib/cart';
import type { Money } from '@/lib/money';

export type CheckoutPriceChange = {
  title: string;
  from: Money;
  to: Money;
};

/**
 * Reprices the cart once, when checkout opens, and reports what moved.
 *
 * ## Why the checkout has to ask at all
 *
 * A cart line stores the price it was added at. That is right for a cart —
 * nothing should shift under a shopper mid-browse — and wrong from the moment a
 * total is put in front of them to pay, because the amount Stripe charges is
 * read fresh from the Portal at pay time. Before this, the two were allowed to
 * disagree in silence: a buyer saw US$125.58 through Information and Delivery
 * and the card form asked for $126.87.
 *
 * ## Once, not on every step
 *
 * The three checkout routes share one mounted layout, so this runs when the
 * flow opens and not again as the buyer moves between steps. Repricing under
 * someone at the payment screen would recreate the defect in a new place —
 * a total that changes while they are reading it — and the pay path revalidates
 * server-side regardless, which is what actually protects the charge.
 *
 * ## A failure here is not a failure of checkout
 *
 * If the Portal cannot be reached the buyer keeps the prices they had and the
 * flow continues; `createCheckoutSessionAction` still validates before charging
 * anything, and it refuses a cart it cannot price. Blocking checkout on an
 * advisory read would turn a display problem into a lost order.
 */
export default function useCartReprice(items: CartLineItem[]): {
  changes: CheckoutPriceChange[];
  dismiss: () => void;
} {
  const { reprice } = useCart();
  const [changes, setChanges] = useState<CheckoutPriceChange[]>([]);
  const askedRef = useRef(false);

  useEffect(() => {
    const { current: alreadyAsked } = askedRef;

    // The cart hydrates from web storage after the first paint, so an empty
    // list here is "not loaded yet", not "nothing to price". Leaving the guard
    // unset lets the next render try again.
    if (alreadyAsked || items.length === 0) return undefined;

    askedRef.current = true;

    let cancelled = false;

    const ask = async () => {
      const result = await repriceCartAction({
        cart: {
          items: items.map((line) => ({
            productId: line.productId,
            ...(line.variant === undefined
              ? {}
              : { variantId: line.variant.id }),
            quantity: line.quantity,
          })),
        },
        carriedPrices: items.map((line) => line.unitPrice),
      });

      if (cancelled || !result.ok) return;

      reprice(
        result.lines.map((line, index) => ({
          lineId: lineIdOf(items[index]!),
          unitPrice: line.unitPrice,
        })),
      );

      setChanges(
        result.changed.map((line) => ({
          title: line.title,
          from: line.previousUnitPrice ?? line.unitPrice,
          to: line.unitPrice,
        })),
      );
    };

    // Swallowed rather than surfaced: this is advisory. `createCheckoutSession`
    // revalidates before charging and refuses a cart it cannot price, so a
    // failure here costs a stale label, not a wrong charge.
    ask().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [items, reprice]);

  return { changes, dismiss: () => setChanges([]) };
}
