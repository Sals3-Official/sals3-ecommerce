import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PRODUCTS_PAGE_SIZE,
  DEFAULT_STOREFRONT_API_URL,
  fetchProductBySlug,
  fetchProductCategories,
  fetchProducts,
  fetchProductsByCategory,
  parseProductsPagination,
  ProductsApiError,
  STOREFRONT_CATEGORIES_PATH,
  STOREFRONT_PRODUCTS_PATH,
  toHomeCategory,
  toHomeProduct,
  toProductDetail,
} from './products';

const validProductsResponse = {
  products: [
    {
      id: 'air-cooler',
      slug: 'air-cooler',
      title: 'Quiet tower air cooler',
      priceMinor: 199900,
      oldPriceMinor: 249900,
      imageUrl: 'https://cf.cjdropshipping.com/product-images/air-cooler.webp',
      imageAlt: 'Quiet tower air cooler',
      ratingLine: 'Rating 4.5, 2 reviews',
      shipLine: 'Bulky',
      category: 'home-living',
    },
  ],
  total: 1,
  page: 1,
  limit: 14,
  totalPages: 1,
};

const validCategoriesResponse = [
  {
    id: 'home-living',
    code: 'HL',
    name: 'Home and living',
  },
  {
    id: 'electronics',
    code: 'EL',
    name: 'Electronics',
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

function emptyProductsPage(
  overrides: Partial<typeof validProductsResponse> = {},
) {
  return {
    products: [],
    total: 0,
    page: 1,
    limit: DEFAULT_PRODUCTS_PAGE_SIZE,
    totalPages: 1,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetchProducts', () => {
  it('fetches the protected storefront product feed', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;
    let requestedInit: Parameters<typeof fetch>[1] | undefined;

    const fetcher: typeof fetch = async (url, init) => {
      requestedUrl = url;
      requestedInit = init;

      return jsonResponse(validProductsResponse);
    };

    const response = await fetchProducts({
      section: 'deals',
      page: 2,
      limit: 10,
      fetcher,
    });

    expect(requestedUrl).toBe(
      `${DEFAULT_STOREFRONT_API_URL}${STOREFRONT_PRODUCTS_PATH}?section=deals&page=2&limit=10`,
    );
    expect(requestedInit).toMatchObject({
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer secret',
      },
    });
    expect(response.products[0]?.title).toBe('Quiet tower air cooler');
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

  it('requires the storefront API token', async () => {
    await expect(fetchProducts({ fetcher: vi.fn() })).rejects.toThrow(
      'Storefront API token is not configured.',
    );
  });

  it('fetches product categories and maps them to landing navigation', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    let requestedUrl: Parameters<typeof fetch>[0] | undefined;
    let requestedInit: Parameters<typeof fetch>[1] | undefined;

    const fetcher: typeof fetch = async (url, init) => {
      requestedUrl = url;
      requestedInit = init;

      return jsonResponse(validCategoriesResponse);
    };

    const response = await fetchProductCategories({ fetcher });

    expect(requestedUrl).toEqual(
      new URL(STOREFRONT_CATEGORIES_PATH, DEFAULT_STOREFRONT_API_URL),
    );
    expect(requestedInit).toMatchObject({
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer secret',
      },
    });
    expect(toHomeCategory(response[0]!)).toEqual({
      id: 'home-living',
      code: 'HL',
      name: 'Home and living',
    });
  });

  it('rejects invalid product category slugs', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const fetcher: typeof fetch = async () =>
      jsonResponse([
        {
          id: '../admin',
          code: 'BA',
          name: 'Bad Category',
        },
      ]);

    await expect(fetchProductCategories({ fetcher })).rejects.toThrow(
      'Storefront categories API returned invalid data.',
    );
  });

  it('throws a typed error when the API response is not successful', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
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
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const fetcher: typeof fetch = async () =>
      jsonResponse({
        products: [
          {
            id: 'bad',
          },
        ],
        total: 1,
        page: 1,
        limit: 14,
        totalPages: 1,
      });

    await expect(fetchProducts({ fetcher })).rejects.toBeInstanceOf(
      ProductsApiError,
    );
    await expect(fetchProducts({ fetcher })).rejects.toThrow(
      'Storefront products API returned invalid data.',
    );
  });

  it('maps API products into landing cards with allow-listed image URLs', () => {
    const product = validProductsResponse.products[0]!;

    expect(toHomeProduct(product, 0)).toMatchObject({
      id: 'air-cooler',
      title: 'Quiet tower air cooler',
      imageUrl: 'https://cf.cjdropshipping.com/product-images/air-cooler.webp',
      imageAlt: 'Quiet tower air cooler',
    });

    expect(
      toHomeProduct(
        {
          ...product,
          imageUrl: 'https://example.com/product.webp',
        },
        0,
      ).imageUrl,
    ).toBeUndefined();
  });
});

describe('fetchProductBySlug', () => {
  it('pages through both sections and returns the matching product', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const requestedUrls: string[] = [];

    const fetcher: typeof fetch = async (url) => {
      const requestUrl = new URL(String(url));
      requestedUrls.push(requestUrl.search);
      const section = requestUrl.searchParams.get('section');

      if (section === 'deals') {
        return jsonResponse(validProductsResponse);
      }

      return jsonResponse(emptyProductsPage());
    };

    const product = await fetchProductBySlug('air-cooler', { fetcher });

    expect(product?.title).toBe('Quiet tower air cooler');
    expect(
      requestedUrls.some((search) => search.includes('section=for-you')),
    ).toBe(true);
    expect(
      requestedUrls.some((search) => search.includes('section=deals')),
    ).toBe(true);
  });

  it('returns undefined for an invalid slug without making a request', async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return jsonResponse(emptyProductsPage());
    };

    expect(await fetchProductBySlug('Not A Slug', { fetcher })).toBeUndefined();
    expect(called).toBe(false);
  });

  it('returns undefined when no product matches', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const fetcher: typeof fetch = async () => jsonResponse(emptyProductsPage());

    expect(
      await fetchProductBySlug('missing-slug', { fetcher }),
    ).toBeUndefined();
  });
});

describe('fetchProductsByCategory', () => {
  it('collects matching products across both sections up to the limit', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const fetcher: typeof fetch = async (url) => {
      const requestUrl = new URL(String(url));
      const section = requestUrl.searchParams.get('section');

      if (section === 'for-you') {
        return jsonResponse(validProductsResponse);
      }

      return jsonResponse(emptyProductsPage());
    };

    const products = await fetchProductsByCategory('home-living', {
      limit: 6,
      fetcher,
    });

    expect(products).toHaveLength(1);
    expect(products[0]?.slug).toBe('air-cooler');
  });

  it('rejects an invalid category slug without making a request', async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return jsonResponse(emptyProductsPage());
    };

    await expect(
      fetchProductsByCategory('../admin', { fetcher }),
    ).rejects.toMatchObject({ name: 'ProductsApiError' });
    expect(called).toBe(false);
  });
});

describe('toProductDetail', () => {
  it('maps a storefront product into trimmed PDP-ready detail', () => {
    const product = validProductsResponse.products[0]!;
    const detail = toProductDetail(product);

    expect(detail).toEqual({
      id: 'air-cooler',
      title: 'Quiet tower air cooler',
      category: 'home-living',
      price: { amountMinor: 199900, currency: 'PHP' },
      oldPrice: { amountMinor: 249900, currency: 'PHP' },
      ratingLine: 'Rating 4.5, 2 reviews',
      shipLine: 'Bulky',
      imageUrl: 'https://cf.cjdropshipping.com/product-images/air-cooler.webp',
      imageAlt: 'Quiet tower air cooler',
      tone: 'ocean',
    });
  });

  it('drops disallowed image hosts', () => {
    const product = {
      ...validProductsResponse.products[0]!,
      imageUrl: 'https://example.com/product.webp',
    };

    expect(toProductDetail(product).imageUrl).toBeUndefined();
  });
});
