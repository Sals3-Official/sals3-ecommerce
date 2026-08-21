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
  /**
   * The supplier's own label for this variant, verbatim — e.g. `Black-1XL`.
   *
   * Absent when the supplier reported none, which is every product until the
   * portal ships the field. It is the only human-readable per-variant string that
   * exists: `sku` is an `S3V-<hex>` digest and must never be shown to a buyer.
   *
   * Supplier-authored and unreviewed — expect `default`, CJK, and junk. Display
   * it verbatim and **never parse it into option axes**.
   */
  label?: string;
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
  | { type: 'keyValueList'; entries: { label: string; value: string }[] }
  /**
   * A seller-placed description photo, already re-checked against the image
   * host allow-list by the mapper — a block that reaches this type renders.
   * `alt` is always present: the mapper falls back to the product title.
   * Consecutive image blocks are one row — the layout is derived from
   * adjacency, exactly as the portal's description studio previews it.
   */
  | { type: 'image'; url: string; alt: string; caption?: string };

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

/**
 * One seller-entered product specification — their own answer to a category
 * attribute control, e.g. `Material: Cotton corduroy`.
 *
 * Deliberately **not** part of `ProductSpecs`. That type is what the supplier
 * reported and Sals3 repeats; this is what the seller declared themselves. The
 * PDP renders them as two sections with two provenance lines, because one
 * footnote cannot honestly cover both: "as reported by the supplier" becomes
 * false the moment a seller-entered attribute appears under it.
 *
 * `label` is the workbook's own attribute name, verbatim — the portal is the
 * authority on what an attribute is called, and re-wording it here would drift
 * from what the seller was asked in the editor.
 */
export type ProductSpecification = {
  label: string;
  value: string;
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
  /**
   * Absent once the portal stops sending the deprecated non-claim. It is no
   * longer a non-claim: the portal now derives it from `rating`, so the two can
   * never disagree. Prefer `rating` in anything new — this stays only so an
   * older payload still renders.
   */
  ratingLine?: string;
  /**
   * Real Sals3 buyer ratings. Absent means nobody has reviewed this product,
   * which is not a verdict about it and must not render as nought stars.
   */
  rating?: { average: number; count: number };
  /** The star distribution behind `rating.average`, index 0 being one star. */
  ratingBreakdown?: [number, number, number, number, number];
  shipLine?: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  images: ProductImage[];
  /**
   * When the portal froze this product's published state, ISO-8601.
   *
   * Surfaced for the evidence ledger's Price row, because the price is resolved
   * once at publish time and frozen onto the offer with its policy layers — so
   * "fixed when published" is a claim the payload can actually support. It
   * already arrives on the wire; adding it here is a view-model change, not a
   * contract change.
   *
   * There is deliberately no companion stock-observation date: no such field
   * exists anywhere in the contract, and the ledger states "not confirmed
   * recently" rather than inventing one.
   */
  publishedAt?: string;
  availability?: ProductAvailability;
  description?: ProductDescriptionBlock[];
  variants?: ProductVariant[];
  options?: ProductOptionAxis[];
  specs?: ProductSpecs;
  /** Seller-declared category attributes. See `ProductSpecification`. */
  specification?: ProductSpecification[];
  /**
   * The seller-edited meta description.
   *
   * Hidden metadata, used by `generateMetadata` only. It is **never** rendered
   * in the page body, and the visible description is never substituted for it
   * when this is present — they are two different pieces of writing with two
   * different audiences.
   */
  metaDescription?: string;
};
