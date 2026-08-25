import { PSF_SLIDES } from '@/lib/ads/sponsored-slides';
import type { CategoryProduct } from './filter-products';
import type { CategoryQuery } from './query';

/**
 * Where the sponsored card lands inside a `/c/[slug]` listing.
 *
 * ## Why the placement is seeded rather than `Math.random()`
 *
 * "Random" here means *varies between listings*, not *varies between renders of
 * the same listing*. A true random draw on the server would move the card every
 * time the page was re-rendered or revalidated: the same URL would show the ad
 * in a different cell on a back-navigation, no test could assert anything about
 * it, and the page could not be cached without the cache freezing one draw
 * forever anyway. A hash of the listing's own identity gives a placement that
 * is stable for a URL and different across categories, pages, sorts, and price
 * windows — which is the property the request actually wants.
 *
 * ## Why one slot, not one slot per creative
 *
 * The slot renders a carousel of every creative in `PSF_SLIDES`, so three
 * creatives are three slides in one cell, not three cells. Dropping the same
 * advertiser into a feed three times would read as three ads; cycling them in
 * one place reads as one placement, which is what it is. `HAS_CREATIVES` is
 * therefore about whether the slot exists at all — an empty campaign renders no
 * slot rather than an empty box.
 */

const HAS_CREATIVES = PSF_SLIDES.length > 0;

/** One in-feed slot per listing page. */
const MAX_SLOTS_PER_PAGE = 1;

/** The proposal's in-feed cadence: a sponsored card every 8th–10th slot. */
export const AD_MIN_GAP = 8;
export const AD_MAX_GAP = 10;

export type ListingItem =
  | { kind: 'product'; product: CategoryProduct }
  | { kind: 'ad'; slotKey: string };

const HASH_MODULUS = 2147483647;

/**
 * A rolling polynomial hash, and a Park–Miller generator over the same
 * modulus. Both are written in plain arithmetic rather than the usual
 * xor/shift PRNG: every intermediate here stays well inside `Number`'s exact
 * integer range, and the alternative needed bitwise operators this repository
 * lints against. Neither is a hash for security — they only have to spread
 * listing identities evenly over a handful of grid cells.
 */
function hashSeed(seed: string): number {
  let hash = 7;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % HASH_MODULUS;
  }

  return hash === 0 ? 1 : hash;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  const next = () => {
    state = (state * 16807) % HASH_MODULUS;

    return state / HASH_MODULUS;
  };

  // Two throwaway draws: neighbouring seeds share a low first output, and
  // neighbouring seeds are exactly what `/c/<slug>?page=1` and `?page=2` are.
  next();
  next();

  return next;
}

/**
 * Everything that changes which products are on screen, so a different result
 * set gets a different placement instead of inheriting the previous one's.
 */
export function categoryAdSeed(slug: string, query: CategoryQuery): string {
  return [
    slug,
    query.sort,
    query.band,
    query.priceMin,
    query.priceMax,
    String(query.page),
  ].join('|');
}

function drawGap(nextRandom: () => number, productCount: number): number {
  const span = AD_MAX_GAP - AD_MIN_GAP + 1;
  const gap = AD_MIN_GAP + Math.floor(nextRandom() * span);

  return Math.min(gap, productCount);
}

/**
 * The listing with its sponsored card interleaved.
 *
 * The gap is drawn in the 8–10 range, then clamped to the number of products
 * actually on the page. The clamp is the whole reason a short department shows
 * an ad at all: most `/c/[slug]` pages hold far fewer than eight published
 * products today, and an un-clamped cadence would mean the placement silently
 * never fired anywhere in the live catalogue.
 */
export function withAdSlots(
  products: CategoryProduct[],
  seed: string,
): ListingItem[] {
  const items: ListingItem[] = products.map((product) => ({
    kind: 'product',
    product,
  }));

  if (products.length === 0 || !HAS_CREATIVES) return items;

  const nextRandom = seededRandom(seed);
  const withAds: ListingItem[] = [];

  let placed = 0;
  let untilAd = drawGap(nextRandom, products.length);

  items.forEach((item) => {
    withAds.push(item);
    untilAd -= 1;

    if (untilAd > 0 || placed >= MAX_SLOTS_PER_PAGE) return;

    withAds.push({ kind: 'ad', slotKey: `ad-slot-${placed}` });
    placed += 1;
    untilAd = drawGap(nextRandom, products.length);
  });

  return withAds;
}
