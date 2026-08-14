import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProductBySlug } from '@/services/storefront/products';
import type { ProductPayloadDetail } from '@/services/storefront/schemas';
import { validateCheckoutCart } from './cart-validation';

vi.mock('server-only', () => ({}));

vi.mock('@/services/storefront/products', () => ({
  fetchProductBySlug: vi.fn(),
}));

const mockedFetchProductBySlug = vi.mocked(fetchProductBySlug);

function product(
  overrides: Partial<ProductPayloadDetail> = {},
): ProductPayloadDetail {
  return {
    id: 'p1',
    slug: 'jacket',
    title: 'Jacket',
    currency: 'USD',
    priceMinor: 2000,
    category: 'fashion',
    imageUrl: 'https://cf.cjdropshipping.com/quick/product/a.jpg',
    imageAlt: 'Jacket',
    availability: 'AVAILABLE',
    ...overrides,
  };
}

describe('validateCheckoutCart', () => {
  beforeEach(() => {
    mockedFetchProductBySlug.mockReset();
  });

  it('uses the current storefront price, not the browser cart price', async () => {
    mockedFetchProductBySlug.mockResolvedValue(product({ priceMinor: 2500 }));

    const result = await validateCheckoutCart([
      { productId: 'jacket', quantity: 2 },
    ]);

    expect(result.lines[0]?.unitPrice).toEqual({
      amountMinor: 2500,
      currency: 'USD',
    });
    expect(result.subtotal).toEqual({ amountMinor: 5000, currency: 'USD' });
  });

  it('rejects a stale cart product', async () => {
    mockedFetchProductBySlug.mockResolvedValue(undefined);

    await expect(
      validateCheckoutCart([{ productId: 'missing', quantity: 1 }]),
    ).rejects.toThrow(/no longer available/i);
  });

  it('rejects mixed-currency checkout', async () => {
    mockedFetchProductBySlug
      .mockResolvedValueOnce(product({ slug: 'usd-product', currency: 'USD' }))
      .mockResolvedValueOnce(product({ slug: 'aud-product', currency: 'AUD' }));

    await expect(
      validateCheckoutCart([
        { productId: 'usd-product', quantity: 1 },
        { productId: 'aud-product', quantity: 1 },
      ]),
    ).rejects.toThrow(/more than one currency/i);
  });

  it('rejects unavailable variants', async () => {
    mockedFetchProductBySlug.mockResolvedValue(
      product({
        variants: [
          {
            id: 'v1',
            sku: 'SKU-1',
            priceMinor: 2000,
            currency: 'USD',
            availability: 'UNAVAILABLE',
          },
        ],
      }),
    );

    await expect(
      validateCheckoutCart([
        { productId: 'jacket', variantId: 'v1', quantity: 1 },
      ]),
    ).rejects.toThrow(/no longer available/i);
  });

  it('rejects old multi-variant carts without a variant id clearly', async () => {
    mockedFetchProductBySlug.mockResolvedValue(
      product({
        variants: [
          {
            id: 'v1',
            sku: 'SKU-1',
            priceMinor: 2000,
            currency: 'USD',
            availability: 'AVAILABLE',
          },
          {
            id: 'v2',
            sku: 'SKU-2',
            priceMinor: 2500,
            currency: 'USD',
            availability: 'AVAILABLE',
          },
        ],
      }),
    );

    await expect(
      validateCheckoutCart([{ productId: 'jacket', quantity: 1 }]),
    ).rejects.toThrow(/remove it and add it again/i);
  });

  /**
   * This asserted the opposite until 2026-08-15: the order line read
   * `Jacket - S3V-2268B366F762`. A SHA-256 digest tells the person paying nothing
   * about what they are buying, so the SKU fallback is gone. With a supplier label
   * the line names the variant; without one it names the product and stops.
   */
  it('names an optionless variant by its supplier label, never by the SKU', async () => {
    mockedFetchProductBySlug.mockResolvedValue(
      product({
        variants: [
          {
            id: 'v1',
            sku: 'S3V-2268B366F762',
            priceMinor: 451,
            currency: 'USD',
            availability: 'AVAILABLE',
            label: 'Army Green-XL',
          },
        ],
      }),
    );

    const result = await validateCheckoutCart([
      { productId: 'jacket', variantId: 'v1', quantity: 1 },
    ]);

    expect(result.lines[0]?.title).toBe('Jacket - Army Green-XL');
    expect(result.lines[0]?.title).not.toMatch(/S3V-/);
    expect(result.lines[0]?.unitPrice).toEqual({
      amountMinor: 451,
      currency: 'USD',
    });
  });

  it('falls back to the product title alone when no label exists', async () => {
    mockedFetchProductBySlug.mockResolvedValue(
      product({
        variants: [
          {
            id: 'v1',
            sku: 'S3V-2268B366F762',
            priceMinor: 451,
            currency: 'USD',
            availability: 'AVAILABLE',
          },
        ],
      }),
    );

    const result = await validateCheckoutCart([
      { productId: 'jacket', variantId: 'v1', quantity: 1 },
    ]);

    expect(result.lines[0]?.title).toBe('Jacket');
    expect(result.lines[0]?.title).not.toMatch(/S3V-/);
  });
});
