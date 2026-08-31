import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usd } from '@/lib/money';
import type { ProductDetail } from '@/lib/product-detail';
import ProductSchema from './ProductSchema';

function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'waterproof-shell-jacket',
    title: 'Waterproof Shell Jacket',
    category: 'cat-app-100412',
    price: usd(4299),
    imageAlt: 'Waterproof Shell Jacket',
    tone: 'ocean',
    images: [{ url: 'https://cf.cjdropshipping.com/a.jpg', alt: 'Jacket' }],
    ...overrides,
  };
}

function parseSchema(
  element: ReturnType<typeof render>,
): Record<string, unknown> {
  const script = element.container.querySelector(
    'script[type="application/ld+json"]',
  );

  return JSON.parse(script?.innerHTML ?? '{}');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ProductSchema', () => {
  it('emits the real fields it was given', () => {
    const schema = parseSchema(
      render(
        <ProductSchema
          detail={detail({
            categoryName: "Men's Jackets",
            specs: { sku: 'SALS3-1', brand: 'Sals3 Basics' },
          })}
        />,
      ),
    );

    expect(schema).toMatchObject({
      '@type': 'Product',
      name: 'Waterproof Shell Jacket',
      sku: 'SALS3-1',
      category: "Men's Jackets",
      brand: { '@type': 'Brand', name: 'Sals3 Basics' },
      offers: { '@type': 'Offer', price: '42.99', priceCurrency: 'USD' },
    });
  });

  /**
   * A fabricated rating in machine-readable form can cost the whole domain its
   * rich results. Sals3 has no buyer reviews, and CJ's supplier-platform counts
   * are not Sals3 ratings.
   */
  it('never emits a rating or a review', () => {
    const schema = parseSchema(
      render(
        <ProductSchema detail={detail({ ratingLine: 'No reviews yet' })} />,
      ),
    );

    expect('aggregateRating' in schema).toBe(false);
    expect('review' in schema).toBe(false);
  });

  /** Defaulting an unknown stock state to `InStock` is the worst option here. */
  it.each([undefined, 'UNKNOWN' as const])(
    'omits offers.availability for %s',
    (availability) => {
      const schema = parseSchema(
        render(<ProductSchema detail={detail({ availability })} />),
      );

      expect('availability' in (schema.offers as object)).toBe(false);
    },
  );

  it.each([
    ['AVAILABLE' as const, 'https://schema.org/InStock'],
    ['UNAVAILABLE' as const, 'https://schema.org/OutOfStock'],
  ])('emits %s availability as %s', (availability, expected) => {
    const schema = parseSchema(
      render(<ProductSchema detail={detail({ availability })} />),
    );

    expect((schema.offers as { availability: string }).availability).toBe(
      expected,
    );
  });

  it('emits an AggregateOffer only when several real variant prices exist', () => {
    const schema = parseSchema(
      render(
        <ProductSchema
          detail={detail({
            variants: [
              {
                id: 'v1',
                sku: 'A',
                price: usd(4299),
                availability: 'AVAILABLE',
              },
              {
                id: 'v2',
                sku: 'B',
                price: usd(4499),
                availability: 'UNKNOWN',
              },
            ],
          })}
        />,
      ),
    );

    expect(schema.offers).toMatchObject({
      '@type': 'AggregateOffer',
      lowPrice: '42.99',
      highPrice: '44.99',
      offerCount: 2,
    });
  });

  /** A range string cannot be a `QuantitativeValue`, so weight is never emitted. */
  it('never emits weight, shipping, returns, or price validity', () => {
    const schema = parseSchema(
      render(
        <ProductSchema detail={detail({ specs: { weightGrams: 880 } })} />,
      ),
    );

    ['weight', 'shippingDetails', 'hasMerchantReturnPolicy'].forEach((key) => {
      expect(key in schema).toBe(false);
    });
    expect('priceValidUntil' in (schema.offers as object)).toBe(false);
  });

  it('omits the description when no blocks exist', () => {
    const schema = parseSchema(render(<ProductSchema detail={detail()} />));

    expect('description' in schema).toBe(false);
  });

  it('flattens description blocks into text when they exist', () => {
    const schema = parseSchema(
      render(
        <ProductSchema
          detail={detail({
            description: [
              { type: 'paragraph', text: 'A warm jacket.' },
              { type: 'bulletList', items: ['Fleece lined'] },
            ],
          })}
        />,
      ),
    );

    expect(schema.description).toBe('A warm jacket. Fleece lined');
  });

  /**
   * A size chart is real seller-authored content on the page, unlike an
   * image's alt text — Google's own requirement is that `description` match
   * what a visitor sees, and a chart is often the most-read part of a
   * description. So a table contributes text here, unlike an image.
   */
  it('flattens a table into its caption, headings, and rows', () => {
    const schema = parseSchema(
      render(
        <ProductSchema
          detail={detail({
            description: [
              {
                type: 'table',
                caption: 'Measurements in centimetres',
                headers: ['Size', 'Waist'],
                rows: [
                  ['M', '65'],
                  ['L', ''],
                ],
              },
            ],
          })}
        />,
      ),
    );

    expect(schema.description).toBe(
      'Measurements in centimetres Size · Waist M · 65 L',
    );
  });

  it('omits an unnamed table from the description rather than crashing', () => {
    const schema = parseSchema(
      render(
        <ProductSchema
          detail={detail({
            description: [
              {
                type: 'table',
                headers: ['Size'],
                rows: [['M']],
              },
            ],
          })}
        />,
      ),
    );

    expect(schema.description).toBe('Size M');
  });

  /**
   * Supplier-originated text, unlike the static organisation schema — a
   * `</script>` in a title must not be able to close the tag.
   */
  it('escapes < so supplier text cannot close the script tag', () => {
    const element = render(
      <ProductSchema
        detail={detail({ title: 'Jacket </script><script>alert(1)' })}
      />,
    );
    const html =
      element.container.querySelector('script[type="application/ld+json"]')
        ?.innerHTML ?? '';

    expect(html).not.toContain('</script>');
    expect(html).toContain('\\u003c');
  });

  it('omits offers.url when no site URL is configured', () => {
    const schema = parseSchema(render(<ProductSchema detail={detail()} />));

    expect('url' in (schema.offers as object)).toBe(false);
  });
});
