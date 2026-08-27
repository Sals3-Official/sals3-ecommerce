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
 * ## What is left, after the picker was removed
 *
 * ADR-003 §1's order still holds, but only two of its three steps can happen
 * now:
 *
 * 1. **A stored choice** — still read, and still wins. Nothing writes this
 *    cookie any more: the `Ship to` picker was its only writer and the owner
 *    removed it on 2026-08-28. It is read because the cookie is already in real
 *    browsers with a year to run — a buyer who chose the Philippines on
 *    2026-08-27 keeps it rather than silently losing it — and because putting a
 *    writer back is then a one-file change.
 * 2. **Geo-IP** — in practice the only live signal.
 * 3. **Global** — the neutral answer, and what every visitor with no geo header
 *    now gets. `x-vercel-ip-country` is absent locally and on any non-Vercel
 *    host.
 *
 * **The consequence, stated plainly:** a buyer can no longer tell the site where
 * they are shipping before the checkout address form. That is the silence
 * ADR-003 §1 and the destination context were built to end, reintroduced by
 * owner decision. What still depends on the answer: the cart's cannot-ship
 * notice, the approximate local price, and the checkout form's initial country.
 * All three now follow geo, or Global.
 *
 * The `marketDestinationCode` parameter this took between 2026-08-27 and
 * 2026-08-28 is also gone — it existed so a shopfront's own country could stand
 * in, and there are no shopfronts.
 */
export async function resolveDestination(): Promise<Destination> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(DESTINATION_COOKIE_NAME)?.value;

  if (stored !== undefined && isKnownDestinationCode(stored)) {
    return findDestination(stored);
  }

  const geo = await readGeoCountry();

  if (geo !== null && isKnownDestinationCode(geo)) {
    return findDestination(geo);
  }

  return findDestination(DEFAULT_DESTINATION_CODE);
}
