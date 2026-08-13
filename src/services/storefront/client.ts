import type { z } from 'zod';

/**
 * The HTTP boundary to `sals3-portal`'s storefront API: URL building, the
 * shared bearer token, and one place where a non-OK response or an unparseable
 * body becomes a `ProductsApiError`.
 *
 * Server-side only. The token has no `NEXT_PUBLIC_` prefix, so a client import
 * would silently read `undefined` and throw the "not configured" error on every
 * call; `test/client-bundle-boundary.test.ts` is what keeps that from
 * happening.
 */

export const DEFAULT_STOREFRONT_API_URL = 'http://localhost:3001';
export const STOREFRONT_PRODUCTS_PATH = '/api/storefront/products';
export const STOREFRONT_CATEGORIES_PATH = '/api/storefront/categories';

export class ProductsApiError extends Error {
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'ProductsApiError';
    this.status = options?.status;
  }
}

export function getStorefrontApiUrl(path: string): URL {
  return new URL(
    path,
    process.env.SALS3_PORTAL_API_URL ?? DEFAULT_STOREFRONT_API_URL,
  );
}

export function getAuthorizationHeader(): string {
  const token = process.env.SALS3_STOREFRONT_API_TOKEN;

  if (token === undefined || token === '') {
    throw new ProductsApiError('Storefront API token is not configured.');
  }

  return `Bearer ${token}`;
}

/**
 * Cache policy per call site, because the two upstream reads are not alike.
 *
 * The single-product read is a database read behind a slug and is cached; the
 * list feed is not. That asymmetry is deliberate: `src/app/page.tsx` falls back
 * to placeholder products when the feed throws, so making the home feed
 * cacheable would let `next build` — which runs with no portal token — bake
 * placeholders into a static home page and serve them to every visitor.
 */
export type StorefrontCachePolicy =
  { cache: 'no-store' } | { next: { revalidate: number; tags: string[] } };

export const STOREFRONT_PRODUCT_REVALIDATE_SECONDS = 300;

export function productCachePolicy(slug: string): StorefrontCachePolicy {
  return {
    next: {
      revalidate: STOREFRONT_PRODUCT_REVALIDATE_SECONDS,
      // Shipped now so an invalidation webhook is a one-line follow-up. Nothing
      // in this app calls `revalidateTag` yet, and adding a public endpoint that
      // does needs a shared secret, rate limiting, and owner approval.
      tags: ['storefront-product', `storefront-product:${slug}`],
    },
  };
}

type RequestOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  cachePolicy?: StorefrontCachePolicy;
};

/**
 * Fetches, checks the status, and parses — returning `undefined` only for the
 * statuses the caller declares meaningful (a 404 on a single product).
 *
 * A 404 and an upstream failure must stay distinguishable all the way up: the
 * PDP turns the first into a real not-found page and the second into an error
 * page, and the old code collapsed both into `notFound()`.
 */
export async function requestStorefrontJson<Schema extends z.ZodTypeAny>(
  input: {
    url: string;
    schema: Schema;
    subject: string;
    notFoundStatuses?: number[];
  },
  {
    fetcher = fetch,
    signal,
    cachePolicy = { cache: 'no-store' },
  }: RequestOptions = {},
): Promise<z.output<Schema> | undefined> {
  const response = await fetcher(input.url, {
    ...cachePolicy,
    headers: {
      Accept: 'application/json',
      Authorization: getAuthorizationHeader(),
    },
    signal,
  });

  if ((input.notFoundStatuses ?? []).includes(response.status)) {
    return undefined;
  }

  if (!response.ok) {
    throw new ProductsApiError(`Storefront ${input.subject} request failed.`, {
      status: response.status,
    });
  }

  const payload: unknown = await response.json();
  const parsed = input.schema.safeParse(payload);

  if (!parsed.success) {
    throw new ProductsApiError(
      `Storefront ${input.subject} returned invalid data.`,
      { cause: parsed.error },
    );
  }

  return parsed.data;
}
