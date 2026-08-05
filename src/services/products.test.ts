import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRODUCTS_PAGE_SIZE,
  fetchProductById,
  fetchProductCategories,
  fetchProducts,
  fetchProductsByCategory,
  fetchProductsByOffset,
  getRandomProductsSkip,
  parseProductId,
  parseProductsPagination,
  PRODUCT_CATEGORIES_API_URL,
  PRODUCTS_API_URL,
  ProductsApiError,
  toHomeCategory,
  toHomeProduct,
  toProductDetail,
} from './products';

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

const validCategoriesResponse = [
  {
    slug: 'mobile-accessories',
    name: 'Mobile Accessories',
    url: 'https://dummyjson.com/products/category/mobile-accessories',
  },
  {
    slug: 'skin-care',
    name: 'Skin Care',
    url: 'https://dummyjson.com/products/category/skin-care',
  },
];

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

    const response = await fetchProducts({ page: 2, limit: 10, fetcher });

    expect(requestedUrl).toBe(`${PRODUCTS_API_URL}?limit=10&skip=10`);
    expect(requestedInit).toMatchObject({
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
    expect(response.products).toHaveLength(1);
    expect(response.products[0]?.title).toBe('Essence Mascara Lash Princess');
  });

  it('sanitizes invalid pagination input to safe defaults', () => {
    expect(
      parseProductsPagination({
        page: '-5',
        limit: '1000',
      }),
    ).toEqual({
      page: 1,
      limit: DEFAULT_PRODUCTS_PAGE_SIZE,
    });
  });

  it('fetches products by a validated offset', async () => {
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;

    const fetcher: typeof fetch = async (url) => {
      requestedUrl = url;

      return jsonResponse(validProductsResponse);
    };

    await fetchProductsByOffset({
      skip: '-1',
      limit: '1000',
      fetcher,
    });

    expect(requestedUrl).toBe(
      `${PRODUCTS_API_URL}?limit=${DEFAULT_PRODUCTS_PAGE_SIZE}&skip=0`,
    );
  });

  it('calculates a bounded random skip for deal products', () => {
    expect(getRandomProductsSkip(21, 5, () => 0)).toBe(0);
    expect(getRandomProductsSkip(21, 5, () => 0.5)).toBe(8);
    expect(getRandomProductsSkip(21, 5, () => 1)).toBe(16);
    expect(getRandomProductsSkip(3, 5, () => 0.5)).toBe(0);
  });

  it('fetches product categories and maps them to landing navigation', async () => {
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;
    let requestedInit: Parameters<typeof fetch>[1] | undefined;

    const fetcher: typeof fetch = async (url, init) => {
      requestedUrl = url;
      requestedInit = init;

      return jsonResponse(validCategoriesResponse);
    };

    const response = await fetchProductCategories({ fetcher });

    expect(requestedUrl).toBe(PRODUCT_CATEGORIES_API_URL);
    expect(requestedInit).toMatchObject({
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
    expect(toHomeCategory(response[0]!)).toEqual({
      id: 'mobile-accessories',
      code: 'MA',
      name: 'Mobile Accessories',
    });
  });

  it('rejects invalid product category slugs', async () => {
    const fetcher: typeof fetch = async () =>
      jsonResponse([
        {
          slug: '../admin',
          name: 'Bad Category',
          url: 'https://dummyjson.com/products/category/bad-category',
        },
      ]);

    await expect(fetchProductCategories({ fetcher })).rejects.toThrow(
      'Product categories API returned invalid data.',
    );
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

  it('maps API products into landing cards with allow-listed image URLs', () => {
    const product = validProductsResponse.products[0]!;

    expect(toHomeProduct(product, 0)).toMatchObject({
      id: '1',
      title: 'Essence Mascara Lash Princess',
      imageUrl:
        'https://cdn.dummyjson.com/product-images/beauty/1/thumbnail.webp',
      imageAlt: 'Essence Mascara Lash Princess product image',
    });

    expect(
      toHomeProduct(
        {
          ...product,
          thumbnail: 'https://example.com/product.webp',
        },
        0,
      ).imageUrl,
    ).toBeUndefined();
  });
});

describe('fetchProductById', () => {
  it('fetches a single product by a validated numeric id', async () => {
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;

    const fetcher: typeof fetch = async (url) => {
      requestedUrl = url;

      return jsonResponse(validProductsResponse.products[0]);
    };

    const product = await fetchProductById('1', { fetcher });

    expect(requestedUrl).toBe(`${PRODUCTS_API_URL}/1`);
    expect(product?.title).toBe('Essence Mascara Lash Princess');
  });

  it('returns undefined for an invalid id without making a request', async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return jsonResponse({});
    };

    expect(await fetchProductById('not-a-number', { fetcher })).toBeUndefined();
    expect(await fetchProductById('-5', { fetcher })).toBeUndefined();
    expect(called).toBe(false);
  });

  it('returns undefined when the API responds 404', async () => {
    const fetcher: typeof fetch = async () =>
      new Response('Not found', { status: 404 });

    expect(await fetchProductById('999999', { fetcher })).toBeUndefined();
  });

  it('throws a typed error on a non-404 failure', async () => {
    const fetcher: typeof fetch = async () =>
      new Response('Server error', { status: 500 });

    await expect(fetchProductById('1', { fetcher })).rejects.toMatchObject({
      name: 'ProductsApiError',
      status: 500,
    });
  });

  it('parses valid ids and rejects invalid ones', () => {
    expect(parseProductId('42')).toBe(42);
    expect(parseProductId(7)).toBe(7);
    expect(parseProductId('abc')).toBeUndefined();
    expect(parseProductId('-1')).toBeUndefined();
    expect(parseProductId('1.5')).toBeUndefined();
  });
});

describe('fetchProductsByCategory', () => {
  it('fetches products for a validated category slug', async () => {
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;

    const fetcher: typeof fetch = async (url) => {
      requestedUrl = url;
      return jsonResponse(validProductsResponse);
    };

    const response = await fetchProductsByCategory('beauty', {
      limit: 6,
      fetcher,
    });

    expect(requestedUrl).toBe(`${PRODUCTS_API_URL}/category/beauty?limit=6`);
    expect(response.products).toHaveLength(1);
  });

  it('rejects an invalid category slug without making a request', async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return jsonResponse(validProductsResponse);
    };

    await expect(
      fetchProductsByCategory('../admin', { fetcher }),
    ).rejects.toMatchObject({ name: 'ProductsApiError' });
    expect(called).toBe(false);
  });
});

describe('toProductDetail', () => {
  it('maps an API product into PDP-ready detail with allow-listed images', () => {
    const product = validProductsResponse.products[0]!;
    const detail = toProductDetail(product);

    expect(detail).toMatchObject({
      id: '1',
      title: 'Essence Mascara Lash Princess',
      description: product.description,
      brand: 'Essence',
      category: 'beauty',
      shipLine: 'Ships in 3-5 business days',
      returnPolicy: 'No return policy',
      warranty: '1 week warranty',
      inStock: true,
      stockLine: '99 in stock',
    });
    expect(detail.images).toEqual([
      'https://cdn.dummyjson.com/product-images/beauty/1/1.webp',
    ]);
    expect(detail.reviews).toHaveLength(1);
    expect(detail.reviews[0]).toMatchObject({
      comment: 'Would not recommend.',
      reviewerName: 'Eleanor Pena',
    });
  });

  it('drops disallowed image hosts and reports out-of-stock products', () => {
    const product = {
      ...validProductsResponse.products[0]!,
      images: ['https://example.com/product.webp'],
      stock: 0,
    };

    const detail = toProductDetail(product);

    expect(detail.images).toEqual([]);
    expect(detail.inStock).toBe(false);
    expect(detail.stockLine).toBe('Out of stock');
  });
});
