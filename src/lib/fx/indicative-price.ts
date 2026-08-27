import type { IndicativeCurrency, IndicativeRate } from './rates';

/**
 * An approximate local price, and the words that must travel with it.
 *
 * ## Why this is not a `Money`
 *
 * `Money` is an amount someone is charged. This is a conversion of one, shown
 * for orientation. Keeping them as separate types is the mechanism that stops
 * an approximate figure reaching a Stripe session or an order line — the
 * compiler refuses, rather than a reviewer having to notice.
 *
 * ## Why the label is part of the value
 *
 * ADR-003 §3 requires the display to be "clearly labelled", and here that is
 * carrying more weight than usual. The ACCC's single-price rule has an
 * exception where "a price is displayed in an overseas currency" — but Sals3 is
 * Australian-registered and charges **USD**, so to an Australian buyer the AUD
 * figure is the domestic-looking one and the charged one is foreign. That
 * inverts the usual shape of the exception, and an Australian shopper could
 * plausibly read A$ as the operative price.
 *
 * So the label is not decoration and is not optional. It is returned from the
 * same function as the number, so a caller cannot render one without the other.
 *
 * This is a considered reading, not legal advice: the ACCC publishes no
 * specific guidance on showing an approximate converted price beside the
 * charged one, and wording certainty is a question for an Australian
 * consumer-law solicitor.
 */

export type IndicativePrice = {
  /** Formatted for display, e.g. `A$34.20`. Never parsed back into a number. */
  formatted: string;
  /** The sentence that must appear with it. */
  note: string;
};

const CURRENCY_FORMATS: Record<
  IndicativeCurrency,
  { locale: string; symbol: string }
> = {
  AUD: { locale: 'en-AU', symbol: 'A$' },
  PHP: { locale: 'en-PH', symbol: '₱' },
  FJD: { locale: 'en-FJ', symbol: 'FJ$' },
};

/**
 * `A$34.20`, using an explicit symbol rather than the locale's own.
 *
 * `Intl` would render AUD as a bare `$` in `en-AU`, which is exactly the
 * ambiguity this whole display is meant to remove — a bare dollar sign beside a
 * `US$` price invites the reader to assume they are the same currency. The
 * symbol is stated and the grouping is left to `Intl`.
 */
function formatIndicative(
  amountMinor: number,
  currency: IndicativeCurrency,
): string {
  const { locale, symbol } = CURRENCY_FORMATS[currency];

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);

  return `${symbol}${formatted}`;
}

/** `2026-08-27` → `27 Aug 2026`, so the buyer can see how current it is. */
function formatAsOf(asOf: string): string {
  const date = new Date(`${asOf}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return asOf;

  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Converts a USD amount for display, or returns `null`.
 *
 * `null` whenever there is no usable rate, and the caller must then render
 * **nothing** — not a placeholder, not a dash. The USD price is complete on its
 * own; the local figure is an extra that is either right or absent.
 *
 * Rounds to whole minor units. There is no rounding-direction cleverness here
 * on purpose: this number is never charged, so rounding it "safely" in either
 * direction would only make it differ from the honest conversion for no gain.
 */
export function toIndicativePrice(
  usdAmountMinor: number,
  rate: IndicativeRate | null,
): IndicativePrice | null {
  if (rate === null) return null;
  if (!Number.isFinite(usdAmountMinor) || usdAmountMinor < 0) return null;

  const converted = Math.round(usdAmountMinor * rate.rate);

  return {
    formatted: formatIndicative(converted, rate.currency),
    note: `Approximate. You are charged in US dollars. Converted at the rate published on ${formatAsOf(rate.asOf)}; your bank's rate will differ.`,
  };
}
