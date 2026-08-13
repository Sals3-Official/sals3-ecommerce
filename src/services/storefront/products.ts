import {
  getStorefrontApiUrl,
  productCachePolicy,
  ProductsApiError,
  requestStorefrontJson,
  STOREFRONT_CATEGORIES_PATH,
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

export async function fetchProductCategories({
  fetcher,
  signal,
}: FetchOptions = {}): Promise<ProductCategory[]> {
  const payload = await requestStorefrontJson(
    {
      url: getStorefrontApiUrl(STOREFRONT_CATEGORIES_PATH).toString(),
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
    { fetcher, signal, cachePolicy: productCachePolicy(parsedSlug.data) },
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
