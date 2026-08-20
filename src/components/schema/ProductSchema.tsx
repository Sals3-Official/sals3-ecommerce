import { getSiteUrl } from '@/lib/site';
import type { ProductDetail } from '@/lib/product-detail';

type ProductSchemaProps = {
  detail: ProductDetail;
};

function minor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function availabilityUrl(detail: ProductDetail): string | undefined {
  if (detail.availability === 'AVAILABLE') {
    return 'https://schema.org/InStock';
  }

  if (detail.availability === 'UNAVAILABLE') {
    return 'https://schema.org/OutOfStock';
  }

  return undefined;
}

/**
 * The description blocks flattened to text, or nothing. Never the title again:
 * a `description` that repeats `name` tells a crawler nothing and reads as
 * padding.
 */
function describe(detail: ProductDetail): string | undefined {
  const blocks = detail.description ?? [];

  if (blocks.length === 0) return undefined;

  const text = blocks
    .map((block) => {
      if (block.type === 'paragraph' || block.type === 'heading') {
        return block.text;
      }

      if (block.type === 'bulletList') return block.items.join(' ');

      // An image contributes no description text — its caption is about the
      // picture, and its alt inside JSON-LD prose would read as padding.
      if (block.type === 'image') return '';

      return block.entries
        .map((entry) => `${entry.label}: ${entry.value}`)
        .join(' ');
    })
    .filter((part) => part !== '')
    .join(' ')
    .trim();

  return text === '' ? undefined : text;
}

/**
 * `Product` / `Offer` structured data for the PDP.
 *
 * ## Only real fields, and the omissions are the point
 *
 * Google can issue a manual action against a whole domain for structured data
 * that does not match the page, so every field here is one the portal actually
 * sent. What is deliberately absent, and why:
 *
 * - **`aggregateRating` / `review`** — Sals3 has no buyer reviews. CJ's
 *   supplier-platform review counts are supplier evidence, not Sals3 ratings,
 *   and presenting them as either would be a fabricated rating in the one place
 *   search engines treat as a machine-readable promise.
 * - **`offers.availability`** — emitted only for an explicit `AVAILABLE` or
 *   `UNAVAILABLE`. `UNKNOWN` (the common case) emits no field at all. Defaulting
 *   to `InStock` is the single most damaging fabrication available here.
 * - **`brand` / `gtin*` / `mpn`** — emitted only when the portal sent them.
 * - **`weight`** — never emitted. `QuantitativeValue` needs one number, and the
 *   supplier reports a range ("850.00-930.00 g").
 * - **`shippingDetails`, `hasMerchantReturnPolicy`, `priceValidUntil`** — no
 *   rate table, no returns policy, and no price-validity evidence exist.
 * - **`offers.url`** — omitted when no site URL is configured, matching
 *   `OrganizationSchema`.
 *
 * ## Escaping
 *
 * `<` is escaped to `<`. Unlike the static organisation and website
 * schemas, this payload contains supplier-originated text, so a `</script>`
 * inside a title or description must not be able to close the tag.
 */
export default function ProductSchema({ detail }: ProductSchemaProps) {
  const siteUrl = getSiteUrl();
  const url = siteUrl === undefined ? undefined : `${siteUrl}/p/${detail.id}`;
  const images = detail.images.map((image) => image.url);
  const description = describe(detail);
  const availability = availabilityUrl(detail);
  const variantPrices = (detail.variants ?? []).map(
    (variant) => variant.price.amountMinor,
  );

  const offers =
    variantPrices.length > 1
      ? {
          '@type': 'AggregateOffer',
          lowPrice: minor(Math.min(...variantPrices)),
          highPrice: minor(Math.max(...variantPrices)),
          priceCurrency: detail.price.currency,
          offerCount: variantPrices.length,
          ...(url === undefined ? {} : { url }),
        }
      : {
          '@type': 'Offer',
          price: minor(detail.price.amountMinor),
          priceCurrency: detail.price.currency,
          ...(availability === undefined ? {} : { availability }),
          ...(url === undefined ? {} : { url }),
        };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: detail.title,
    ...(images.length === 0 ? {} : { image: images }),
    ...(description === undefined ? {} : { description }),
    ...(detail.specs?.sku === undefined ? {} : { sku: detail.specs.sku }),
    ...(detail.specs?.mpn === undefined ? {} : { mpn: detail.specs.mpn }),
    ...(detail.specs?.gtins === undefined || detail.specs.gtins.length === 0
      ? {}
      : { gtin: detail.specs.gtins[0] }),
    ...(detail.specs?.brand === undefined
      ? {}
      : { brand: { '@type': 'Brand', name: detail.specs.brand } }),
    ...(detail.categoryName === undefined
      ? {}
      : { category: detail.categoryName }),
    offers,
  };

  return (
    <script
      type="application/ld+json"
      // Server-generated JSON with `<` escaped below, so supplier text cannot
      // close this tag.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}
