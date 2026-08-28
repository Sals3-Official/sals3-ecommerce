'use client';

import { useCallback, useState, useTransition } from 'react';
import type { CartState } from '@/lib/cart';
import type { CheckoutAddress } from '@/lib/checkout/schema';
import type { SelectedShippingQuote } from '@/lib/checkout/shipping-selection';
import { quoteCheckoutShippingAction } from '@/app/checkout/actions';
import type { CheckoutFreightQuoteResponse } from '@/services/storefront/schemas';

export function toCheckoutCart(items: CartState['items']) {
  return {
    items: items.map((line) => ({
      productId: line.productId,
      ...(line.variant?.id === undefined ? {} : { variantId: line.variant.id }),
      quantity: line.quantity,
    })),
  };
}

/**
 * Pre-selects Standard for each package.
 *
 * A fresh quote used to arrive with nothing selected, which left "Go to
 * payment" disabled until the buyer noticed the radios — every order needs a
 * courier per package, so defaulting to the first one CJ returns costs the
 * buyer a click and still lets them pick another.
 *
 * Derived here, where the quote lands, rather than in an effect on the
 * delivery step: an effect would render the disabled state first and then
 * re-render to correct it.
 */
function firstOptionPerPackage(
  quote: CheckoutFreightQuoteResponse,
): SelectedShippingQuote[] {
  return quote.packages.flatMap((pkg) => {
    const standard = quote.quotes.find(
      (option) =>
        option.packageId === pkg.packageId &&
        option.shippingTier === 'Standard',
    );

    return standard === undefined ? [] : [standard];
  });
}

/**
 * Owns the courier-quote state: the fetched quote, the buyer's selected
 * option per package, and the fetch transition. `onMessage` surfaces
 * failures to the caller's single user-facing message region.
 */
export default function useShippingQuote(
  items: CartState['items'],
  onMessage: (message: string | null) => void,
) {
  const [shippingQuote, setShippingQuote] =
    useState<CheckoutFreightQuoteResponse | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<
    SelectedShippingQuote[]
  >([]);
  const [isQuotePending, startTransition] = useTransition();

  const clearQuote = useCallback(() => {
    setShippingQuote(null);
    setSelectedShipping([]);
  }, []);

  const fetchQuote = useCallback(
    (address: CheckoutAddress, onSuccess?: () => void) => {
      onMessage(null);
      startTransition(async () => {
        const result = await quoteCheckoutShippingAction({
          cart: toCheckoutCart(items),
          address,
        });

        if (result.ok) {
          setShippingQuote(result.quote);
          setSelectedShipping(firstOptionPerPackage(result.quote));
          onSuccess?.();
          return;
        }

        onMessage(result.message);
      });
    },
    [items, onMessage],
  );

  const selectShipping = useCallback(
    (next: SelectedShippingQuote) => {
      setSelectedShipping((current) => [
        ...current.filter((item) => item.packageId !== next.packageId),
        next,
      ]);
      onMessage(null);
    },
    [onMessage],
  );

  return {
    shippingQuote,
    selectedShipping,
    isQuotePending,
    clearQuote,
    fetchQuote,
    selectShipping,
  };
}
