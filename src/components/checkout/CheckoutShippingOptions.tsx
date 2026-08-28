'use client';

import { SHIPPING_TIERS } from '@/lib/checkout/shipping-tiers';
import type { SelectedShippingQuote } from '@/lib/checkout/shipping-selection';
import type {
  CheckoutFreightQuote,
  CheckoutFreightQuoteResponse,
} from '@/services/storefront/schemas';
import CheckoutShippingTierCard from './CheckoutShippingTierCard';

type CheckoutShippingOptionsProps = {
  quote: CheckoutFreightQuoteResponse | null;
  selected: SelectedShippingQuote[];
  disabled: boolean;
  onQuote: () => void;
  onSelect: (quote: SelectedShippingQuote) => void;
};

function selectedKey(selected: SelectedShippingQuote): string {
  return `${selected.packageId}:${selected.shippingTier}:${selected.optionId}:${selected.channelId}`;
}

function quoteKey(quote: CheckoutFreightQuote): string {
  return `${quote.packageId}:${quote.shippingTier}:${quote.optionId}:${quote.channelId}`;
}

export default function CheckoutShippingOptions({
  quote,
  selected,
  disabled,
  onQuote,
  onSelect,
}: CheckoutShippingOptionsProps) {
  const selectedKeys = new Set(selected.map(selectedKey));
  const optionsByPackage = (quote?.quotes ?? []).reduce<
    Map<string, Map<CheckoutFreightQuote['shippingTier'], CheckoutFreightQuote>>
  >((packages, option) => {
    const packageOptions = packages.get(option.packageId);

    if (packageOptions === undefined) {
      packages.set(option.packageId, new Map([[option.shippingTier, option]]));
    } else {
      packageOptions.set(option.shippingTier, option);
    }

    return packages;
  }, new Map());

  return (
    <section
      aria-labelledby="checkout-shipping-heading"
      className="rounded-xl border border-border bg-white p-4"
    >
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="checkout-shipping-heading"
            className="font-display text-xl font-semibold"
          >
            Delivery
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Choose a delivery speed for each package.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onQuote}
          className="min-h-11 rounded-lg border border-brand-600 px-4 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 disabled:cursor-not-allowed disabled:border-border-strong disabled:text-ink-faint disabled:hover:bg-transparent"
        >
          Refresh options
        </button>
      </div>
      {quote === null ? null : (
        <div className="mt-4 flex flex-col gap-4">
          {quote.packages.map((pkg) => {
            const optionsByTier = optionsByPackage.get(pkg.packageId);

            return (
              <fieldset key={pkg.packageId} className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-ink">
                  Package from {pkg.originCountry}
                </legend>
                {SHIPPING_TIERS.map((tier) => {
                  const option = optionsByTier?.get(tier) ?? null;

                  return (
                    <CheckoutShippingTierCard
                      key={tier}
                      packageId={pkg.packageId}
                      tier={tier}
                      option={option}
                      checked={
                        option === null
                          ? false
                          : selectedKeys.has(quoteKey(option))
                      }
                      disabled={disabled}
                      onSelect={onSelect}
                    />
                  );
                })}
              </fieldset>
            );
          })}
        </div>
      )}
    </section>
  );
}
