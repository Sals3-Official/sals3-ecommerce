'use client';

import type { CheckoutStep } from '@/components/checkout/useCheckout';

type CheckoutStepperProps = {
  step: CheckoutStep;
  disabled: boolean;
  onEditInformation: () => void;
};

function stepNumberClass(active: boolean): string {
  return `grid h-7 w-7 place-items-center rounded-full border font-display text-xs font-semibold ${
    active
      ? 'border-brand-600 bg-brand-600 text-white'
      : 'border-border-strong text-ink-muted'
  }`;
}

function stepLabelClass(active: boolean): string {
  return `text-xs font-semibold uppercase tracking-wide ${
    active ? 'text-brand-600' : 'text-ink-muted'
  }`;
}

export default function CheckoutStepper({
  step,
  disabled,
  onEditInformation,
}: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-3">
        <li aria-current={step === 1 ? 'step' : undefined}>
          {step === 2 ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onEditInformation}
              className="flex min-h-11 items-center gap-2 rounded-lg transition-colors duration-200 hover:text-brand-600 disabled:cursor-not-allowed"
            >
              <span className={stepNumberClass(false)}>01</span>
              <span className={stepLabelClass(false)}>Information</span>
            </button>
          ) : (
            <span className="flex min-h-11 items-center gap-2">
              <span className={stepNumberClass(true)}>01</span>
              <span className={stepLabelClass(true)}>Information</span>
            </span>
          )}
        </li>
        <li aria-hidden="true">
          <span className="block h-px w-8 bg-border sm:w-12" />
        </li>
        <li aria-current={step === 2 ? 'step' : undefined}>
          <span className="flex min-h-11 items-center gap-2">
            <span className={stepNumberClass(step === 2)}>02</span>
            <span className={stepLabelClass(step === 2)}>
              Delivery &amp; payment
            </span>
          </span>
        </li>
      </ol>
    </nav>
  );
}
