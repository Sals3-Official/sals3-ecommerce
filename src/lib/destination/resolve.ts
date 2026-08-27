import { cookies, headers } from 'next/headers';
import {
  DEFAULT_DESTINATION_CODE,
  findDestination,
  isKnownDestinationCode,
  type Destination,
} from './destinations';

/**
 * Resolving the buyer's destination, server-side.
 *
 * ## The precedence, and why it is this way round
 *
 * 1. **The cookie** — what the buyer chose. Always wins.
 * 2. **Geo-IP** — a suggestion, used only when the buyer has chosen nothing.
 * 3. **Global** — the neutral answer.
 *
 * ADR-003 §1 settles this and the wording is worth keeping in front of whoever
 * edits it next: *"Geo-IP is only a default suggestion. The user's selected
 * shipping country is the browsing source of truth."* So geo never overwrites a
 * choice, and it is never written to the cookie on the buyer's behalf — a
 * stored value here means a person picked it.
 *
 * A geo hint for a country Sals3 has not named resolves to Global rather than
 * being discarded, which is the same rule the portal's `scopeCondition()`
 * applies to pricing: a named country gets its own scope, everything else gets
 * Global.
 *
 * ## Why there is no middleware
 *
 * A middleware could stamp a cookie on first request, and that is exactly what
 * ADR-003 forbids: it would make a guess indistinguishable from a choice. The
 * cookie is written only by `setDestinationAction`, so its presence carries
 * meaning. It also keeps the header untouched for visitors who never pick one,
 * which matters because the storefront has no `Vary` header anywhere.
 *
 * ## Caching
 *
 * Reading `cookies()` opts a route into dynamic rendering, which every
 * storefront page already is (`StorefrontCachePolicy` is `no-store`
 * throughout). Nothing here may be called from inside an `unstable_cache`
 * callback — that contract forbids request APIs, and the portal's
 * `catalog-cache.ts` says so in its own header. Today that is a rule with
 * nothing to break, because **the destination changes no price**: prices are
 * frozen onto `product_offers` at publish and the storefront read model has no
 * `market_code` filter. The day a price becomes destination-dependent, the
 * destination has to be threaded into that cache's key as an argument, and this
 * paragraph is the warning that it will not happen by itself.
 */

export const DESTINATION_COOKIE_NAME = 'sals3_destination';

/** A year. The choice is a preference, not a credential. */
export const DESTINATION_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Vercel's geo header. Absent locally and on any other host, which is fine —
 * absence resolves to Global, and Global is the honest answer when the location
 * is unknown.
 */
const GEO_COUNTRY_HEADER = 'x-vercel-ip-country';

export type ResolvedDestination = {
  destination: Destination;
  /**
   * How the answer was reached.
   *
   * `chosen` — the buyer picked it. `suggested` — geo-IP matched a named
   * destination and nothing was chosen. `default` — neither, so Global.
   *
   * The UI needs this to avoid claiming a guess is a decision: only a `chosen`
   * destination should be presented as the buyer's own.
   */
  source: 'chosen' | 'suggested' | 'default';
};

/**
 * The geo hint, normalised, or `null`.
 *
 * Wrapped in a `try` because `headers()` throws in contexts that have no
 * request, and a destination is a preference — it must degrade to Global rather
 * than take a page down with it.
 */
async function readGeoCountry(): Promise<string | null> {
  try {
    const headerStore = await headers();
    const value = headerStore.get(GEO_COUNTRY_HEADER);

    if (value === null) return null;

    const normalised = value.trim().toUpperCase();

    return /^[A-Z]{2}$/.test(normalised) ? normalised : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the buyer's destination.
 *
 * `marketDestinationCode` is the country of the market whose page is being
 * rendered, and it exists to stop the page contradicting itself. Without it a
 * first-time visitor on `/au` was shown **"Ship to: Somewhere else"** — the URL
 * saying Australia and the header saying it was not, on the same screen (found
 * in the browser, 2026-08-27; unit tests could not see it because neither half
 * knew the other existed).
 *
 * Precedence, once a market is in play:
 *
 * 1. **The buyer's stored choice** — still wins over everything. Someone who
 *    picked "Somewhere else" keeps it while browsing `/au`, and the cart tells
 *    them what that means. Being in a market is not consent to ship there.
 * 2. **The market** — the page they are on is a stronger statement of context
 *    than an IP guess, and it is one the buyer can see in the URL.
 * 3. **Global.**
 *
 * Geo is deliberately **not** consulted here. Its job is to choose a market at
 * `/`, and by the time a market page renders it has already done that job — a
 * second bite would let an IP override the segment in the address bar.
 *
 * Called with no argument (the account routes, which have no market), the order
 * is unchanged: choice, then geo, then Global.
 */
export async function resolveDestination(
  marketDestinationCode?: string,
): Promise<ResolvedDestination> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(DESTINATION_COOKIE_NAME)?.value;

  if (stored !== undefined && isKnownDestinationCode(stored)) {
    return { destination: findDestination(stored), source: 'chosen' };
  }

  if (
    marketDestinationCode !== undefined &&
    isKnownDestinationCode(marketDestinationCode)
  ) {
    return {
      destination: findDestination(marketDestinationCode),
      source: 'suggested',
    };
  }

  const geo = await readGeoCountry();

  if (geo !== null && isKnownDestinationCode(geo)) {
    return { destination: findDestination(geo), source: 'suggested' };
  }

  return {
    destination: findDestination(DEFAULT_DESTINATION_CODE),
    source: 'default',
  };
}
