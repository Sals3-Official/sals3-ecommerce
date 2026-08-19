'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import CheckoutStepper, {
  type CheckoutStep,
} from '@/components/checkout/CheckoutStepper';
import { useCheckoutFlow } from '@/components/checkout/CheckoutFlowProvider';

const STEP_BY_PATH: Record<string, CheckoutStep> = {
  '/checkout': 1,
  '/checkout/delivery': 2,
  '/checkout/payment': 3,
};

const STEP_LABEL: Record<CheckoutStep, string> = {
  1: 'Information',
  2: 'Delivery',
  3: 'Payment',
};

/**
 * Everything the three checkout routes share: the heading, the progress
 * stepper, and the order summary.
 *
 * The summary lives here rather than inside a step so information and delivery
 * both carry it — a buyer choosing a courier can see what they are buying and
 * what it costs without navigating back.
 *
 * Payment is the exception, and gets the full width instead. Stripe's embedded
 * checkout renders its own itemised summary — every line, the shipping row, and
 * the total — so keeping ours beside it would put two copies of the same
 * numbers on one screen, competing to be believed, while squeezing the payment
 * form nobody can afford to have cramped. The totals the payment step prints
 * above the form cover the sanity check the sidebar was there for.
 */
export default function CheckoutFlowChrome({
  children,
}: {
  children: ReactNode;
}) {
  const { items, itemCount, selectedShipping, isPending } = useCheckoutFlow();
  const pathname = usePathname();
  const step = STEP_BY_PATH[pathname] ?? 1;
  const showsSummary = step !== 3;
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
          className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:no-underline active:scale-[0.98]"
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
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
            Secure checkout
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Checkout
          </h1>
        </div>
        <CheckoutStepper step={step} disabled={isPending} />
      </div>
      <div
        className={
          showsSummary
            ? 'grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'
            : 'grid grid-cols-1 gap-6'
        }
      >
        <section
          ref={stepContentRef}
          tabIndex={-1}
          aria-label={STEP_LABEL[step]}
          className="flex flex-col gap-4 outline-none"
        >
          {children}
        </section>
        {showsSummary ? (
          <CheckoutOrderSummary
            items={items}
            itemCount={itemCount}
            shipping={selectedShipping}
          />
        ) : null}
      </div>
    </div>
  );
}
