import type { DestinationCode } from '@/lib/destination/destinations';
import type { IndicativeCurrency } from './rates';

/**
 * Which local currency to show an approximate price in, for the destination the
 * buyer is shopping to.
 *
 * ## Why the buyer's choice and not the URL
 *
 * Until 2026-08-28 this was keyed on the market segment: `/au` showed AUD to
 * everyone reading it, including a visitor from Manila, and the argument for it
 * was that one URL must not show two people two different figures. That
 * argument died with the markets — **the URL no longer states a country**, so
 * the buyer's own destination is the only thing left that honestly answers
 * "local to whom". It is also the value the header already displays.
 *
 * ## Why this is partial, where the market map was total
 *
 * A market had to have a currency: three markets, three entries, and opening a
 * fourth failed typecheck. Destinations are a longer list than the currencies
 * we can source — `fetchIndicativeRate` pins each of these to a named central
 * bank, and New Zealand, the United States, Canada and Global have no such
 * entry. Those get **no approximate price at all** rather than a figure from an
 * unnamed source, which is the rule every other failure here already follows.
 *
 * Adding a currency means adding a provider in `rates.ts` and a line here. It
 * is a decision about where a number comes from, not a lookup to be filled in
 * for completeness.
 *
 * Display only. Nothing here reaches `Money`, `SUPPORTED_CURRENCIES` or
 * anything that charges: the buyer is charged in USD (ADR-003 §3), which is
 * what the note beside the figure says.
 */
const DESTINATION_CURRENCIES: Record<string, IndicativeCurrency> = {
  AU: 'AUD',
  PH: 'PHP',
  FJ: 'FJD',
};

/** `'PH'` → `'PHP'`, or `undefined` where no rate can be sourced. */
export default function destinationToIndicativeCurrency(
  code: DestinationCode,
): IndicativeCurrency | undefined {
  return DESTINATION_CURRENCIES[code];
}
