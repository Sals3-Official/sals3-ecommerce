'use client';

import Link from 'next/link';

export type CheckoutStep = 1 | 2 | 3;

const STEPS: { step: CheckoutStep; label: string; href: string }[] = [
  { step: 1, label: 'Information', href: '/checkout' },
  { step: 2, label: 'Delivery', href: '/checkout/delivery' },
  { step: 3, label: 'Payment', href: '/checkout/payment' },
];

function stepNumberClass(active: boolean): string {
  return `grid h-7 w-7 place-items-center rounded-full border font-display text-xs font-semibold ${
    active
      ? 'border-brand-600 bg-brand-600 text-white'
      : 'border-border-strong text-ink-muted'
  }`;
}

function stepLabelClass(active: boolean): string {
  return `text-xs font-semibold tracking-wide uppercase ${
    active ? 'text-brand-600' : 'text-ink-muted'
  }`;
}

/**
 * Progress through the three checkout routes.
 *
 * Only steps already completed are links. A forward step is inert markup, not a
 * disabled link: reaching payment requires a quoted address and a prepared
 * Stripe session, so an enabled link there would promise a destination that
 * would immediately bounce the buyer back.
 */
export default function CheckoutStepper({
  step,
  disabled,
}: {
  step: CheckoutStep;
  disabled: boolean;
}) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-3">
        {STEPS.map((entry, index) => (
          <li
            key={entry.step}
            className="flex items-center gap-3"
            aria-current={entry.step === step ? 'step' : undefined}
          >
            {index === 0 ? null : (
              <span
                aria-hidden="true"
                className="block h-px w-6 bg-border sm:w-10"
              />
            )}
            {entry.step < step && !disabled ? (
              <Link
                href={entry.href}
                className="flex min-h-11 items-center gap-2 rounded-lg transition-colors duration-200 hover:text-brand-600 hover:no-underline"
              >
                <span className={stepNumberClass(false)}>
                  {`0${entry.step}`}
                </span>
                <span className={stepLabelClass(false)}>{entry.label}</span>
              </Link>
            ) : (
              <span className="flex min-h-11 items-center gap-2">
                <span className={stepNumberClass(entry.step === step)}>
                  {`0${entry.step}`}
                </span>
                <span className={stepLabelClass(entry.step === step)}>
                  {entry.label}
                </span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
