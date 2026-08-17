'use client';

import { formatMoney } from '@/lib/money';
import type {
  CheckoutFreightQuote,
  CheckoutFreightQuoteResponse,
} from '@/services/storefront/schemas';

export type SelectedShippingQuote = Pick<
  CheckoutFreightQuote,
  | 'packageId'
  | 'quoteId'
  | 'optionId'
  | 'channelId'
  | 'cjLogisticName'
  | 'arrivalTime'
  | 'amountMinor'
  | 'currency'
>;

type CheckoutShippingOptionsProps = {
  quote: CheckoutFreightQuoteResponse | null;
  selected: SelectedShippingQuote[];
  disabled: boolean;
  onQuote: () => void;
  onSelect: (quote: SelectedShippingQuote) => void;
};

function selectedKey(selected: SelectedShippingQuote): string {
  return `${selected.packageId}:${selected.optionId}:${selected.channelId}`;
}

function quoteKey(quote: CheckoutFreightQuote): string {
  return `${quote.packageId}:${quote.optionId}:${quote.channelId}`;
}

export default function CheckoutShippingOptions({
  quote,
  selected,
  disabled,
  onQuote,
  onSelect,
}: CheckoutShippingOptionsProps) {
  const selectedKeys = new Set(selected.map(selectedKey));

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
            CJ delivery methods are quoted from the address above.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onQuote}
          className="min-h-11 rounded-lg border border-brand-600 px-4 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 disabled:cursor-not-allowed disabled:border-border-strong disabled:text-ink-faint disabled:hover:bg-transparent"
        >
          Get delivery options
        </button>
      </div>
      {quote === null ? null : (
        <div className="mt-4 flex flex-col gap-4">
          {quote.packages.map((pkg) => {
            const quotes = quote.quotes.filter(
              (option) => option.packageId === pkg.packageId,
            );

            return (
              <fieldset key={pkg.packageId} className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-ink">
                  Package from {pkg.originCountry}
                </legend>
                {quotes.map((option) => {
                  const id = `shipping-${option.quoteId}`;
                  const checked = selectedKeys.has(quoteKey(option));

                  return (
                    <label
                      key={quoteKey(option)}
                      htmlFor={id}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors duration-200 ${
                        checked
                          ? 'border-brand-600 bg-brand-600/5'
                          : 'border-border-strong bg-white hover:border-brand-600'
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name={`shipping-${pkg.packageId}`}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onSelect(option)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">
                          {option.label} · {option.cjLogisticName}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">
                          {option.arrivalTime} days · {option.optionId}
                        </span>
                        {option.ruleTips.length === 0 ? null : (
                          <span className="mt-1 block text-xs text-ink-muted">
                            {option.ruleTips[0]}
                          </span>
                        )}
                      </span>
                      <span className="font-display text-base font-semibold text-ink">
                        {formatMoney({
                          amountMinor: option.amountMinor,
                          currency: option.currency,
                        })}
                      </span>
                    </label>
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
