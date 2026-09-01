'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import type { CartState } from '@/lib/cart';
import type { CheckoutAddress } from '@/lib/checkout/schema';
import type { CheckoutCountry } from '@/lib/checkout/locations';
import { money, type Money } from '@/lib/money';
import useCheckoutAddress from '@/components/checkout/useCheckoutAddress';
import useShippingQuote, {
  toCheckoutCart,
} from '@/components/checkout/useShippingQuote';
import type { SelectedShippingQuote } from '@/lib/checkout/shipping-selection';
import { createCheckoutSessionAction } from '@/app/checkout/actions';
import type { RepricedLine } from '@/lib/checkout/price-change';

const INVALID_ADDRESS_MESSAGE = 'Check the highlighted address fields.';

/**
 * Identifies the exact order a Stripe session was created for.
 *
 * Splitting checkout across routes handed buyers a Back button, and without
 * this every bounce between delivery and payment would mint a fresh Portal
 * intent, a fresh Stripe session, and another CJ freight re-quote — the sort of
 * per-navigation supplier call the operating contract's CJ call budget exists
 * to prevent. Selections are sorted so the same choices in a different click
 * order still compare equal.
 */
function paymentSignature(
  address: CheckoutAddress,
  selected: SelectedShippingQuote[],
): string {
  return JSON.stringify({
    address,
    selected: [...selected].sort((left, right) =>
      left.packageId.localeCompare(right.packageId),
    ),
  });
}

/**
 * Owns the checkout flow's data: the address, the courier quote, the buyer's
 * selection, and the Stripe client secret.
 *
 * It deliberately does **not** own which step is showing — the URL does that
 * now (`/checkout`, `/checkout/delivery`, `/checkout/payment`). The two
 * `prepare*` calls take a callback the caller uses to navigate, so this hook
 * stays free of routing and the pages stay free of business rules.
 *
 * Mounted once by `CheckoutFlowProvider` in the flow layout, which is what
 * keeps the state alive as the buyer moves between those routes.
 *
 * `initialCountry` is passed straight through to `useCheckoutAddress`. This
 * hook has no opinion about it — it is here only because the flow layout is the
 * one component that can read the destination, and this is the path from there
 * to the form.
 */
export default function useCheckout(
  items: CartState['items'],
  subtotal: Money,
  initialCountry?: CheckoutCountry,
  initialEmail?: string,
  /**
   * Called when the pay attempt is refused because a price moved. It writes the
   * corrected prices onto the cart and raises the notice, so the buyer's second
   * press is against the figure they can now see.
   */
  onPriceChanged?: (changed: RepricedLine[]) => void,
) {
  const [message, setMessage] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  const preparedSignatureRef = useRef<string | null>(null);
  const [isSubmitPending, startTransition] = useTransition();

  const clearPreparedPayment = useCallback(() => {
    setStripeClientSecret(null);
    preparedSignatureRef.current = null;
  }, []);

  const {
    shippingQuote,
    selectedShipping,
    isQuotePending,
    clearQuote,
    fetchQuote,
    selectShipping,
  } = useShippingQuote(items, setMessage);

  // Editing the address invalidates the quote *and* any prepared payment: the
  // session was created for the old address, and paying against it would ship
  // to somewhere the buyer has since corrected.
  const invalidateQuote = useCallback(() => {
    clearQuote();
    clearPreparedPayment();
  }, [clearPreparedPayment, clearQuote]);

  const { address, errors, updateAddress, validateAddress, emailLocked } =
    useCheckoutAddress(invalidateQuote, initialCountry, initialEmail);

  const isPending = isQuotePending || isSubmitPending;
  const allPackagesSelected =
    shippingQuote !== null &&
    selectedShipping.length === shippingQuote.packages.length;
  const disabled = isPending || items.length === 0 || !allPackagesSelected;
  const shippingTotal = selectedShipping.reduce(
    (total, selected) => total + selected.amountMinor,
    0,
  );
  const shipping = money(shippingTotal, subtotal.currency);
  const total = money(subtotal.amountMinor + shippingTotal, subtotal.currency);

  const requireValidAddress = useCallback((): boolean => {
    if (validateAddress()) return true;

    setMessage(INVALID_ADDRESS_MESSAGE);
    return false;
  }, [validateAddress]);

  /** Information step: quote the address, then let the caller navigate. */
  const prepareDelivery = useCallback(
    (onReady: () => void) => {
      if (!requireValidAddress()) return;

      // A live quote proves the address is unchanged since it was fetched (any
      // edit clears it), so skip the rate-limited re-fetch and keep the
      // buyer's selection.
      if (shippingQuote !== null) {
        setMessage(null);
        onReady();
        return;
      }

      fetchQuote(address, onReady);
    },
    [address, fetchQuote, requireValidAddress, shippingQuote],
  );

  /**
   * Delivery step: create the Stripe session, then let the caller navigate —
   * so the payment page renders with a client secret already in hand and mounts
   * Stripe immediately instead of behind a second button.
   */
  const preparePayment = useCallback(
    (onReady: () => void) => {
      if (!requireValidAddress()) return;

      if (!allPackagesSelected) {
        setMessage('Choose a delivery option before payment.');
        return;
      }

      const signature = paymentSignature(address, selectedShipping);

      if (
        stripeClientSecret !== null &&
        preparedSignatureRef.current === signature
      ) {
        setMessage(null);
        onReady();
        return;
      }

      setMessage(null);
      clearPreparedPayment();
      startTransition(async () => {
        const result = await createCheckoutSessionAction({
          cart: toCheckoutCart(items),
          address,
          shippingSelection: { packageSelections: selectedShipping },
        });

        if (result.ok) {
          setStripeClientSecret(result.clientSecret);
          preparedSignatureRef.current = signature;
          onReady();
          return;
        }

        // Not an error the buyer caused, and not one they can fix by retrying
        // blindly: the summary has to be corrected before the message beside it
        // means anything.
        if (result.priceChanged !== undefined) {
          onPriceChanged?.(result.priceChanged);
        }

        setMessage(result.message);
      });
    },
    [
      address,
      allPackagesSelected,
      clearPreparedPayment,
      items,
      onPriceChanged,
      requireValidAddress,
      selectedShipping,
      stripeClientSecret,
    ],
  );

  const refreshQuote = useCallback(() => {
    clearPreparedPayment();
    fetchQuote(address);
  }, [address, clearPreparedPayment, fetchQuote]);

  const selectShippingOption = useCallback(
    (next: SelectedShippingQuote) => {
      // The prepared session priced the previous choice.
      clearPreparedPayment();
      selectShipping(next);
    },
    [clearPreparedPayment, selectShipping],
  );

  return {
    address,
    errors,
    updateAddress,
    emailLocked,
    message,
    setMessage,
    stripeClientSecret,
    shippingQuote,
    selectedShipping,
    isPending,
    disabled,
    shipping,
    total,
    prepareDelivery,
    preparePayment,
    refreshQuote,
    selectShipping: selectShippingOption,
    /*
      Exposed so removing a line from the order summary can invalidate the same
      two things editing the address does. A quote is priced for one basket: drop
      an item and both the courier prices and any prepared Stripe session belong
      to an order the buyer is no longer placing.
    */
    invalidateQuote,
  };
}
