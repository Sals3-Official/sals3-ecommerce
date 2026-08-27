import type { MarketSegment } from '@/lib/destination/markets';
import type { IndicativeCurrency } from './rates';

/**
 * Which local currency a shopfront shows its approximate price in.
 *
 * One currency per market, and every market has one — the `Record` is what
 * enforces that. Opening a fourth market without deciding what its buyers see
 * beside the USD price fails typecheck here rather than rendering a shopfront
 * that silently drops the conversion, which is a decision nobody would notice
 * having been made.
 *
 * The mapping is the market's own currency, not the buyer's: `/au` shows AUD to
 * everyone reading it, including a visitor from Manila. The alternative — the
 * destination cookie — would make the same URL show two different figures to
 * two people, which is exactly the ambiguity the label exists to remove.
 *
 * This is display only. Nothing here reaches `Money`, `SUPPORTED_CURRENCIES`,
 * or anything that charges: the buyer is charged in USD in every market
 * (ADR-003 §3), and that is the fact the note beside the figure states.
 */
const MARKET_CURRENCIES: Record<MarketSegment, IndicativeCurrency> = {
  au: 'AUD',
  ph: 'PHP',
  fj: 'FJD',
};

/** `'au'` → `'AUD'`. Total: every market segment has a currency. */
export default function marketToIndicativeCurrency(
  market: MarketSegment,
): IndicativeCurrency {
  return MARKET_CURRENCIES[market];
}
