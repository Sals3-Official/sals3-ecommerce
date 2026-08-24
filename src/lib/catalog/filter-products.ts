import { toHomeProduct, type Product } from '@/services/products';
import type { Product as HomeProduct } from '@/lib/home-placeholder-data';
import { priceBandById, type PriceBandId } from './price-bands';
import type { AvailabilityKey } from './availability';

/**
 * What the category listing still resolves locally.
 *
 * The filtering and sorting this module used to do now happen in the portal —
 * `/api/storefront/categories/[slug]/products` narrows in SQL against the same
 * `publishedScope()` the rest of the catalogue is gated by, and returns one
 * page. What remains here is the translation between the URL's controls and
 * that request: turning a band id or a typed pair into the price window the API
 * takes, and turning a payload row into the card view model.
 */

export type ActivePriceRange = {
  minMinor: number;
  maxMinor: number;
  /** True once either typed field overrides the selected band. */
  typed: boolean;
};

/**
 * A typed min/max always wins over the selected band, mirroring the design's
 * own rule: typing a custom range is a more specific choice than the radio
 * it was defaulted from.
 */
export function activePriceRange(
  band: PriceBandId,
  priceMinRaw: string,
  priceMaxRaw: string,
): ActivePriceRange {
  const min = Number.parseFloat(priceMinRaw);
  const max = Number.parseFloat(priceMaxRaw);
  const hasTyped = Number.isFinite(min) || Number.isFinite(max);

  if (hasTyped) {
    return {
      minMinor: Number.isFinite(min) && min > 0 ? Math.round(min * 100) : 0,
      maxMinor: Number.isFinite(max) ? Math.round(max * 100) : Infinity,
      typed: true,
    };
  }

  const bandDef = priceBandById(band);

  return {
    minMinor: bandDef.minMinor,
    maxMinor: bandDef.maxMinor,
    typed: false,
  };
}

/** The card view model plus the one extra real, non-fabricated field the
 * list-row card shows that the grid card does not: availability. */
export type CategoryProduct = HomeProduct & { availability: AvailabilityKey };

export function toCategoryProducts(products: Product[]): CategoryProduct[] {
  return products.map((product, index) => ({
    ...toHomeProduct(product, index),
    availability: product.availability ?? 'UNKNOWN',
  }));
}
