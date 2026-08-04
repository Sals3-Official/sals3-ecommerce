import { describe, expect, it } from 'vitest';

import { fetchProducts, PRODUCTS_API_URL, ProductsApiError } from './products';

const validProductsResponse = {
  products: [
    {
      id: 1,
      title: 'Essence Mascara Lash Princess',
      description: 'The Essence Mascara Lash Princess is a popular mascara.',
      category: 'beauty',
      price: 9.99,
      discountPercentage: 10.48,
      rating: 2.56,
      stock: 99,
      tags: ['beauty', 'mascara'],
      brand: 'Essence',
      sku: 'BEA-ESS-ESS-001',
      weight: 4,
      dimensions: {
        width: 15.14,
        height: 13.08,
        depth: 22.99,
      },
      warrantyInformation: '1 week warranty',
      shippingInformation: 'Ships in 3-5 business days',
      availabilityStatus: 'In Stock',
      reviews: [
        {
          rating: 3,
          comment: 'Would not recommend.',
          date: '2025-04-30T09:41:02.053Z',
          reviewerName: 'Eleanor Pena',
          reviewerEmail: 'eleanor.pena@example.com',
        },
      ],
      returnPolicy: 'No return policy',
      minimumOrderQuantity: 48,
      meta: {
        createdAt: '2025-04-30T09:41:02.053Z',
        updatedAt: '2025-04-30T09:41:02.053Z',
        barcode: '5784719087687',
        qrCode: 'https://assets.dummyjson.com/public/qr-code.png',
      },
      images: ['https://cdn.dummyjson.com/product-images/beauty/1/1.webp'],
      thumbnail:
        'https://cdn.dummyjson.com/product-images/beauty/1/thumbnail.webp',
    },
  ],
  total: 1,
  skip: 0,
  limit: 30,
};

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('fetchProducts', () => {
  it('fetches products from DummyJSON and validates the response', async () => {
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;
    let requestedInit: Parameters<typeof fetch>[1] | undefined;

    const fetcher: typeof fetch = async (url, init) => {
      requestedUrl = url;
      requestedInit = init;

      return jsonResponse(validProductsResponse);
    };

    const response = await fetchProducts({ fetcher });

    expect(requestedUrl).toBe(PRODUCTS_API_URL);
    expect(requestedInit).toMatchObject({
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
    expect(response.products).toHaveLength(1);
    expect(response.products[0]?.title).toBe('Essence Mascara Lash Princess');
  });

  it('throws a typed error when the API response is not successful', async () => {
    const fetcher: typeof fetch = async () =>
      new Response('Server error', {
        status: 500,
        statusText: 'Server Error',
      });

    await expect(fetchProducts({ fetcher })).rejects.toMatchObject({
      name: 'ProductsApiError',
      status: 500,
    });
  });

  it('throws a typed error when the API returns invalid product data', async () => {
    const fetcher: typeof fetch = async () =>
      jsonResponse({
        products: [
          {
            id: 'not-a-number',
          },
        ],
        total: 1,
        skip: 0,
        limit: 30,
      });

    await expect(fetchProducts({ fetcher })).rejects.toBeInstanceOf(
      ProductsApiError,
    );
    await expect(fetchProducts({ fetcher })).rejects.toThrow(
      'Products API returned invalid data.',
    );
  });
});
