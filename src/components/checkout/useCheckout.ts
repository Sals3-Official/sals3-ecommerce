'use client';

import { useCallback, useState, useTransition } from 'react';
import type { CartState } from '@/lib/cart';
import { money, type Money } from '@/lib/money';
import useCheckoutAddress from '@/components/checkout/useCheckoutAddress';
import useShippingQuote, {
  toCheckoutCart,
} from '@/components/checkout/useShippingQuote';
import { createCheckoutSessionAction } from '@/app/checkout/actions';

export type CheckoutStep = 1 | 2;

const INVALID_ADDRESS_MESSAGE = 'Check the highlighted address fields.';

/**
 * Owns the checkout flow: the current step, the user-facing message, and
 * the submit transition. Composes `useCheckoutAddress` (which reports edits
 * so the quote is invalidated whenever the address changes) and
 * `useShippingQuote`. Step 2 is only reachable with a fetched quote:
 * `continueToDelivery` reuses a live quote for an unchanged address and
 * otherwise fetches one, advancing only on success.
 */
export default function useCheckout(
  items: CartState['items'],
  subtotal: Money,
) {
  const [step, setStep] = useState<CheckoutStep>(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitPending, startTransition] = useTransition();

  const {
    shippingQuote,
    selectedShipping,
    isQuotePending,
    clearQuote,
    fetchQuote,
    selectShipping,
  } = useShippingQuote(items, setMessage);

  const { address, errors, updateAddress, validateAddress } =
    useCheckoutAddress(clearQuote);

  const isPending = isQuotePending || isSubmitPending;
  const allPackagesSelected =
    shippingQuote !== null &&
    selectedShipping.length === shippingQuote.packages.length;
  const disabled = isPending || items.length === 0 || !allPackagesSelected;
  const shippingTotal = selectedShipping.reduce(
    (total, selected) => total + selected.amountMinor,
    0,
  );
  const total = money(subtotal.amountMinor + shippingTotal, subtotal.currency);

  const requireValidAddress = useCallback((): boolean => {
    if (validateAddress()) return true;

    setMessage(INVALID_ADDRESS_MESSAGE);
    return false;
  }, [validateAddress]);

  const continueToDelivery = useCallback(() => {
    if (!requireValidAddress()) return;

    // A live quote proves the address is unchanged since it was fetched
    // (any edit clears it), so skip the rate-limited re-fetch and keep the
    // buyer's selection.
    if (shippingQuote !== null) {
      setMessage(null);
      setStep(2);
      return;
    }

    fetchQuote(address, () => setStep(2));
  }, [address, fetchQuote, requireValidAddress, shippingQuote]);

  const backToInformation = useCallback(() => {
    setMessage(null);
    setStep(1);
  }, []);

  const refreshQuote = useCallback(() => {
    fetchQuote(address);
  }, [address, fetchQuote]);

  const submit = useCallback(() => {
    if (!requireValidAddress()) return;

    if (!allPackagesSelected) {
      setMessage('Choose a delivery option before payment.');
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction({
        cart: toCheckoutCart(items),
        address,
        shippingSelection: { packageSelections: selectedShipping },
      });

      if (result.ok) {
        window.location.assign(result.url);
        return;
      }

      setMessage(result.message);
    });
  }, [
    address,
    allPackagesSelected,
    items,
    requireValidAddress,
    selectedShipping,
  ]);

  return {
    step,
    address,
    errors,
    updateAddress,
    message,
    shippingQuote,
    selectedShipping,
    isPending,
    disabled,
    total,
    continueToDelivery,
    backToInformation,
    refreshQuote,
    selectShipping,
    submit,
  };
}
