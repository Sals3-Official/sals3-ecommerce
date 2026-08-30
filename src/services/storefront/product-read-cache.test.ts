import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PRODUCT_PAGE_REVALIDATE_SECONDS,
  productCachePolicy,
  productPageCachePolicy,
} from './client';
import { fetchProductBySlug } from './products';

function respond() {
  return new Response(
    JSON.stringify({
      product: {
        id: 'balaclava',
        slug: 'balaclava',
        title: 'Cold-proof face mask',
        currency: 'USD',
        priceMinor: 336,
        imageAlt: 'Cold-proof face mask',
        category: 'apparel-accessories',
        categoryName: 'Apparel and accessories',
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

function initFor(call: unknown): RequestInit & {
  next?: { revalidate?: number };
} {
  return (call ?? {}) as RequestInit & { next?: { revalidate?: number } };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * `fetchProductBySlug` has two callers with opposite needs, and this is the
 * boundary between them. The page renders a figure a buyer reads;
 * `validateCheckoutCart` decides the price the buyer is **charged** and whether
 * the product may be sold at all. Caching by caller rather than by endpoint is
 * the whole point — one flag on the shared function would have cached both.
 */
describe('the product read’s cache policy', () => {
  it('defaults to no-store, so a new caller gets the safe behaviour', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

    const fetcher = vi.fn<typeof fetch>(async () => respond());

    await fetchProductBySlug('balaclava', { fetcher });

    const init = initFor(fetcher.mock.calls[0]?.[1]);

    expect(init.cache).toBe('no-store');
    expect(init.next).toBeUndefined();
  });

  it('caches the page read, and only when it is asked to', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

    const fetcher = vi.fn<typeof fetch>(async () => respond());

    await fetchProductBySlug('balaclava', { fetcher, readFor: 'page' });

    const init = initFor(fetcher.mock.calls[0]?.[1]);

    expect(init.cache).toBeUndefined();
    expect(init.next?.revalidate).toBe(PRODUCT_PAGE_REVALIDATE_SECONDS);
  });

  /** Named explicitly: `'checkout'` is the default because it is the safe one. */
  it('keeps the checkout read live', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

    const fetcher = vi.fn<typeof fetch>(async () => respond());

    await fetchProductBySlug('balaclava', { fetcher, readFor: 'checkout' });

    expect(initFor(fetcher.mock.calls[0]?.[1]).cache).toBe('no-store');
  });

  /**
   * No cache tag. A tag nothing ever invalidates is a promise the code does not
   * keep — pushing a publish through from the Portal is the follow-up, and until
   * it exists the honest statement is the revalidate window alone.
   */
  it('declares a window and no tag it cannot honour', () => {
    expect(productPageCachePolicy()).toEqual({
      next: { revalidate: PRODUCT_PAGE_REVALIDATE_SECONDS },
    });
    expect(productCachePolicy()).toEqual({ cache: 'no-store' });
  });
});
