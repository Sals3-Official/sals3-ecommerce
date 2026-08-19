'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { useCheckoutFlow } from '@/components/checkout/CheckoutFlowProvider';
import Spinner from '@/components/ui/Spinner';
import { getStripePromise } from '@/services/stripe/browser';

/**
 * Step 3: pay. Stripe's embedded form, and nothing else of ours.
 *
 * There is no submit button. The delivery step created the Stripe session
 * before navigating, so the form is mounted on arrival — the buyer lands ready
 * to pay rather than pressing a second button to reach a payment form they
 * thought they had already opened.
 *
 * Everything we used to draw around it is gone: no wrapper card, no border, no
 * order summary, no totals panel. The embedded form renders its own card, its
 * own itemised list, its own shipping row, and its own total, so each of those
 * was a second copy of the same numbers competing to be believed, and the
 * wrapper cost the form width to say nothing new. The one consequence worth
 * knowing: the page shows no amount until Stripe finishes loading, because
 * Stripe is now the only thing that states it.
 */
export default function CheckoutPaymentStep() {
  const router = useRouter();
  const { stripeClientSecret, message, isPending } = useCheckoutFlow();
  const stripePromise = getStripePromise();

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
      <p aria-live="polite" className="text-sm text-red-600">
        {message ?? ''}
      </p>

      {stripePromise === null ? (
        <p className="text-sm text-red-600">
          Stripe checkout is not configured.
        </p>
      ) : (
        /*
         * The spinner sits behind the mount point rather than being toggled by
         * a ready callback, because `EmbeddedCheckout` does not expose one. It
         * is what the buyer sees while Stripe's iframe is still empty, and the
         * iframe simply covers it once it has painted — no flag to get wrong,
         * and nothing left spinning if the load is slow.
         */
        <div className="relative min-h-[520px] w-full">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" className="text-brand-blue-500" />
            <p className="font-display text-sm font-bold tracking-[0.18em] text-ink-muted uppercase">
              Loading payment
            </p>
          </div>
          <div className="relative">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret: stripeClientSecret }}
            >
              <EmbeddedCheckout className="w-full" />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
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
