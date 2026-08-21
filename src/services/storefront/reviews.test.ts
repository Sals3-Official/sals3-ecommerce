import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProductReviews, submitProductReview } from './reviews';

const TOKEN = 'storefront-token-1';

const REVIEW = {
  id: 'review-1',
  rating: 5,
  body: 'Fits exactly like the size chart said.',
  displayName: 'Hezekiah A.',
  variantLabel: 'Digital Black / 31"-35"',
  createdAt: '2026-08-19T10:00:00.000Z',
  reply: null,
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  process.env.SALS3_STOREFRONT_API_TOKEN = TOKEN;
  process.env.SALS3_PORTAL_URL = 'https://portal.example.com';
});

afterEach(() => {
  delete process.env.SALS3_STOREFRONT_API_TOKEN;
  delete process.env.SALS3_PORTAL_URL;
  vi.restoreAllMocks();
});

describe('fetchProductReviews', () => {
  it('reads the list for a slug', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { reviews: [REVIEW] }));

    await expect(
      fetchProductReviews('cargo-shorts', { fetcher }),
    ).resolves.toEqual([REVIEW]);

    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      '/api/storefront/products/cargo-shorts/reviews',
    );
  });

  it('encodes the slug rather than pasting it into the path', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { reviews: [] }));

    await fetchProductReviews('a b/../c', { fetcher });

    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain('../');
  });

  /**
   * A product page must still render its price, gallery and buy box when the
   * review section cannot load — the same posture the description blocks take.
   */
  it.each([
    ['a 404', jsonResponse(404, { error: 'Not found' })],
    ['a 503', jsonResponse(503, { error: 'unavailable' })],
    ['a malformed payload', jsonResponse(200, { reviews: 'not an array' })],
  ])(
    'answers an empty list for %s rather than throwing',
    async (_l, response) => {
      const fetcher = vi.fn().mockResolvedValue(response);

      await expect(
        fetchProductReviews('cargo-shorts', { fetcher }),
      ).resolves.toEqual([]);
    },
  );

  /** One bad row must not empty the section — `salvagedArray`, as elsewhere. */
  it('drops a malformed review and keeps the rest', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        reviews: [REVIEW, { id: 'review-2', rating: 99 }],
      }),
    );

    await expect(
      fetchProductReviews('cargo-shorts', { fetcher }),
    ).resolves.toEqual([REVIEW]);
  });
});

describe('submitProductReview', () => {
  const INPUT = {
    verifiedEmail: 'buyer@example.com',
    orderLineId: 'line-1',
    rating: 5,
    attribution: 'named' as const,
  };

  function requestOf(fetcher: ReturnType<typeof vi.fn>) {
    const init = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;

    return {
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    };
  }

  it('sends the verified address as a header, never in the body', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { reviewId: 'review-1' }));

    await submitProductReview(INPUT, { fetcher });

    const { headers, body } = requestOf(fetcher);

    expect(headers['X-Buyer-Email']).toBe('buyer@example.com');
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(body).not.toHaveProperty('buyerEmail');
    expect(body).not.toHaveProperty('verifiedEmail');
  });

  /**
   * A caller-supplied name would let anybody publish any name against any
   * purchase, so the wire carries a choice and the portal derives the string.
   */
  it('sends attribution as a choice with no name in it', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { reviewId: 'review-1' }));

    await submitProductReview(INPUT, { fetcher });

    expect(requestOf(fetcher).body.attribution).toEqual({ kind: 'named' });
  });

  it('omits an empty body rather than sending an empty string', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { reviewId: 'review-1' }));

    await submitProductReview({ ...INPUT, body: '' }, { fetcher });

    expect(requestOf(fetcher).body).not.toHaveProperty('body');
  });

  it('returns the new id on 201', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { reviewId: 'review-1' }));

    await expect(submitProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: true,
      reviewId: 'review-1',
    });
  });

  it.each([
    [404, 'not_eligible'],
    [409, 'already_reviewed'],
    [400, 'invalid'],
    [401, 'failed'],
    [503, 'failed'],
  ])('maps %i to %s', async (status, reason) => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(status, {}));

    await expect(submitProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it('treats a 201 with no id as a failure rather than a silent success', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(201, {}));

    await expect(submitProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  it('does not throw when the portal is unreachable', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(submitProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});
