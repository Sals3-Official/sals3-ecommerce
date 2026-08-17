'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import useCheckout from '@/components/checkout/useCheckout';
import CheckoutAddressForm from '@/components/checkout/CheckoutAddressForm';
import CheckoutAddressRecap from '@/components/checkout/CheckoutAddressRecap';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import CheckoutPaymentSection from '@/components/checkout/CheckoutPaymentSection';
import CheckoutShippingOptions from '@/components/checkout/CheckoutShippingOptions';
import CheckoutStepper from '@/components/checkout/CheckoutStepper';

export default function CheckoutPageClient() {
  const { items, itemCount, subtotal } = useCart();
  const checkout = useCheckout(items, subtotal);
  const { step, isPending, message } = checkout;
  const stepContentRef = useRef<HTMLElement>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    // Skip the initial mount so page load does not steal focus.
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      return;
    }

    window.scrollTo({ top: 0 });
    stepContentRef.current?.focus({ preventScroll: true });
  }, [step]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <h1 className="mb-1.5 text-xl font-bold">Checkout</h1>
        <p className="mb-4 text-sm text-ink-muted">
          Your cart is empty. Add an item before checkout.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:no-underline hover:opacity-90 active:scale-[0.98]"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Secure checkout
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Checkout
          </h1>
        </div>
        <CheckoutStepper
          step={step}
          disabled={isPending}
          onEditInformation={checkout.backToInformation}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section
          ref={stepContentRef}
          tabIndex={-1}
          aria-label={step === 1 ? 'Information' : 'Delivery and payment'}
          className="flex flex-col gap-4 outline-none"
        >
          {step === 1 ? (
            <>
              <CheckoutAddressForm
                value={checkout.address}
                errors={checkout.errors}
                disabled={isPending}
                onChange={checkout.updateAddress}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">
                  Nothing is charged yet. Delivery options and the final total
                  come next.
                </p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={checkout.continueToDelivery}
                  className="bg-brand-gradient min-h-11 shrink-0 rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-none disabled:bg-surface-sunken disabled:text-ink-faint disabled:hover:opacity-100 disabled:active:scale-100"
                >
                  {isPending
                    ? 'Loading delivery options...'
                    : 'Continue to delivery'}
                </button>
              </div>
              <p aria-live="polite" className="text-sm text-red-600">
                {message ?? ''}
              </p>
            </>
          ) : (
            <>
              <CheckoutAddressRecap
                address={checkout.address}
                disabled={isPending}
                onEdit={checkout.backToInformation}
              />
              <CheckoutShippingOptions
                quote={checkout.shippingQuote}
                selected={checkout.selectedShipping}
                disabled={isPending}
                onQuote={checkout.refreshQuote}
                onSelect={checkout.selectShipping}
              />
              <CheckoutPaymentSection
                total={checkout.total}
                isPending={isPending}
                disabled={checkout.disabled}
                message={message}
                onSubmit={checkout.submit}
                onBack={checkout.backToInformation}
              />
            </>
          )}
        </section>
        <CheckoutOrderSummary
          items={items}
          itemCount={itemCount}
          shipping={checkout.selectedShipping}
        />
      </div>
    </div>
  );
}
