'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { useCheckoutFlow } from '@/components/checkout/CheckoutFlowProvider';
import { formatMoney, money } from '@/lib/money';
import { getStripePromise } from '@/services/stripe/browser';

/**
 * Step 3: pay.
 *
 * There is no submit button here. The delivery step created the Stripe session
 * before navigating, so the embedded form is mounted on arrival — the buyer
 * lands ready to pay rather than pressing a second button to reach a payment
 * form they thought they had already opened.
 *
 * Two blocks, deliberately: a small card carrying the amounts, then Stripe at
 * the page's full width with no frame of our own. The embedded form already
 * draws its own card, its own itemised summary, and its own borders; wrapping
 * it in a second bordered box put two nested frames on screen and narrowed the
 * form for no gain. The totals stay above it because they are the one thing
 * Stripe cannot show before it finishes loading — and shipping is the line most
 * likely to be the surprise, so it is broken out rather than folded into a
 * single number.
 */
export default function CheckoutPaymentStep() {
  const router = useRouter();
  const { items, stripeClientSecret, shipping, total, message, isPending } =
    useCheckoutFlow();
  const stripePromise = getStripePromise();
  const merchandise = money(
    total.amountMinor - shipping.amountMinor,
    total.currency,
  );

  /*
   * No prepared session means a reload or a pasted URL: the client secret lives
   * in memory in the layout and there is nothing to recover. Delivery cannot
   * re-quote without the address either, so the buyer goes back to the start.
   */
  useEffect(() => {
    if (stripeClientSecret === null && !isPending) {
      router.replace('/checkout');
    }
  }, [isPending, router, stripeClientSecret]);

  if (stripeClientSecret === null) {
    return (
      <p className="text-sm text-ink-muted">Returning to your details...</p>
    );
  }

  return (
    <>
      <section
        aria-labelledby="checkout-payment-heading"
        className="rounded-xl border border-border bg-white p-4"
      >
        <h2
          id="checkout-payment-heading"
          className="font-display text-xl font-semibold"
        >
          Payment
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pay by card or eligible bank debit. Sals3 does not store card or bank
          details.
        </p>
        <dl className="mt-4 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">
              {items.length === 1 ? '1 item' : `${items.length} items`}
            </dt>
            <dd className="font-semibold text-ink">
              {formatMoney(merchandise)}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Shipping</dt>
            <dd className="font-semibold text-ink">{formatMoney(shipping)}</dd>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2">
            <dt className="font-semibold text-ink">Total today</dt>
            <dd className="font-display text-2xl font-semibold text-ink">
              {formatMoney(total)}
            </dd>
          </div>
        </dl>
        <p aria-live="polite" className="mt-3 text-sm text-red-600">
          {message ?? ''}
        </p>
      </section>

      {stripePromise === null ? (
        <p className="text-sm text-red-600">
          Stripe checkout is not configured.
        </p>
      ) : (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret: stripeClientSecret }}
        >
          <EmbeddedCheckout className="w-full" />
        </EmbeddedCheckoutProvider>
      )}

      <div>
        <button
          type="button"
          onClick={() => router.push('/checkout/delivery')}
          className="min-h-11 rounded-lg border border-border-strong px-4 text-sm font-bold text-ink transition-all duration-200 hover:border-brand-600 hover:text-brand-600 active:scale-[0.98]"
        >
          Back to delivery
        </button>
      </div>
    </>
  );
}
