import {
  getStorefrontApiUrl,
  productCachePolicy,
  ProductsApiError,
  requestStorefrontJson,
  STOREFRONT_CATEGORIES_PATH,
  STOREFRONT_SEARCH_PATH,
  STOREFRONT_PRODUCTS_PATH,
} from './client';
import {
  DEFAULT_PRODUCTS_PAGE_SIZE,
  MAX_PRODUCTS_PAGE_SIZE,
  ProductCategoriesResponseSchema,
  ProductsPaginationSchema,
  ProductsResponseSchema,
  queryIntegerSchema,
  StorefrontProductDetailSchema,
  StorefrontProductResponseSchema,
  StorefrontProductSchema,
  StorefrontSectionSchema,
  type Product,
  type ProductCategory,
  type ProductPayloadDetail,
  type ProductsPagination,
  type ProductsResponse,
  type StorefrontSection,
} from './schemas';

/** The storefront reads. Nothing here formats or maps — see `mappers.ts`. */

type FetchOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

type FetchProductsOptions = FetchOptions & {
  section?: unknown;
  page?: unknown;
  limit?: unknown;
};

type FetchProductsByCategoryOptions = FetchOptions & {
  limit?: unknown;
};

export type CategoryProductsSort = 'newest' | 'price-asc' | 'price-desc';

type FetchCategoryProductsOptions = FetchOptions & {
  sort?: CategoryProductsSort;
  page?: unknown;
  limit?: unknown;
  /** Inclusive card-price bounds, in minor units. */
  minPriceMinor?: number;
  maxPriceMinor?: number;
};

export function parseProductsPagination(
  input: Partial<Record<'page' | 'limit', unknown>> = {},
): ProductsPagination {
  return ProductsPaginationSchema.parse(input);
}

export function getProductsTotalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

function getProductsApiUrl(input: {
  section: StorefrontSection;
  page: number;
  limit: number;
}): string {
  const url = getStorefrontApiUrl(STOREFRONT_PRODUCTS_PATH);

  url.searchParams.set('section', input.section);
  url.searchParams.set('page', String(input.page));
  url.searchParams.set('limit', String(input.limit));

  return url.toString();
}

export async function fetchProducts({
  section = 'for-you',
  page,
  limit,
  fetcher,
  signal,
}: FetchProductsOptions = {}): Promise<ProductsResponse> {
  const parsedSection = StorefrontSectionSchema.catch('for-you').parse(section);
  const pagination = parseProductsPagination({ page, limit });
  const payload = await requestStorefrontJson(
    {
      url: getProductsApiUrl({
        section: parsedSection,
        page: pagination.page,
        limit: pagination.limit,
      }),
      schema: ProductsResponseSchema,
      subject: 'products API',
    },
    { fetcher, signal },
  );

  // No `notFoundStatuses`, so this cannot be undefined.
  return payload as ProductsResponse;
}

type FetchProductCategoriesOptions = FetchOptions & {
  /**
   * `'stocked'` (default) asks for the main categories with a published
   * product behind them; `'all'` asks for every department in the taxonomy,
   * which is what the "All departments" page shows.
   */
  scope?: 'stocked' | 'all';
};

function getCategoriesApiUrl(scope: 'stocked' | 'all'): string {
  const url = getStorefrontApiUrl(STOREFRONT_CATEGORIES_PATH);

  // Only sent for 'all': the producer's default is the stocked list, and an
  // explicit `scope=stocked` would needlessly split its cache key.
  if (scope === 'all') url.searchParams.set('scope', 'all');

  return url.toString();
}

export async function fetchProductCategories({
  scope = 'stocked',
  fetcher,
  signal,
}: FetchProductCategoriesOptions = {}): Promise<ProductCategory[]> {
  const payload = await requestStorefrontJson(
    {
      url: getCategoriesApiUrl(scope),
      schema: ProductCategoriesResponseSchema,
      subject: 'categories API',
    },
    { fetcher, signal },
  );

  return payload as ProductCategory[];
}

function getProductByIdApiUrl(id: string): string {
  return getStorefrontApiUrl(
    `${STOREFRONT_PRODUCTS_PATH}/${encodeURIComponent(id)}`,
  ).toString();
}

/**
 * One product's full detail, or `undefined` for a slug that is not a published
 * product.
 *
 * `undefined` means genuinely absent — an invalid slug shape, or a 404. Every
 * other failure throws, so the PDP can tell "no such product" from "the
 * catalogue is unreachable" and render the right page for each.
 */
export async function fetchProductBySlug(
  slug: unknown,
  { fetcher, signal }: FetchOptions = {},
): Promise<ProductPayloadDetail | undefined> {
  const parsedSlug = StorefrontProductDetailSchema.shape.slug.safeParse(slug);

  if (!parsedSlug.success) {
    return undefined;
  }

  const payload = await requestStorefrontJson(
    {
      url: getProductByIdApiUrl(parsedSlug.data),
      schema: StorefrontProductResponseSchema,
      subject: 'product API',
      notFoundStatuses: [404],
    },
    { fetcher, signal, cachePolicy: productCachePolicy() },
  );

  return payload?.product;
}

/**
 * sals3-portal has a real single-product endpoint, but no category-filter one
 * yet — related products still page through a section and filter client-side.
 * Capped at 2 pages per section (≤60 products/section) rather than scanning
 * further.
 *
 * This is a stopgap and should be replaced by a portal-side category endpoint;
 * with a small published catalogue it currently reads the whole thing.
 */
const MAX_CLIENT_SIDE_SEARCH_PAGES = 2;

async function collectSectionProducts(
  section: StorefrontSection,
  page: number,
  options: FetchOptions,
): Promise<Product[]> {
  const response = await fetchProducts({
    section,
    page,
    limit: MAX_PRODUCTS_PAGE_SIZE,
    ...options,
  });
  const lastPage = Math.min(response.totalPages, MAX_CLIENT_SIDE_SEARCH_PAGES);

  if (page >= lastPage) {
    return response.products;
  }

  const rest = await collectSectionProducts(section, page + 1, options);

  return [...response.products, ...rest];
}

async function collectAllProducts(options: FetchOptions): Promise<Product[]> {
  // Chained via reduce rather than Promise.all: the two sections are two
  // upstream reads, and serialising them keeps one page view from doubling the
  // portal's load for a result that is then deduplicated anyway.
  const products = await StorefrontSectionSchema.options.reduce(
    async (accPromise, section) => {
      const acc = await accPromise;
      const sectionProducts = await collectSectionProducts(section, 1, options);

      return [...acc, ...sectionProducts];
    },
    Promise.resolve<Product[]>([]),
  );

  // The same product can legitimately appear in both the "for-you" and "deals"
  // sections at once — dedupe by id so callers never see it twice (React key
  // collisions, doubled related-product cards).
  return Array.from(
    new Map(products.map((product) => [product.id, product])).values(),
  );
}

export async function fetchProductsByCategory(
  category: unknown,
  { limit, fetcher, signal }: FetchProductsByCategoryOptions = {},
): Promise<Product[]> {
  const parsedCategory =
    StorefrontProductSchema.shape.category.safeParse(category);
  const parsedLimit = queryIntegerSchema(
    MAX_PRODUCTS_PAGE_SIZE,
    DEFAULT_PRODUCTS_PAGE_SIZE,
  ).parse(limit);

  if (!parsedCategory.success) {
    throw new ProductsApiError('Invalid product category.', {
      cause: parsedCategory.error,
    });
  }

  const products = await collectAllProducts({ fetcher, signal });

  return products
    .filter((product) => product.category === parsedCategory.data)
    .slice(0, parsedLimit);
}

function getCategoryProductsApiUrl(
  category: string,
  options: FetchCategoryProductsOptions,
  pagination: ProductsPagination,
): string {
  const url = getStorefrontApiUrl(
    `${STOREFRONT_CATEGORIES_PATH}/${encodeURIComponent(category)}/products`,
  );

  url.searchParams.set('page', String(pagination.page));
  url.searchParams.set('limit', String(pagination.limit));

  // Only sent when narrowing. The producer defaults each of these, and an
  // explicit default would needlessly split its cache key.
  if (options.sort !== undefined && options.sort !== 'newest') {
    url.searchParams.set('sort', options.sort);
  }
  if (options.minPriceMinor !== undefined) {
    url.searchParams.set('minPriceMinor', String(options.minPriceMinor));
  }
  if (
    options.maxPriceMinor !== undefined &&
    options.maxPriceMinor !== Infinity
  ) {
    url.searchParams.set('maxPriceMinor', String(options.maxPriceMinor));
  }

  return url.toString();
}

/**
 * One department's published products, filtered, sorted and paged **by the
 * portal**.
 *
 * Replaces `fetchProductsByCategory` for the `/c/[slug]` listing. That function
 * scanned two feed sections, deduped them, and filtered on `product.category`
 * in JavaScript — which could never match, because the feed's `category` is the
 * *leaf* taxonomy row (`cat-ggl-5079`) while a browse URL names an *L1
 * department* (`animals-pet-supplies`). The rollup that reconciles the two
 * lives in the portal, so the filter now runs there, in SQL, against the same
 * `publishedScope()` the rest of the catalogue is gated by.
 *
 * `undefined` means the slug is not one of the 21 departments — the producer
 * answers 404 for that, and the page renders its own not-found rather than an
 * empty department that would imply the address was real.
 */
export async function fetchCategoryProducts(
  category: unknown,
  options: FetchCategoryProductsOptions = {},
): Promise<ProductsResponse | undefined> {
  const parsedCategory =
    StorefrontProductSchema.shape.category.safeParse(category);

  if (!parsedCategory.success) {
    return undefined;
  }

  const pagination = parseProductsPagination({
    page: options.page,
    limit: options.limit ?? MAX_PRODUCTS_PAGE_SIZE,
  });

  return requestStorefrontJson(
    {
      url: getCategoryProductsApiUrl(parsedCategory.data, options, pagination),
      schema: ProductsResponseSchema,
      subject: 'category products API',
      notFoundStatuses: [404],
    },
    { fetcher: options.fetcher, signal: options.signal },
  );
}

type FetchSearchOptions = FetchOptions & {
  category?: string | null;
  sort?: CategoryProductsSort;
  page?: unknown;
  limit?: unknown;
  minPriceMinor?: number;
  maxPriceMinor?: number;
};

/**
 * Search the published catalogue.
 *
 * The term is sent as a parameter and never interpolated into the path, so a
 * slash or a question mark in it is a character the producer matches rather
 * than a route it changes. An empty term is answered by the producer as an
 * empty feed rather than an error, so the caller does not have to special-case
 * it before asking — though the page avoids the round trip anyway.
 */
export async function fetchSearchProducts(
  term: string,
  options: FetchSearchOptions = {},
): Promise<ProductsResponse> {
  const pagination = parseProductsPagination({
    page: options.page,
    limit: options.limit ?? MAX_PRODUCTS_PAGE_SIZE,
  });
  const url = getStorefrontApiUrl(STOREFRONT_SEARCH_PATH);

  url.searchParams.set('q', term);
  url.searchParams.set('page', String(pagination.page));
  url.searchParams.set('limit', String(pagination.limit));

  if (options.category !== undefined && options.category !== null) {
    url.searchParams.set('category', options.category);
  }
  if (options.sort !== undefined && options.sort !== 'newest') {
    url.searchParams.set('sort', options.sort);
  }
  if (options.minPriceMinor !== undefined) {
    url.searchParams.set('minPriceMinor', String(options.minPriceMinor));
  }
  if (
    options.maxPriceMinor !== undefined &&
    options.maxPriceMinor !== Infinity
  ) {
    url.searchParams.set('maxPriceMinor', String(options.maxPriceMinor));
  }

  const payload = await requestStorefrontJson(
    {
      url: url.toString(),
      schema: ProductsResponseSchema,
      subject: 'search API',
    },
    { fetcher: options.fetcher, signal: options.signal },
  );

  // No `notFoundStatuses`, so this cannot be undefined.
  return payload as ProductsResponse;
}
