import { z } from 'zod';
import { SHIPPING_TIERS } from '@/lib/checkout/shipping-tiers';
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
export function truncatedText(maxLength: number) {
  return z
    .string()
    .min(1)
    .transform((value) => value.slice(0, maxLength));
}

/**
 * The same truncation without the non-empty floor.
 *
 * `.min(1)` is right everywhere else and wrong inside a table: a grid needs
 * holes — a measurement that does not apply to one size, and the blank corner
 * cell above a column of size codes. Rejecting a blank cell would fail the
 * whole block and `salvagedArray` would drop it, so a seller's size chart
 * would disappear from the page because one square was deliberately left open.
 * The producer allows blank cells for the same reason and refuses a *ragged*
 * row instead, which is the shape that actually misinforms.
 */
export function truncatedOrBlankText(maxLength: number) {
  return z.string().transform((value) => value.slice(0, maxLength));
}

/**
 * An array whose bad rows are dropped rather than failing their parent. The
 * same reasoning as `truncatedText`, applied one level up: a malformed variant
 * should cost that variant, not the product page.
 */
export function salvagedArray<Schema extends z.ZodTypeAny>(
  item: Schema,
  max: number,
) {
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
/**
 * A product's buyer rating.
 *
 * Never CJ's. The supplier's own `listedNum` and review counts describe CJ's
 * marketplace, and presenting them as a Sals3 rating is the fabrication the
 * corrected external facts in the wiki exist to prevent.
 */
export const RatingSummarySchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
});

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
  /**
   * Real Sals3 buyer ratings, absent when nobody has reviewed the product.
   *
   * Absent rather than a zeroed object: `{average: 0, count: 0}` renders as a
   * nought-star product unless every consumer special-cases it, while an absent
   * key cannot be mistaken for a verdict. `.catch(undefined)` for the same
   * reason `listing` on an order line has it — a malformed aggregate must cost
   * the stars, never the product.
   */
  rating: RatingSummarySchema.optional().catch(undefined),
  /**
   * Units Sals3 has actually sold, absent until at least one has been.
   *
   * Absent rather than zero, for the same reason `rating` is: a wall of
   * "0 sold" on a young catalogue reads as "nobody buys here", which is a
   * verdict the absence of sales does not support. Never a supplier figure —
   * CJ's `listedNum` counts listings on CJ's own marketplace.
   *
   * `.catch(undefined)` so a malformed count costs the line, never the product.
   */
  soldUnits: z.number().int().nonnegative().optional().catch(undefined),
});

/** The card feed. Deliberately does not grow. */
export const StorefrontProductSchema = StorefrontProductBaseSchema.extend({
  imageUrl: z.string().url().nullable(),
  imageAlt: truncatedText(160),
});

/**
 * One category level with its own `/c/[slug]` address, where it has one.
 *
 * `slug` is optional because the producer omits it for a level that is not
 * addressable — a CJ-mirrored path, or one the seeded taxonomy does not carry.
 * Optional rather than nullable so an absent address cannot be mistaken for a
 * present empty one, and the consumer renders text.
 */
export const CategoryTrailEntrySchema = z.object({
  name: truncatedText(120),
  slug: truncatedText(160).optional(),
});

export const BrowseCategorySchema = z.object({
  name: truncatedText(120),
  slug: truncatedText(160),
  /** The scope's own ancestry, so a deeper browse page can offer a way up. */
  trail: salvagedArray(CategoryTrailEntrySchema, 8).optional(),
});

export const ProductsResponseSchema = z.object({
  products: z.array(StorefrontProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().positive(),
  /**
   * Present on the department/category browse only. The whole-catalogue feed and
   * search return the same shape and have no category to name, which is why this
   * is optional rather than required.
   */
  category: BrowseCategorySchema.optional(),
});

const ProductImageSchema = z.object({
  url: z.string().url(),
  alt: truncatedText(160).optional(),
});

/**
 * The producer's allow-listed block union, matched exactly —
 * `paragraph`, `heading`, `bulletList`, `keyValueList`, `table`, `image`. There
 * is no
 * `html` block and no raw-string passthrough on either side, so there is
 * nothing for a renderer to interpret as markup even before escaping. CJ's own
 * `description` **is** supplier HTML and never enters this document.
 *
 * The `image` block's `url` is only shape-checked here; the host allow-list
 * (`getAllowedProductImageUrl`) is applied in the mapper, where a
 * disallowed-host image costs that block rather than the whole description.
 * `alt` is optional on the wire (tolerant, like every post-2026-08-13 field)
 * even though the producer always sends it; the mapper falls back to the
 * product title.
 *
 * The `table` block's **rectangularity** is likewise checked in the mapper
 * rather than here: the rule spans two fields (`rows[n].length` against
 * `headers.length`), and a cross-field `superRefine` on a member of a
 * `discriminatedUnion` turns it into a `ZodEffects` the discriminator can no
 * longer resolve through — the same structural constraint the producer
 * documents on its own schema. Per-block salvage in the mapper is where a
 * ragged table costs that table and not the description around it.
 */
export const DescriptionBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    text: truncatedText(4000),
    /**
     * Inline emphasis, optional on the wire like every post-2026-08-13 field.
     * Absent on a legacy document and on any paragraph with nothing marked —
     * the portal drops the field rather than storing unmarked runs, so its
     * absence means "no emphasis", never "unknown".
     *
     * `MAX_RUNS_PER_BLOCK` is 200 in the portal; the cap here matches so a
     * document it accepts is never truncated on arrival.
     */
    runs: z
      .array(
        z.object({
          text: truncatedText(4000),
          marks: z
            .array(z.enum(['strong', 'em']))
            .max(2)
            .optional(),
        }),
      )
      .max(200)
      .optional(),
  }),
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
  /**
   * A real multi-column table — a size chart, mostly.
   *
   * The caps are the portal's, hand-copied like every other number in this
   * file: `MAX_TABLE_COLUMNS` 8, `MAX_TABLE_ROWS` 40, `MAX_LABEL_LENGTH` 120
   * for a heading, `MAX_TABLE_CELL_LENGTH` 200 for a cell. A table it accepts
   * is therefore never truncated on arrival.
   *
   * Headers and cells use `truncatedOrBlankText`: blank is content in a grid,
   * and the producer permits it deliberately. What neither side permits is a
   * ragged row — see the union's own note above for where that is caught.
   */
  z.object({
    type: z.literal('table'),
    headers: z.array(truncatedOrBlankText(120)).min(1).max(8),
    rows: z
      .array(z.array(truncatedOrBlankText(200)).min(1).max(8))
      .min(1)
      .max(40),
    caption: truncatedText(4000).optional(),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string().url(),
    alt: truncatedText(160).optional(),
    caption: truncatedText(4000).optional(),
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
  /**
   * The supplier's own variant label, verbatim — e.g. `Black-1XL`.
   *
   * Optional, like every field added after 2026-08-13, so the portal can ship it
   * before this app reads it and vice versa. `truncatedText` rather than a bare
   * `max` so one overlong supplier string costs that label and not the whole
   * product page — the producer already truncates at the same 60, making this a
   * backstop rather than the authority.
   *
   * **Never parsed into option axes.** Splitting `Black-1XL` means guessing which
   * token is a colour, and a wrong guess becomes a customer-facing attribute.
   */
  label: truncatedText(60).optional(),
  /**
   * The photo to show while this variant is the buyer's selection.
   *
   * Optional like every field added after 2026-08-13, so either repository can
   * ship first. Absent for most variants and that is the ordinary case, not a
   * degraded one: the gallery is what renders when it is missing.
   *
   * The producer has already resolved this per option group, so every variant
   * sharing a leading option value reports the same address. **Do not re-derive
   * that here** — a second grouping rule in this repository is a second answer
   * that can disagree with the portal's.
   *
   * `z.string().url()` rather than `truncatedText`: an address is not display
   * text, and a truncated URL is a broken image rather than a shortened one.
   *
   * **`.catch` is load-bearing.** `variants` is a `salvagedArray`, so without it
   * a malformed address would drop the whole variant — costing a buyer a size
   * they can no longer choose, to avoid a missing thumbnail. Salvaging at the
   * field keeps the variant purchasable and lets the gallery fall back, which is
   * the right granularity for a decorative field on a commercial row.
   */
  imageUrl: z.string().url().optional().catch(undefined),
});

/**
 * Supplier-reported facts. No `quantity` field anywhere, on purpose: a count we
 * do not have must not become a field somebody later fills with an estimate.
 */
export const ProductSpecsSchema = z.object({
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

/**
 * One seller-entered category attribute — a **different kind of claim** from
 * `ProductSpecsSchema` above, which is why it is a separate schema rather than
 * more keys on that one. These are the seller's own declarations against their
 * category's attribute set; `specs` is what the supplier reported.
 *
 * The portal has already applied its display mapping (`UNBRANDED` → `Generic`)
 * and already dropped anything the workbook marks as not buyer-facing, so this
 * side validates shape and length and nothing else. Both fields are required
 * within a row — a labelless value or a valueless label is not a fact — and a
 * bad row is dropped by `salvagedArray` rather than costing the page.
 */
export const ProductSpecificationSchema = z.object({
  label: truncatedText(80),
  value: truncatedText(300),
});

export const StorefrontProductDetailSchema = StorefrontProductBaseSchema.extend(
  {
    imageUrl: z.string().url().nullable().optional(),
    imageAlt: truncatedText(160).optional(),
    publishedAt: z.string().datetime().optional(),
    categoryPath: truncatedText(200).optional(),
    /**
     * The same path with an address per level, so a breadcrumb can link every
     * one of them rather than only the department.
     *
     * `salvagedArray` bounds it and drops a malformed entry rather than the whole
     * trail: a breadcrumb losing one level is a worse page, and losing the
     * product because of it would be absurd.
     */
    categoryTrail: salvagedArray(CategoryTrailEntrySchema, 8).optional(),
    images: salvagedArray(ProductImageSchema, 12).optional(),
    description: z
      .object({ blocks: salvagedArray(DescriptionBlockSchema, 60) })
      .optional(),
    variants: salvagedArray(ProductVariantSchema, 200).optional(),
    specs: ProductSpecsSchema.optional(),
    specification: salvagedArray(ProductSpecificationSchema, 40).optional(),
    /**
     * The seller-edited `<meta name="description">`. Hidden metadata: it is
     * never rendered in the page body, and it is not the visible description.
     */
    metaDescription: truncatedText(320).optional(),
    /**
     * The star distribution behind `rating.average`, index 0 being one star.
     * Detail only — a card shows an average, a page shows the shape.
     */
    ratingBreakdown: z
      .tuple([
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
      ])
      .optional()
      .catch(undefined),
  },
);

export const StorefrontProductResponseSchema = z.object({
  product: StorefrontProductDetailSchema,
});

/**
 * One buyer review, as the product page renders it.
 *
 * `displayName` absent means the buyer chose to stay anonymous — the wording
 * for that is this side's to choose, which is why the portal stores no
 * placeholder string for it.
 */
export const ProductReviewSchema = z.object({
  id: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  body: truncatedText(1000).nullable(),
  displayName: truncatedText(60).nullable(),
  variantLabel: truncatedText(120).nullable(),
  createdAt: z.string(),
  reply: z
    .object({ body: truncatedText(1000), createdAt: z.string() })
    .nullable(),
});

/**
 * `salvagedArray`, so one malformed review is dropped rather than emptying the
 * whole section — the same call the description blocks make.
 */
export const ProductReviewsResponseSchema = z.object({
  reviews: salvagedArray(ProductReviewSchema, 50),
});

export type ProductReview = z.infer<typeof ProductReviewSchema>;
export type RatingSummary = z.infer<typeof RatingSummarySchema>;

export const CheckoutFreightQuoteSchema = z.object({
  quoteId: z.string().min(1).max(120),
  packageId: z.string().min(1).max(80),
  shippingTier: z.enum(SHIPPING_TIERS),
  cjLogisticName: truncatedText(120),
  optionId: z.string().min(1).max(120),
  channelId: z.string().min(1).max(120),
  arrivalTime: truncatedText(80),
  amountMinor: z.number().int().nonnegative(),
  /** Freight before an earned Standard-delivery promotion. */
  regularAmountMinor: z.number().int().nonnegative().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  originCountry: z.string().min(2).max(20),
  destinationCountry: z.string().min(2).max(20),
  ruleTips: z.array(truncatedText(200)).max(20),
  expiresAt: z.string().datetime(),
});

export const CheckoutFreightQuoteResponseSchema = z.object({
  quotes: z.array(CheckoutFreightQuoteSchema).max(100),
  packages: z
    .array(
      z.object({
        packageId: z.string().min(1).max(80),
        originCountry: z.string().min(2).max(20),
        itemCount: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(20),
  quotedAt: z.string().datetime(),
  freeShipping: z
    .object({
      thresholdAmountMinor: z.number().int().positive(),
      subtotalAmountMinor: z.number().int().nonnegative(),
      amountRemainingMinor: z.number().int().nonnegative(),
      eligible: z.boolean(),
      currency: z.enum(SUPPORTED_CURRENCIES),
    })
    .optional(),
});

export const CheckoutIntentResponseSchema = z.object({
  checkoutIntentId: z.uuid(),
});

export const CheckoutOrderAcceptResponseSchema = z.object({
  orderId: z.uuid(),
  orderNumber: z.string().min(1).max(80),
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
export type CheckoutFreightQuote = z.infer<typeof CheckoutFreightQuoteSchema>;
export type CheckoutFreightQuoteResponse = z.infer<
  typeof CheckoutFreightQuoteResponseSchema
>;
export type CheckoutIntentResponse = z.infer<
  typeof CheckoutIntentResponseSchema
>;
export type CheckoutOrderAcceptResponse = z.infer<
  typeof CheckoutOrderAcceptResponseSchema
>;
