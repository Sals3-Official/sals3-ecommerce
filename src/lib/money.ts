/**
 * Buyer-facing money.
 *
 * ## Why this is USD and not PHP
 *
 * The portal used to price the storefront feed by multiplying a CJ cost in USD
 * by a hand-configured USD→PHP rate and a flat markup percent, on every buyer
 * request. It now serves published `product_offers`, whose price is resolved
 * once at publish time by the platform pricing resolver and frozen onto the row
 * with its policy layers — and ADR-003 records phase 1 as USD, which is the
 * only currency the resolver's reference-FX module can actually produce.
 *
 * So the currency now arrives **in the payload** rather than being assumed
 * here. This module's job is to format it.
 *
 * ## Why the type is a union and not `string`
 *
 * A one-member union costs nothing today and makes `formatMoney` exhaustive:
 * adding AUD is a one-line change that the compiler then points at every place
 * needing a locale and symbol. Widening to `string` would let an unvalidated
 * currency code reach the formatter and print a bare number, which is the one
 * failure mode here that misrepresents a price.
 */

export const SUPPORTED_CURRENCIES = ['USD', 'AUD'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_DISPLAY_CURRENCY: CurrencyCode = 'USD';

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

/**
 * `US$` rather than a bare `$`: Australia and the Philippines are both approved
 * buyer destinations, so an unqualified dollar sign is genuinely ambiguous to a
 * buyer in either.
 */
const CURRENCY_FORMATS: Record<
  CurrencyCode,
  { locale: string; symbol: string }
> = {
  USD: { locale: 'en-US', symbol: 'US$' },
  AUD: { locale: 'en-AU', symbol: 'A$' },
};

export function money(
  amountMinor: number,
  currency: CurrencyCode = DEFAULT_DISPLAY_CURRENCY,
): Money {
  return { amountMinor, currency };
}

export function usd(amountMinor: number): Money {
  return money(amountMinor, 'USD');
}

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function formatMoney(value: Money): string {
  const { locale, symbol } = CURRENCY_FORMATS[value.currency];
  const majorUnits = value.amountMinor / 100;
  // Whole amounts stay whole (`US$850`, not `US$850.00`). `Intl` with
  // `style: 'currency'` would force two decimals and change every card and
  // cart row.
  const formatted = majorUnits.toLocaleString(locale, {
    minimumFractionDigits: majorUnits % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}

export function percentOff(
  oldAmountMinor: number,
  newAmountMinor: number,
): string {
  const off = Math.round((1 - newAmountMinor / oldAmountMinor) * 100);
  return `-${off}%`;
}

/**
 * Currency-preserving. The previous implementation rebuilt every result as PHP
 * regardless of input — harmless while one currency existed, and a silent
 * mislabel the moment the currency comes from a payload.
 */
export function multiplyMoney(value: Money, factor: number): Money {
  return money(Math.round(value.amountMinor * factor), value.currency);
}

/**
 * Throws on a mixed-currency array rather than picking one. That is a
 * programming error, not user input: adding a USD line to an AUD cart has no
 * correct total, and returning one would invent an exchange rate.
 */
export function sumMoney(
  moneys: Money[],
  currency: CurrencyCode = DEFAULT_DISPLAY_CURRENCY,
): Money {
  const first = moneys[0];

  if (first === undefined) return money(0, currency);

  if (moneys.some((value) => value.currency !== first.currency)) {
    throw new Error('Cannot sum money in more than one currency.');
  }

  return money(
    moneys.reduce((total, value) => total + value.amountMinor, 0),
    first.currency,
  );
}
