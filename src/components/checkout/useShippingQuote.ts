'use client';

import { useCallback, useState, useTransition } from 'react';
import type { CartState } from '@/lib/cart';
import type { CheckoutAddress } from '@/lib/checkout/schema';
import type { SelectedShippingQuote } from '@/components/checkout/CheckoutShippingOptions';
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
          setSelectedShipping([]);
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
