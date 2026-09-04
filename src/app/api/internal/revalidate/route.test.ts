import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  checkRateLimit: vi.fn(() => true),
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/lib/rate-limit', () => ({ default: mocks.checkRateLimit }));

const { POST } = await import('./route');

const SECRET = 'a-shared-secret-value';

function post(
  body: unknown,
  { auth = `Bearer ${SECRET}` }: { auth?: string | null } = {},
): Request {
  return new Request('https://sit.sals3.com/api/internal/revalidate', {
    method: 'POST',
    headers: auth === null ? {} : { authorization: auth },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/internal/revalidate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockReturnValue(true);
    process.env.STOREFRONT_REVALIDATE_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.STOREFRONT_REVALIDATE_SECRET;
  });

  it('expires the tags it was given, immediately rather than stale-while-revalidate', async () => {
    const response = await POST(
      post({ tags: ['storefront-product:ice-silk-trousers'] }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      revalidated: ['storefront-product:ice-silk-trousers'],
    });

    /*
      `{ expire: 0 }` is the whole point. `'max'` would serve the next buyer
      the stale page once — which, for a listing that was just paused, is the
      one outcome this endpoint exists to prevent.
    */
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      'storefront-product:ice-silk-trousers',
      { expire: 0 },
    );
  });

  /** An unset secret closes the endpoint. It must never mean "no auth required". */
  it('refuses everything when no secret is configured', async () => {
    delete process.env.STOREFRONT_REVALIDATE_SECRET;

    const response = await POST(post({ tags: ['storefront-product'] }));

    expect(response.status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ['no header at all', null],
    ['an empty bearer', 'Bearer '],
    ['the wrong secret', 'Bearer not-the-secret'],
    ['a right-length wrong secret', `Bearer ${'x'.repeat(SECRET.length)}`],
    ['the secret without the scheme', SECRET],
  ])('refuses %s', async (_case, auth) => {
    const response = await POST(
      post({ tags: ['storefront-product'] }, { auth }),
    );

    expect(response.status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  /**
   * The tag allow-list. Tag names arrive over the network, so a leaked secret
   * must not become the ability to expire anything the application caches.
   */
  it('ignores tags outside the catalogue, while honouring the ones inside it', async () => {
    const response = await POST(
      post({
        tags: [
          'storefront-product',
          'storefront-product:a-real-slug',
          'fx-rates',
          'free-shipping',
          'storefront-productXnot-a-namespace',
        ],
      }),
    );

    await expect(response.json()).resolves.toEqual({
      revalidated: ['storefront-product', 'storefront-product:a-real-slug'],
    });
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(2);
    expect(mocks.revalidateTag).not.toHaveBeenCalledWith(
      'fx-rates',
      expect.anything(),
    );
  });

  it('rejects a body that is not the shape it expects', async () => {
    await expect(POST(post({ tags: [] })).then((r) => r.status)).resolves.toBe(
      400,
    );
    await expect(
      POST(post({ tags: 'storefront-product' })).then((r) => r.status),
    ).resolves.toBe(400);
    await expect(
      POST(post('not json at all')).then((r) => r.status),
    ).resolves.toBe(400);
    // Bounded: one call cannot be used to sweep the cache.
    await expect(
      POST(
        post({
          tags: Array.from({ length: 21 }, (_, i) => `storefront-product:${i}`),
        }),
      ).then((r) => r.status),
    ).resolves.toBe(400);
  });

  it('rate limits', async () => {
    mocks.checkRateLimit.mockReturnValue(false);

    const response = await POST(post({ tags: ['storefront-product'] }));

    expect(response.status).toBe(429);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  /** Authorisation is checked before anything else reads the body. */
  it('checks the secret before parsing the body', async () => {
    const response = await POST(
      post('not json at all', { auth: 'Bearer nope' }),
    );

    expect(response.status).toBe(401);
  });
});
