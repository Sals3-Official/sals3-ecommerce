import { DESTINATIONS, canCheckOutTo, type Destination } from './destinations';

/**
 * The markets that have a storefront of their own at `/<market>`.
 *
 * ## Why this is not simply `DESTINATIONS`
 *
 * A destination is somewhere an order can be *priced and addressed*. A market
 * is somewhere Sals3 *puts a shopfront*. They are different lists on purpose,
 * and the difference is a business decision rather than a technical one: a
 * market segment is a URL a person can link to, a crawler will index, and a
 * buyer will bookmark, so opening one is a claim that this is a place we sell.
 *
 * Owner decision 2026-08-27: `au`, `ph`, `fj`. `au` first, because it is what
 * the deployed site already serves.
 *
 * `fj` is included at the owner's instruction while checkout still refuses a
 * Fijian address. That is not hidden — `DestinationNotice` renders on every
 * market whose destination `canCheckOutTo()` rejects, so `/fj` says plainly
 * that an order cannot be placed there yet. A shopfront that cannot sell is a
 * defensible thing to publish; one that pretends it can sell is not.
 *
 * ## The segment is lower case, the destination code is upper
 *
 * `/au` in a URL, `AU` in `market_code`. URLs are conventionally lower case and
 * this one is read by people; the country code is an ISO value the database
 * enforces as `^[A-Z]{2}$`. `marketToDestinationCode()` is the only place the
 * two spellings meet.
 */

export const MARKET_SEGMENTS = ['au', 'ph', 'fj'] as const;

export type MarketSegment = (typeof MARKET_SEGMENTS)[number];

/**
 * Where a bare `/` sends a visitor who has expressed no preference.
 *
 * Australia, because it is the market the deployed storefront already serves
 * and Sals3's own country of registration — not because geo said so. Geo is a
 * suggestion applied *before* this default, never after it (ADR-003 §1).
 */
export const DEFAULT_MARKET: MarketSegment = 'au';

export function isMarketSegment(value: string): value is MarketSegment {
  return (MARKET_SEGMENTS as readonly string[]).includes(value);
}

/** `'au'` → `'AU'`. The one place the two spellings of a market meet. */
export function marketToDestinationCode(market: MarketSegment): string {
  return market.toUpperCase();
}

/** `'AU'` → `'au'`, or `undefined` when that destination has no shopfront. */
export function destinationCodeToMarket(
  code: string,
): MarketSegment | undefined {
  const segment = code.toLowerCase();

  return isMarketSegment(segment) ? segment : undefined;
}

export function marketDestination(market: MarketSegment): Destination {
  const code = marketToDestinationCode(market);
  const destination = DESTINATIONS.find((entry) => entry.code === code);

  // Every market segment is a destination code by construction, so this cannot
  // happen; the throw exists so adding a market without adding its destination
  // fails loudly rather than rendering a shopfront with no country behind it.
  if (destination === undefined) {
    throw new Error(`Market "${market}" has no matching destination.`);
  }

  return destination;
}

/** Whether an order can actually be placed in this market today. */
export function marketCanCheckOut(market: MarketSegment): boolean {
  return canCheckOutTo(marketToDestinationCode(market));
}

/**
 * Prefixes a shopping path with the market.
 *
 * Every internal link to a shopping route goes through this rather than
 * interpolating the segment at the call site. The alternative is twelve files
 * each building `/${market}/p/${id}` by hand, which is twelve places for a
 * market-less link to survive review — and a market-less link does not 404, it
 * silently redirects to Australia, which is the worst kind of wrong.
 *
 * Account routes (`/login`, `/checkout`, `/orders`) are deliberately NOT
 * market-scoped and must not be passed through here: they belong to a person,
 * not to a country.
 */
export function marketHref(market: MarketSegment, path: string): string {
  if (path === '/') return `/${market}`;

  return `/${market}${path.startsWith('/') ? path : `/${path}`}`;
}
