import { z } from 'zod';

export const PRODUCTS_API_URL = 'https://dummyjson.com/products';

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

export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;

export class ProductsApiError extends Error {
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'ProductsApiError';
    this.status = options?.status;
  }
}

type FetchProductsOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

export async function fetchProducts({
  fetcher = fetch,
  signal,
}: FetchProductsOptions = {}): Promise<ProductsResponse> {
  const response = await fetcher(PRODUCTS_API_URL, {
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
