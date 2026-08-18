'use client';

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { formatMoney, type Money } from '@/lib/money';
import { getStripePromise } from '@/services/stripe/browser';

type CheckoutPaymentSectionProps = {
  total: Money;
  isPending: boolean;
  disabled: boolean;
  message: string | null;
  clientSecret: string | null;
  onSubmit: () => void;
  onBack: () => void;
};

export default function CheckoutPaymentSection({
  total,
  isPending,
  disabled,
  message,
  clientSecret,
  onSubmit,
  onBack,
}: CheckoutPaymentSectionProps) {
  const stripePromise = getStripePromise();
  const canMountStripe = stripePromise !== null && clientSecret !== null;

  return (
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
        Continue to Stripe to pay by card or eligible bank debit.
      </p>
      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">Total today</p>
          <p className="font-display text-2xl font-semibold text-ink">
            {formatMoney(total)}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || clientSecret !== null}
          onClick={onSubmit}
          className="bg-brand-gradient min-h-11 rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-none disabled:bg-surface-sunken disabled:text-ink-faint disabled:hover:opacity-100 disabled:active:scale-100"
        >
          {isPending ? 'Preparing payment...' : 'Payment'}
        </button>
      </div>
      {canMountStripe ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-border-strong">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      ) : null}
      {stripePromise === null ? (
        <p className="mt-3 text-sm text-red-600">
          Stripe checkout is not configured.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-ink-faint">
        Stripe decides which enabled payment methods appear from currency and
        location. Sals3 does not store card or bank details.
      </p>
      <p aria-live="polite" className="mt-3 text-sm text-red-600">
        {message ?? ''}
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={onBack}
        className="mt-4 min-h-11 rounded-lg border border-border-strong px-4 text-sm font-bold text-ink transition-all duration-200 hover:border-brand-600 hover:text-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:border-border-strong disabled:hover:text-ink-faint"
      >
        Back to information
      </button>
    </section>
  );
}
