import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

/**
 * The storefront API contract, as this app validates it.
 *
 * ## Hand-duplicated across two repositories, on purpose
 *
 * The producer is `sals3-portal`'s `src/lib/storefront/catalog-feed.ts`. There
 * is no shared package (no private registry, and a nine-field contract does not
 * justify one), so the shapes are written twice and kept honest three ways:
 *
 * 1. **Tolerant by construction.** Every field added since 2026-08-13 is
 *    optional and unknown keys are stripped, so the portal can ship a field
 *    before this app reads it, and vice versa. `.strict()` must never be added.
 * 2. **Per-row salvage.** One malformed variant, image, or spec is dropped;
 *    it does not fail the product, and a product does not fail the page. This
 *    generalises the `truncatedText` lesson — a single overlong real CJ title
 *    used to blank an entire 14-item page.
 * 3. **A committed fixture.** `test/fixtures/storefront-product-detail.json`
 *    is one maximal payload, parsed by a test here. The portal commits the same
 *    file and asserts its serializer produces it, so drift fails a test in
 *    whichever repository moved.
 *
 * ## `currency` is the one required new field
 *
 * Every other optional field degrades to "section omitted". A missing
 * `currency` would degrade to *a number labelled with the wrong symbol* — the
 * only failure mode here that misrepresents money. A parse failure is the
 * honest outcome, and it now reaches a real error page rather than a fake 404.
 */

export const DEFAULT_PRODUCTS_PAGE_SIZE = 10;
export const MAX_PRODUCTS_PAGE_SIZE = 30;
export const MAX_PRODUCTS_PAGE = 1000;

/** Same shape the producer validates its own slugs against. */
export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const StorefrontSectionSchema = z.enum(['for-you', 'deals']);

export function queryIntegerSchema(maximum: number, fallback: number) {
  return z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.coerce.number().int().min(1).max(maximum),
    )
    .catch(fallback);
}

export const ProductsPaginationSchema = z.object({
  page: queryIntegerSchema(MAX_PRODUCTS_PAGE, 1),
  limit: queryIntegerSchema(MAX_PRODUCTS_PAGE_SIZE, DEFAULT_PRODUCTS_PAGE_SIZE),
});

/**
 * Real CJ product names routinely run past 120-160 characters (long
 * marketing-style titles) — confirmed live: a single overlong title/imageAlt
 * anywhere in a 14-item page failed validation for the whole page, not just
 * that row. Truncate instead of rejecting, so display length is still
 * bounded without one long real title taking the rest of the page down.
 */
function truncatedText(maxLength: number) {
  return z
    .string()
    .min(1)
    .transform((value) => value.slice(0, maxLength));
}

/**
 * An array whose bad rows are dropped rather than failing their parent. The
 * same reasoning as `truncatedText`, applied one level up: a malformed variant
 * should cost that variant, not the product page.
 */
function salvagedArray<Schema extends z.ZodTypeAny>(item: Schema, max: number) {
  return z
    .array(z.unknown())
    .max(max)
    .transform((rows) =>
      rows
        .map((row) => item.safeParse(row))
        .filter(
          (result): result is z.ZodSafeParseSuccess<z.output<Schema>> =>
            result.success,
        )
        .map((result) => result.data),
    );
}

/** Identity, money, and category — shared by the card and the detail page. */
const StorefrontProductBaseSchema = z.object({
  id: z.string().min(1).max(120),
  slug: z.string().regex(CATEGORY_SLUG_PATTERN),
  title: truncatedText(120),
  currency: z.enum(SUPPORTED_CURRENCIES),
  priceMinor: z.number().int().positive(),
  /**
   * Evidence-backed only. The portal sends it equal to `priceMinor` today (no
   * comparison price is published), and it is optional here so it can simply
   * stop being sent once the storefront no longer needs the legacy key.
   */
  oldPriceMinor: z.number().int().positive().optional(),
  category: z.string().regex(CATEGORY_SLUG_PATTERN),
  categoryName: truncatedText(80).optional(),
  availability: z.enum(['AVAILABLE', 'UNKNOWN', 'UNAVAILABLE']).optional(),
  /**
   * Deprecated on the producer side and optional here.
   *
   * `ratingLine` carried CJ supplier-platform review data, which a buyer reads
   * as a Sals3 rating — the wiki's corrected external facts are explicit that
   * it is not one. `shipLine` carried a delivery promise with no logistics
   * evidence. Both now arrive as non-claims and will be dropped entirely.
   */
  ratingLine: z.string().min(1).max(80).optional(),
  shipLine: z.string().min(1).max(120).optional(),
});

/** The card feed. Deliberately does not grow. */
export const StorefrontProductSchema = StorefrontProductBaseSchema.extend({
  imageUrl: z.string().url().nullable(),
  imageAlt: truncatedText(160),
});

export const ProductsResponseSchema = z.object({
  products: z.array(StorefrontProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});

const ProductImageSchema = z.object({
  url: z.string().url(),
  alt: truncatedText(160).optional(),
});

/**
 * The producer's allow-listed block union, matched exactly —
 * `paragraph`, `heading`, `bulletList`, `keyValueList`. There is no `html`
 * block and no raw-string passthrough on either side, so there is nothing for a
 * renderer to interpret as markup even before escaping. CJ's own `description`
 * **is** supplier HTML and never enters this document.
 */
const DescriptionBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: truncatedText(4000) }),
  z.object({
    type: z.literal('heading'),
    level: z.union([z.literal(2), z.literal(3)]),
    text: truncatedText(160),
  }),
  z.object({
    type: z.literal('bulletList'),
    items: z.array(truncatedText(4000)).min(1).max(40),
  }),
  z.object({
    type: z.literal('keyValueList'),
    entries: z
      .array(
        z.object({ label: truncatedText(120), value: truncatedText(4000) }),
      )
      .min(1)
      .max(40),
  }),
]);

const ProductVariantSchema = z.object({
  id: z.string().min(1).max(120),
  sku: truncatedText(80),
  priceMinor: z.number().int().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  availability: z.enum(['AVAILABLE', 'UNKNOWN', 'UNAVAILABLE']),
  options: salvagedArray(
    z.object({ name: truncatedText(40), value: truncatedText(60) }),
    6,
  ).optional(),
});

/**
 * Supplier-reported facts. No `quantity` field anywhere, on purpose: a count we
 * do not have must not become a field somebody later fills with an estimate.
 */
const ProductSpecsSchema = z.object({
  sku: truncatedText(80).optional(),
  weightGrams: z.number().int().nonnegative().optional(),
  lengthMillimeters: z.number().int().nonnegative().optional(),
  widthMillimeters: z.number().int().nonnegative().optional(),
  heightMillimeters: z.number().int().nonnegative().optional(),
  gtins: z.array(truncatedText(20)).max(10).optional(),
  mpn: truncatedText(80).optional(),
  brand: truncatedText(80).optional(),
  condition: z.enum(['NEW', 'REFURBISHED', 'USED']).optional(),
});

export const StorefrontProductDetailSchema = StorefrontProductBaseSchema.extend(
  {
    imageUrl: z.string().url().nullable().optional(),
    imageAlt: truncatedText(160).optional(),
    publishedAt: z.string().datetime().optional(),
    categoryPath: truncatedText(200).optional(),
    images: salvagedArray(ProductImageSchema, 12).optional(),
    description: z
      .object({ blocks: salvagedArray(DescriptionBlockSchema, 60) })
      .optional(),
    variants: salvagedArray(ProductVariantSchema, 200).optional(),
    specs: ProductSpecsSchema.optional(),
  },
);

export const StorefrontProductResponseSchema = z.object({
  product: StorefrontProductDetailSchema,
});

const ProductCategorySchema = z.object({
  id: z.string().regex(CATEGORY_SLUG_PATTERN),
  code: z.string().min(1).max(4),
  name: z.string().min(1).max(80),
});

export const ProductCategoriesResponseSchema = z.array(ProductCategorySchema);

export type Product = z.infer<typeof StorefrontProductSchema>;
export type ProductPayloadDetail = z.infer<
  typeof StorefrontProductDetailSchema
>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
export type ProductsPagination = z.infer<typeof ProductsPaginationSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type StorefrontSection = z.infer<typeof StorefrontSectionSchema>;
export type ProductDescriptionBlock = z.infer<typeof DescriptionBlockSchema>;
export type ProductVariantPayload = z.infer<typeof ProductVariantSchema>;
export type ProductSpecsPayload = z.infer<typeof ProductSpecsSchema>;
