import { z } from 'zod';
import { peso } from '@/lib/money';
import type {
  Category as HomeCategory,
  PlaceholderTone,
  Product as HomeProduct,
} from '@/lib/home-placeholder-data';
import type { ProductDetail } from '@/lib/product-detail';

export const DEFAULT_STOREFRONT_API_URL = 'http://localhost:3001';
export const STOREFRONT_PRODUCTS_PATH = '/api/storefront/products';
export const STOREFRONT_CATEGORIES_PATH = '/api/storefront/categories';
export const DEFAULT_PRODUCTS_PAGE_SIZE = 10;
export const MAX_PRODUCTS_PAGE_SIZE = 30;
export const MAX_PRODUCTS_PAGE = 1000;

const PRODUCT_IMAGE_HOSTS = [
  'cf.cjdropshipping.com',
  'oss-cf.cjdropshipping.com',
];
const PRODUCT_TONES: PlaceholderTone[] = ['ocean', 'dusk', 'meadow', 'clay'];
const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function queryIntegerSchema(maximum: number, fallback: number) {
  return z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.coerce.number().int().min(1).max(maximum),
    )
    .catch(fallback);
}

const ProductsPaginationSchema = z.object({
  page: queryIntegerSchema(MAX_PRODUCTS_PAGE, 1),
  limit: queryIntegerSchema(MAX_PRODUCTS_PAGE_SIZE, DEFAULT_PRODUCTS_PAGE_SIZE),
});

const StorefrontSectionSchema = z.enum(['for-you', 'deals']);

const StorefrontProductSchema = z.object({
  id: z.string().min(1).max(120),
  slug: z.string().regex(CATEGORY_SLUG_PATTERN),
  title: z.string().min(1).max(120),
  priceMinor: z.number().int().positive(),
  oldPriceMinor: z.number().int().positive(),
  imageUrl: z.string().url().nullable(),
  imageAlt: z.string().min(1).max(160),
  ratingLine: z.string().min(1).max(80),
  shipLine: z.string().min(1).max(120),
  category: z.string().regex(CATEGORY_SLUG_PATTERN),
});

export const ProductsResponseSchema = z.object({
  products: z.array(StorefrontProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});

const ProductCategorySchema = z.object({
  id: z.string().regex(CATEGORY_SLUG_PATTERN),
  code: z.string().min(1).max(4),
  name: z.string().min(1).max(80),
});

export const ProductCategoriesResponseSchema = z.array(ProductCategorySchema);

export type Product = z.infer<typeof StorefrontProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
export type ProductsPagination = z.infer<typeof ProductsPaginationSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export class ProductsApiError extends Error {
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'ProductsApiError';
    this.status = options?.status;
  }
}

type FetchProductsOptions = {
  section?: unknown;
  page?: unknown;
  limit?: unknown;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

type FetchProductCategoriesOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

type FetchProductBySlugOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

type FetchProductsByCategoryOptions = {
  limit?: unknown;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

export function parseProductsPagination(
  input: Partial<Record<'page' | 'limit', unknown>> = {},
): ProductsPagination {
  return ProductsPaginationSchema.parse(input);
}

export function getProductsTotalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

function getStorefrontApiUrl(path: string): URL {
  return new URL(
    path,
    process.env.SALS3_PORTAL_API_URL ?? DEFAULT_STOREFRONT_API_URL,
  );
}

function getAuthorizationHeader(): string {
  const token = process.env.SALS3_STOREFRONT_API_TOKEN;

  if (token === undefined || token === '') {
    throw new ProductsApiError('Storefront API token is not configured.');
  }

  return `Bearer ${token}`;
}

function getProductsApiUrl({
  section,
  page,
  limit,
}: {
  section: z.infer<typeof StorefrontSectionSchema>;
  page: number;
  limit: number;
}): string {
  const url = getStorefrontApiUrl(STOREFRONT_PRODUCTS_PATH);

  url.searchParams.set('section', section);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));

  return url.toString();
}

export async function fetchProducts({
  section = 'for-you',
  page,
  limit,
  fetcher = fetch,
  signal,
}: FetchProductsOptions = {}): Promise<ProductsResponse> {
  const parsedSection = StorefrontSectionSchema.catch('for-you').parse(section);
  const pagination = parseProductsPagination({ page, limit });
  const response = await fetcher(
    getProductsApiUrl({
      section: parsedSection,
      page: pagination.page,
      limit: pagination.limit,
    }),
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: getAuthorizationHeader(),
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new ProductsApiError('Storefront products API request failed.', {
      status: response.status,
    });
  }

  const payload: unknown = await response.json();
  const parsedPayload = ProductsResponseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new ProductsApiError(
      'Storefront products API returned invalid data.',
      {
        cause: parsedPayload.error,
      },
    );
  }

  return parsedPayload.data;
}

export async function fetchProductCategories({
  fetcher = fetch,
  signal,
}: FetchProductCategoriesOptions = {}): Promise<ProductCategory[]> {
  const response = await fetcher(
    getStorefrontApiUrl(STOREFRONT_CATEGORIES_PATH),
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: getAuthorizationHeader(),
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new ProductsApiError('Storefront categories API request failed.', {
      status: response.status,
    });
  }

  const payload: unknown = await response.json();
  const parsedPayload = ProductCategoriesResponseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new ProductsApiError(
      'Storefront categories API returned invalid data.',
      {
        cause: parsedPayload.error,
      },
    );
  }

  return parsedPayload.data;
}

async function collectSectionProducts(
  section: z.infer<typeof StorefrontSectionSchema>,
  page: number,
  fetcher: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<Product[]> {
  const response = await fetchProducts({
    section,
    page,
    limit: MAX_PRODUCTS_PAGE_SIZE,
    fetcher,
    signal,
  });

  if (page >= response.totalPages) {
    return response.products;
  }

  const rest = await collectSectionProducts(section, page + 1, fetcher, signal);

  return [...response.products, ...rest];
}

/**
 * The storefront API has no dedicated single-product or category-filter
 * route yet — only the paginated `section` list. Until one exists, PDP
 * lookups page through both sections and match by slug/category
 * client-side. Replace with a direct endpoint once the backend adds one.
 */
async function collectAllProducts({
  fetcher,
  signal,
}: {
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<Product[]> {
  const sections = await Promise.all(
    StorefrontSectionSchema.options.map((section) =>
      collectSectionProducts(section, 1, fetcher, signal),
    ),
  );

  return sections.flat();
}

export async function fetchProductBySlug(
  slug: unknown,
  { fetcher = fetch, signal }: FetchProductBySlugOptions = {},
): Promise<Product | undefined> {
  const parsedSlug = StorefrontProductSchema.shape.slug.safeParse(slug);

  if (!parsedSlug.success) {
    return undefined;
  }

  const products = await collectAllProducts({ fetcher, signal });

  return products.find((product) => product.slug === parsedSlug.data);
}

export async function fetchProductsByCategory(
  category: unknown,
  { limit, fetcher = fetch, signal }: FetchProductsByCategoryOptions = {},
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

function getAllowedProductImageUrl(url: string | null): string | undefined {
  if (url === null) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol === 'https:' &&
      PRODUCT_IMAGE_HOSTS.includes(parsedUrl.hostname)
    ) {
      return parsedUrl.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function toHomeProduct(product: Product, index: number): HomeProduct {
  return {
    id: product.slug,
    title: product.title,
    price: peso(product.priceMinor),
    oldPrice: peso(Math.max(product.oldPriceMinor, product.priceMinor)),
    ratingLine: product.ratingLine,
    shipLine: product.shipLine,
    tone: PRODUCT_TONES[index % PRODUCT_TONES.length]!,
    imageUrl: getAllowedProductImageUrl(product.imageUrl),
    imageAlt: product.imageAlt,
  };
}

export function toHomeCategory(category: ProductCategory): HomeCategory {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
  };
}

export function toProductDetail(product: Product, index = 0): ProductDetail {
  return {
    id: product.slug,
    title: product.title,
    category: product.category,
    price: peso(product.priceMinor),
    oldPrice: peso(Math.max(product.oldPriceMinor, product.priceMinor)),
    ratingLine: product.ratingLine,
    shipLine: product.shipLine,
    imageUrl: getAllowedProductImageUrl(product.imageUrl),
    imageAlt: product.imageAlt,
    tone: PRODUCT_TONES[index % PRODUCT_TONES.length]!,
  };
}
