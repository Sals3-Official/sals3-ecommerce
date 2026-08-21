/**
 * Department photographs, keyed by department id.
 *
 * The files live in `public/categories/` at 192×192 WebP (67 KB for the whole
 * set), pre-resized on purpose: `next.config.ts` routes every image through
 * `cj-image-loader.ts`, which returns a local `/public` path untouched, so
 * nothing resizes these at request time. The tile renders at 56px on mobile
 * and 72px at `md`, and 192 covers both at 3× device pixel ratio without
 * shipping the 2048px originals (7.7 MB across the set).
 *
 * A department with no photograph falls back to its line icon, and then to its
 * code initials — see `CategoryTile`. `toys-games` has no photograph yet;
 * that is a missing asset, not a decision, unlike the two icon omissions.
 */
const CATEGORY_IMAGE_IDS = new Set([
  'animals-pet-supplies',
  'apparel-accessories',
  'arts-entertainment',
  'baby-toddler',
  'business-industrial',
  'cameras-optics',
  'electronics',
  'food-beverages-tobacco',
  'furniture',
  'hardware',
  'health-beauty',
  'home-garden',
  'luggage-bags',
  'mature',
  'media',
  'office-supplies',
  'religious-ceremonial',
  'software',
  'sporting-goods',
  'vehicles-parts',
]);

/** The rendered size of the stored file, not of the tile. */
export const CATEGORY_IMAGE_PX = 192;

export default function categoryImageSrc(id: string): string | undefined {
  return CATEGORY_IMAGE_IDS.has(id) ? `/categories/${id}.webp` : undefined;
}
