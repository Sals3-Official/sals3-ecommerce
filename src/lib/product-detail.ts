import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';

/**
 * The PDP's view model — the **client-safe** product type.
 *
 * Client components may import from this module and only this module. Importing
 * a type from `src/services/storefront/*` would pull the fetch layer's module
 * graph into the browser bundle, where the server-only API token reads as
 * `undefined`. `test/client-bundle-boundary.test.ts` walks the imports of every
 * client entry point to keep that from happening.
 *
 * Every optional field is **absent** when the portal has nothing real to send —
 * never defaulted, never a placeholder. The PDP renders a section only when
 * there is something in it, which is why a missing description shows no heading
 * rather than "No description available".
 */

export type ProductImage = {
  url: string;
  /** The product title when the portal supplies no per-image text. */
  alt: string;
};

export type ProductAvailability = 'AVAILABLE' | 'UNKNOWN' | 'UNAVAILABLE';

export type ProductOptionSelection = {
  name: string;
  value: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  price: Money;
  availability: ProductAvailability;
  /** Absent for a product with no option axes — one implicit variant. */
  options?: ProductOptionSelection[];
};

/**
 * One option axis, derived from the variants rather than sent separately: the
 * portal's variants already carry `{name, value}` pairs, and deriving the axes
 * keeps the two from disagreeing about which values exist.
 */
export type ProductOptionAxis = {
  name: string;
  values: string[];
};

export type ProductDescriptionBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'bulletList'; items: string[] }
  | { type: 'keyValueList'; entries: { label: string; value: string }[] };

export type ProductSpecs = {
  sku?: string;
  weightGrams?: number;
  lengthMillimeters?: number;
  widthMillimeters?: number;
  heightMillimeters?: number;
  gtins?: string[];
  mpn?: string;
  brand?: string;
  condition?: 'NEW' | 'REFURBISHED' | 'USED';
};

export type ProductDetail = {
  id: string;
  title: string;
  category: string;
  /** Display name for the breadcrumb. Absent when the product is unmapped. */
  categoryName?: string;
  categoryPath?: string;
  price: Money;
  /** Only ever evidence-backed. Absent means no comparison price exists. */
  oldPrice?: Money;
  /** Absent once the portal stops sending the deprecated non-claim. */
  ratingLine?: string;
  shipLine?: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  images: ProductImage[];
  availability?: ProductAvailability;
  description?: ProductDescriptionBlock[];
  variants?: ProductVariant[];
  options?: ProductOptionAxis[];
  specs?: ProductSpecs;
};
