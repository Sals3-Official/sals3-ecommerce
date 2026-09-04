import type { z } from 'zod';
import { productTags } from '@/lib/storefront/revalidation-tags';

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
export const STOREFRONT_SEARCH_PATH = '/api/storefront/search';
export const STOREFRONT_FREIGHT_QUOTES_PATH =
  '/api/storefront/checkout/freight-quotes';
export const STOREFRONT_CHECKOUT_INTENTS_PATH =
  '/api/storefront/checkout/intents';
export const STOREFRONT_ORDERS_PATH = '/api/storefront/orders';
export const STOREFRONT_REVIEWS_PATH = '/api/storefront/reviews';
export const STOREFRONT_CHECKOUT_ORDERS_ACCEPT_PATH =
  '/api/storefront/checkout/orders/accept';
export const STOREFRONT_FX_BUFFER_PATH = '/api/storefront/fx-buffer';
export const STOREFRONT_FREE_SHIPPING_PATH = '/api/storefront/free-shipping';

export class ProductsApiError extends Error {
  readonly status?: number;

  readonly safeMessage?: string;

  constructor(
    message: string,
    options?: { status?: number; cause?: unknown; safeMessage?: string },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'ProductsApiError';
    this.status = options?.status;
    this.safeMessage = options?.safeMessage;
  }
}

export function getStorefrontApiUrl(path: string): URL {
  return new URL(
    path,
    process.env.SALS3_PORTAL_URL ??
      process.env.SALS3_PORTAL_API_URL ??
      DEFAULT_STOREFRONT_API_URL,
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
 * Product reads are live storefront data, and `no-store` remains the default
 * everywhere a read decides something: a token-less build cannot then bake
 * placeholder fallback data into static output, and no cached answer can price
 * or authorise a sale.
 *
 * The one exception is the product **page** read — see `productPageCachePolicy`
 * for why it is safe there and nowhere else.
 */
export type StorefrontCachePolicy =
  | { cache: 'no-store' }
  /**
   * For reads that are configuration rather than catalogue, and for the product
   * page read. A setting that changes when a human edits one field is a
   * different question from a price a checkout is about to charge, and
   * re-asking it on every render would put a first-party round trip on the
   * render path for a number that moves weekly.
   */
  | { next: { revalidate: number; tags?: string[] } };

export function productCachePolicy(): StorefrontCachePolicy {
  return { cache: 'no-store' };
}

/**
 * How long a product page may serve an answer it already has, in seconds.
 *
 * Sized against the neighbours rather than picked: the PDP's related-products
 * read is already `unstable_cache`d for 30s, and this is the same class of
 * staleness on the same page. It is the shortest window that still collapses a
 * burst of readers on one product into one round trip.
 */
export const PRODUCT_PAGE_REVALIDATE_SECONDS = 60;

/**
 * The **page** read of one product — and only that.
 *
 * Every render of `/p/[id]` was a live round trip to the Portal, which is the
 * dominant cost of the route: nothing else on that page waits on a first-party
 * network call it cannot share with the next reader.
 *
 * ## Why this is not `productCachePolicy`
 *
 * `fetchProductBySlug` has a second caller — `validateCheckoutCart` — and it
 * decides **the price the buyer is charged** and whether the product may be
 * sold. A minute of staleness there can charge a price that has moved or sell
 * something withdrawn since, so that read stays `no-store` and this policy is
 * reached only by passing `readFor: 'page'`. Caching by caller rather than by
 * endpoint is the whole point; one flag on the shared function would have
 * cached both.
 *
 * ## What a publish costs
 *
 * Nothing, now. The follow-up this comment used to leave open — "the Portal
 * calling a revalidation route here on publish" — is built: the reads are
 * tagged (`lib/storefront/revalidation-tags.ts`), `POST /api/internal/revalidate`
 * expires those tags, and the Portal calls it on every publication change. The
 * 60s window below is the fallback for when that call does not arrive (secret
 * unset, storefront down, network), not the normal path.
 *
 * The tags are declared here and nowhere else, so the promise the old comment
 * refused to make — a tag something actually invalidates — is kept by
 * construction.
 *
 * ## What this does not fix
 *
 * `next: { revalidate }` writes the Data Cache **only for a 200**. During a
 * Portal outage every render still issues a live request, exactly as today —
 * this makes good days cheap and changes nothing about bad ones.
 */
export function productPageCachePolicy(slug: string): StorefrontCachePolicy {
  return {
    next: {
      revalidate: PRODUCT_PAGE_REVALIDATE_SECONDS,
      tags: productTags(slug),
    },
  };
}

type RequestOptions = {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  cachePolicy?: StorefrontCachePolicy;
  method?: 'GET' | 'POST';
  body?: unknown;
  /**
   * Extra request headers. Exists for the buyer-identity header the orders
   * endpoints require (`X-Buyer-Email`, always the session-verified email,
   * never anything a request supplied) — a header rather than a query
   * parameter so the address stays out of URLs and access logs.
   */
  headers?: Record<string, string>;
};

async function safeErrorMessageFrom(
  response: Response,
): Promise<string | undefined> {
  try {
    const payload: unknown = await response.json();

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string' &&
      payload.error.length > 0 &&
      payload.error.length <= 240
    ) {
      return payload.error;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

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
    method = 'GET',
    body,
    headers,
  }: RequestOptions = {},
): Promise<z.output<Schema> | undefined> {
  const response = await fetcher(input.url, {
    method,
    ...cachePolicy,
    headers: {
      Accept: 'application/json',
      Authorization: getAuthorizationHeader(),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(headers ?? {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });

  if ((input.notFoundStatuses ?? []).includes(response.status)) {
    return undefined;
  }

  if (!response.ok) {
    const safeMessage = await safeErrorMessageFrom(response);

    throw new ProductsApiError(`Storefront ${input.subject} request failed.`, {
      status: response.status,
      safeMessage,
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
