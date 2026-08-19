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
export const STOREFRONT_FREIGHT_QUOTES_PATH =
  '/api/storefront/checkout/freight-quotes';
export const STOREFRONT_CHECKOUT_INTENTS_PATH =
  '/api/storefront/checkout/intents';
export const STOREFRONT_ORDERS_PATH = '/api/storefront/orders';
export const STOREFRONT_CHECKOUT_ORDERS_ACCEPT_PATH =
  '/api/storefront/checkout/orders/accept';

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
 * Product reads are live storefront data. Keep them `no-store` so a portal
 * publish is visible immediately and a token-less build cannot bake placeholder
 * fallback data into static output.
 */
export type StorefrontCachePolicy = { cache: 'no-store' };

export function productCachePolicy(): StorefrontCachePolicy {
  return { cache: 'no-store' };
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
