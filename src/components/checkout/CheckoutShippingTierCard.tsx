'use client';

import { formatMoney } from '@/lib/money';
import {
  formatArrivalWindow,
  type ShippingTier,
} from '@/lib/checkout/shipping-tiers';
import type { SelectedShippingQuote } from '@/lib/checkout/shipping-selection';
import type { CheckoutFreightQuote } from '@/services/storefront/schemas';

type CheckoutShippingTierCardProps = {
  packageId: string;
  tier: ShippingTier;
  option: CheckoutFreightQuote | null;
  checked: boolean;
  disabled: boolean;
  onSelect: (quote: SelectedShippingQuote) => void;
};

function cardStateClass(unavailable: boolean, checked: boolean): string {
  if (unavailable) {
    return 'cursor-not-allowed border-border bg-surface-sunken';
  }

  if (checked) {
    return 'cursor-pointer border-brand-600 bg-brand-600/5';
  }

  return 'cursor-pointer border-border-strong bg-white hover:border-brand-600';
}

export default function CheckoutShippingTierCard({
  packageId,
  tier,
  option,
  checked,
  disabled,
  onSelect,
}: CheckoutShippingTierCardProps) {
  const id = `shipping-${packageId}-${tier.toLowerCase()}`;
  const unavailable = option === null;
  const price =
    option === null
      ? '\u00a0'
      : formatMoney({
          amountMinor: option.amountMinor,
          currency: option.currency,
        });
  const regularPrice =
    option?.regularAmountMinor === undefined
      ? null
      : formatMoney({
          amountMinor: option.regularAmountMinor,
          currency: option.currency,
        });
  const isFree = option?.amountMinor === 0;

  return (
    <label
      htmlFor={id}
      className={`grid min-h-20 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border p-3 transition-colors duration-200 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${cardStateClass(unavailable, checked)}`}
    >
      <input
        id={id}
        type="radio"
        name={`shipping-${packageId}`}
        checked={checked}
        disabled={disabled || unavailable}
        onChange={() => {
          if (option !== null) onSelect(option);
        }}
        aria-label={
          unavailable ? `${tier}, unavailable for this package` : tier
        }
        className="mt-1 h-5 w-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      />
      <span className="min-w-0">
        <span
          className={`block text-sm font-bold ${unavailable ? 'text-ink-muted' : 'text-ink'}`}
        >
          {tier}
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          {unavailable
            ? 'Unavailable for this package'
            : `Estimated ${formatArrivalWindow(option.arrivalTime)} days`}
        </span>
      </span>
      <span
        aria-hidden={unavailable}
        className={`col-start-2 font-display text-base font-semibold text-ink sm:col-start-3 sm:row-start-1 sm:self-center ${unavailable ? 'invisible' : ''}`}
      >
        {isFree ? (
          <span className="flex items-center gap-2">
            <span className="text-teal-500">FREE</span>
            {regularPrice === null ? null : (
              <span className="text-xs font-medium text-ink-muted line-through">
                {regularPrice}
              </span>
            )}
          </span>
        ) : (
          price
        )}
      </span>
    </label>
  );
}
