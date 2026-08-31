import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachProductReviewPhoto,
  fetchProductReviews,
  flagProductReview,
  submitProductReview,
} from './reviews';

const TOKEN = 'storefront-token-1';

/** What the portal sends for a review nobody photographed. */
const REVIEW = {
  id: 'review-1',
  rating: 5,
  body: 'Fits exactly like the size chart said.',
  displayName: 'Hezekiah A.',
  variantLabel: 'Digital Black / 31"-35"',
  createdAt: '2026-08-19T10:00:00.000Z',
  reply: null,
};

/**
 * The same review after parsing.
 *
 * Two keys the wire did not carry. `photos` defaults to `[]` so every consumer
 * can map over it without a null check, and `deliveryRating` stays `undefined`
 * — an unanswered question, which is not a zero and must never render as one.
 */
const PARSED_REVIEW = { ...REVIEW, deliveryRating: undefined, photos: [] };

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
    ).resolves.toEqual([PARSED_REVIEW]);

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
    ).resolves.toEqual([PARSED_REVIEW]);
  });

  /**
   * A delivery score the buyer never gave must not arrive as a number. Every
   * reader treats `undefined` as "not answered" and a `0` as a verdict, and the
   * portal's own column is nullable for the same reason.
   */
  it('leaves an unanswered delivery score undefined rather than zero', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { reviews: [REVIEW] }));

    const [review] = await fetchProductReviews('cargo-shorts', { fetcher });

    expect(review?.deliveryRating).toBeUndefined();
  });

  it('carries a delivery score and photos when the review has them', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        reviews: [
          {
            ...REVIEW,
            deliveryRating: 4,
            photos: [
              { url: 'https://media.example/a.webp', width: 800, height: 600 },
            ],
          },
        ],
      }),
    );

    const [review] = await fetchProductReviews('cargo-shorts', { fetcher });

    expect(review?.deliveryRating).toBe(4);
    expect(review?.photos).toHaveLength(1);
  });

  /**
   * A malformed photo array costs the pictures, never the review. The words and
   * the rating are the part a shopper came for.
   */
  it('keeps a review whose photos are unreadable', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        reviews: [{ ...REVIEW, photos: 'not an array' }],
      }),
    );

    const [review] = await fetchProductReviews('cargo-shorts', { fetcher });

    expect(review?.id).toBe('review-1');
    expect(review?.photos).toEqual([]);
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

describe('flagProductReview', () => {
  const INPUT = {
    verifiedEmail: 'buyer@example.com',
    reviewId: 'review-1',
    reason: 'OFF_TOPIC' as const,
  };

  it('sends the verified address as a header, never in the body', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(202, {}));

    await flagProductReview(INPUT, { fetcher });

    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(headers['X-Buyer-Email']).toBe('buyer@example.com');
    expect(body).toEqual({ reason: 'OFF_TOPIC' });
    expect(body).not.toHaveProperty('reporterEmail');
  });

  it('posts to the review’s own flag route with the id encoded', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(202, {}));

    await flagProductReview({ ...INPUT, reviewId: 'a b/../c' }, { fetcher });

    const url = String(fetcher.mock.calls[0]?.[0]);

    expect(url).toContain('/api/storefront/reviews/');
    expect(url.endsWith('/flag')).toBe(true);
    expect(url).not.toContain('../');
  });

  /** 202, not 201 — the portal accepted a request to look, not a removal. */
  it('treats 202 as success', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(202, {}));

    await expect(flagProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: true,
    });
  });

  it.each([
    [404, 'not_found'],
    [409, 'already_reported'],
    [429, 'rate_limited'],
    [503, 'failed'],
  ])('maps %i to %s', async (status, reason) => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(status, {}));

    await expect(flagProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it('answers a failure rather than throwing when the request cannot be made', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(flagProductReview(INPUT, { fetcher })).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});

describe('attachProductReviewPhoto', () => {
  const PHOTO = new File([new Uint8Array([1, 2, 3])], 'a.jpg', {
    type: 'image/jpeg',
  });

  const INPUT = {
    verifiedEmail: 'buyer@example.com',
    reviewId: 'review-1',
    photo: PHOTO,
  };

  it('posts the file as multipart to the review’s photos route', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { photoId: 'p1', position: 0 }));

    await attachProductReviewPhoto(INPUT, { fetcher });

    const init = fetcher.mock.calls[0]?.[1] as RequestInit;

    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      '/api/storefront/reviews/review-1/photos',
    );
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('photo')).toBe(PHOTO);
  });

  /**
   * Naming `multipart/form-data` without the boundary `fetch` generated
   * produces a body the portal cannot parse — so this header must be absent.
   */
  it('lets fetch set the content type so the boundary is right', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { photoId: 'p1', position: 0 }));

    await attachProductReviewPhoto(INPUT, { fetcher });

    const headers = ((fetcher.mock.calls[0]?.[1] as RequestInit).headers ??
      {}) as Record<string, string>;

    expect(headers).not.toHaveProperty('Content-Type');
    expect(headers['X-Buyer-Email']).toBe('buyer@example.com');
  });

  /**
   * The portal knows which limit was hit. Re-deciding "too wide" from "too
   * large" on this side would be a second copy able to disagree with the one
   * doing the checking.
   */
  it('passes the portal’s own refusal through to the buyer', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(413, { error: 'Photos must be under 2000 × 2000 px.' }),
      );

    await expect(attachProductReviewPhoto(INPUT, { fetcher })).resolves.toEqual(
      {
        ok: false,
        message: 'Photos must be under 2000 × 2000 px.',
      },
    );
  });

  it('falls back to its own sentence when the portal sends none', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(502, {}));

    const result = await attachProductReviewPhoto(INPUT, { fetcher });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/could not be/i);
  });
});
