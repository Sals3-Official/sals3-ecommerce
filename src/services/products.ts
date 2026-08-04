import { z } from 'zod';
import { peso } from '@/lib/money';
import type {
  Category as HomeCategory,
  PlaceholderTone,
  Product as HomeProduct,
} from '@/lib/home-placeholder-data';

export const PRODUCTS_API_URL = 'https://dummyjson.com/products';
export const PRODUCT_CATEGORIES_API_URL = `${PRODUCTS_API_URL}/categories`;
export const DEFAULT_PRODUCTS_PAGE_SIZE = 10;
export const MAX_PRODUCTS_PAGE_SIZE = 30;
export const MAX_PRODUCTS_PAGE = 1000;
export const MAX_PRODUCTS_SKIP = MAX_PRODUCTS_PAGE * MAX_PRODUCTS_PAGE_SIZE;

const PRODUCT_IMAGE_HOSTNAME = 'cdn.dummyjson.com';
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

const ProductsOffsetSchema = z.object({
  skip: z
    .preprocess(
      (value) => (Array.isArray(value) ? value[0] : value),
      z.coerce.number().int().min(0).max(MAX_PRODUCTS_SKIP),
    )
    .catch(0),
  limit: queryIntegerSchema(MAX_PRODUCTS_PAGE_SIZE, DEFAULT_PRODUCTS_PAGE_SIZE),
});

const ProductReviewSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string(),
  date: z.string(),
  reviewerName: z.string(),
  reviewerEmail: z.string().email(),
});

const ProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  discountPercentage: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  stock: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  brand: z.string().optional(),
  sku: z.string(),
  weight: z.number().nonnegative(),
  dimensions: z.object({
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
    depth: z.number().nonnegative(),
  }),
  warrantyInformation: z.string(),
  shippingInformation: z.string(),
  availabilityStatus: z.string(),
  reviews: z.array(ProductReviewSchema),
  returnPolicy: z.string(),
  minimumOrderQuantity: z.number().int().positive(),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    barcode: z.string(),
    qrCode: z.string().url(),
  }),
  images: z.array(z.string().url()),
  thumbnail: z.string().url(),
});

export const ProductsResponseSchema = z.object({
  products: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

const ProductCategorySchema = z.object({
  slug: z.string().regex(CATEGORY_SLUG_PATTERN),
  name: z.string().min(1).max(80),
  url: z.string().url(),
});

export const ProductCategoriesResponseSchema = z.array(ProductCategorySchema);

export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
export type ProductsPagination = z.infer<typeof ProductsPaginationSchema>;
export type ProductsOffset = z.infer<typeof ProductsOffsetSchema>;
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
  page?: unknown;
  limit?: unknown;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

type FetchProductsByOffsetOptions = {
  skip?: unknown;
  limit?: unknown;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

type FetchProductCategoriesOptions = {
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

export function getRandomProductsSkip(
  total: number,
  limit: number,
  random = Math.random,
): number {
  const maximumSkip = Math.max(0, total - limit);
  const randomValue = Math.min(Math.max(random(), 0), 0.999999);

  return Math.floor(randomValue * (maximumSkip + 1));
}

function getProductsApiUrl({ skip, limit }: ProductsOffset): string {
  const url = new URL(PRODUCTS_API_URL);

  url.searchParams.set('limit', String(limit));
  url.searchParams.set('skip', String(skip));

  return url.toString();
}

export async function fetchProductsByOffset({
  skip,
  limit,
  fetcher = fetch,
  signal,
}: FetchProductsByOffsetOptions = {}): Promise<ProductsResponse> {
  const offset = ProductsOffsetSchema.parse({ skip, limit });
  const response = await fetcher(getProductsApiUrl(offset), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new ProductsApiError('Products API request failed.', {
      status: response.status,
    });
  }

  const payload: unknown = await response.json();
  const parsedPayload = ProductsResponseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new ProductsApiError('Products API returned invalid data.', {
      cause: parsedPayload.error,
    });
  }

  return parsedPayload.data;
}

export async function fetchProducts({
  page,
  limit,
  fetcher = fetch,
  signal,
}: FetchProductsOptions = {}): Promise<ProductsResponse> {
  const pagination = parseProductsPagination({ page, limit });

  return fetchProductsByOffset({
    skip: (pagination.page - 1) * pagination.limit,
    limit: pagination.limit,
    fetcher,
    signal,
  });
}

export async function fetchProductCategories({
  fetcher = fetch,
  signal,
}: FetchProductCategoriesOptions = {}): Promise<ProductCategory[]> {
  const response = await fetcher(PRODUCT_CATEGORIES_API_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new ProductsApiError('Product categories API request failed.', {
      status: response.status,
    });
  }

  const payload: unknown = await response.json();
  const parsedPayload = ProductCategoriesResponseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new ProductsApiError(
      'Product categories API returned invalid data.',
      {
        cause: parsedPayload.error,
      },
    );
  }

  return parsedPayload.data;
}

function getAllowedProductImageUrl(url: string): string | undefined {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === PRODUCT_IMAGE_HOSTNAME
    ) {
      return parsedUrl.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function toMinorUnits(price: number): number {
  return Math.round(price * 10000);
}

function getOldPriceAmount(price: number, discountPercentage: number): number {
  const currentAmount = toMinorUnits(price);

  if (discountPercentage <= 0 || discountPercentage >= 95) {
    return currentAmount;
  }

  return Math.max(
    currentAmount,
    Math.round(currentAmount / (1 - discountPercentage / 100)),
  );
}

export function toHomeProduct(product: Product, index: number): HomeProduct {
  return {
    id: String(product.id),
    title: product.title,
    price: peso(toMinorUnits(product.price)),
    oldPrice: peso(
      getOldPriceAmount(product.price, product.discountPercentage),
    ),
    ratingLine: `Rating ${product.rating.toFixed(1)}, ${product.reviews.length} reviews`,
    shipLine: product.shippingInformation,
    tone: PRODUCT_TONES[index % PRODUCT_TONES.length]!,
    imageUrl: getAllowedProductImageUrl(product.thumbnail),
    imageAlt: `${product.title} product image`,
  };
}

function getCategoryCode(name: string): string {
  const words = name.match(/[A-Za-z0-9]+/g) ?? [];
  const rawCode =
    words.length > 1
      ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`
      : (words[0] ?? name).slice(0, 2);

  return rawCode.toUpperCase();
}

export function toHomeCategory(category: ProductCategory): HomeCategory {
  return {
    id: category.slug,
    code: getCategoryCode(category.name),
    name: category.name,
  };
}
