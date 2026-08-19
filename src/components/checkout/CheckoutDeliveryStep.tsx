'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutAddressRecap from '@/components/checkout/CheckoutAddressRecap';
import CheckoutShippingOptions from '@/components/checkout/CheckoutShippingOptions';
import { useCheckoutFlow } from '@/components/checkout/CheckoutFlowProvider';
import { formatMoney } from '@/lib/money';

/**
 * Step 2: choose a courier for every package.
 *
 * "Go to payment" creates the Stripe session *here*, then navigates, which is
 * what lets the payment step mount Stripe on arrival instead of behind another
 * button. It is also the last point at which a buyer can change the order, so
 * the total shown beside the button is the amount they are about to be asked
 * for.
 */
export default function CheckoutDeliveryStep() {
  const router = useRouter();
  const {
    address,
    shippingQuote,
    selectedShipping,
    isPending,
    disabled,
    message,
    shipping,
    total,
    refreshQuote,
    selectShipping,
    preparePayment,
  } = useCheckoutFlow();

  /*
   * Reached without a quote — a reload, or a pasted URL. The flow state lives
   * in memory in the layout, so there is nothing to recover; the address is
   * what is missing and the information step is where it is entered.
   */
  useEffect(() => {
    if (shippingQuote === null && !isPending) {
      router.replace('/checkout');
    }
  }, [isPending, router, shippingQuote]);

  if (shippingQuote === null) {
    return (
      <p className="text-sm text-ink-muted">Returning to your details...</p>
    );
  }

  return (
    <>
      <CheckoutAddressRecap
        address={address}
        disabled={isPending}
        onEdit={() => router.push('/checkout')}
      />
      <CheckoutShippingOptions
        quote={shippingQuote}
        selected={selectedShipping}
        disabled={isPending}
        onQuote={refreshQuote}
        onSelect={selectShipping}
      />
      <section
        aria-labelledby="checkout-delivery-total-heading"
        className="rounded-xl border border-border bg-white p-4"
      >
        <h2 id="checkout-delivery-total-heading" className="sr-only">
          Delivery total
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">
              Shipping {formatMoney(shipping)}
            </p>
            <p className="font-display text-2xl font-semibold text-ink">
              {formatMoney(total)}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              preparePayment(() => router.push('/checkout/payment'))
            }
            className="bg-brand-gradient min-h-11 shrink-0 rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:bg-none disabled:text-ink-faint disabled:hover:opacity-100 disabled:active:scale-100"
          >
            {isPending ? 'Preparing payment...' : 'Go to payment'}
          </button>
        </div>
        <p aria-live="polite" className="mt-3 text-sm text-red-600">
          {message ?? ''}
        </p>
      </section>
    </>
  );
}
