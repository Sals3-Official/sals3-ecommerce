import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_PRODUCTS_PATH,
  STOREFRONT_REVIEWS_PATH,
} from './client';
import { ProductReviewsResponseSchema, type ProductReview } from './schemas';

/**
 * The storefront's review reads and its one write.
 *
 * Nothing here decides eligibility. The portal owns that rule in a single
 * `WHERE` and answers `404` for every ineligible line; re-implementing it on
 * this side would give it two homes that could disagree, and this one has no
 * access to the parcel state it depends on.
 */

export type { ProductReview };

/**
 * One product's reviews, by public slug.
 *
 * Separate from the product fetch because the list is unbounded and read only
 * when a buyer scrolls to it, while the rating *summary* already rides the
 * product payload for the heading and the cards.
 *
 * Returns `[]` for **every** failure rather than throwing. A product page must
 * still render its price, gallery and buy box when the review section cannot
 * load — the same posture the description blocks take.
 *
 * The `try` is load-bearing and not belt-and-braces: `requestStorefrontJson`
 * throws `ProductsApiError` on a non-2xx it was not told to treat as
 * not-found, and on a payload whose top-level shape fails the schema. Without
 * this, a portal 503 or a malformed envelope would take out the whole product
 * page — which is exactly the trade this function exists to avoid, and which
 * its first version got wrong while claiming otherwise in this very comment.
 *
 * Row-level damage is handled a level down: `salvagedArray` drops one bad
 * review and keeps the rest, so this catch only ever fires for a failure that
 * costs the whole list.
 */
export async function fetchProductReviews(
  slug: string,
  options: { fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<ProductReview[]> {
  try {
    const payload = await requestStorefrontJson(
      {
        url: getStorefrontApiUrl(
          `${STOREFRONT_PRODUCTS_PATH}/${encodeURIComponent(slug)}/reviews`,
        ).toString(),
        schema: ProductReviewsResponseSchema,
        subject: 'product reviews',
        // A slug with no product answers 200 with an empty list on the portal
        // side, so a 404 here means the route itself is missing — still not
        // worth failing a product page over.
        notFoundStatuses: [404],
      },
      options,
    );

    return payload?.reviews ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[storefront] product reviews unavailable', {
      slug,
      error: error instanceof Error ? error.message : 'unknown',
    });

    return [];
  }
}

/**
 * Read at call time rather than at module load, so a missing token is a failed
 * submission and not a crash on import — matching `getAuthorizationHeader`'s
 * own posture in `client.ts`.
 */
function authorizationHeader(): string {
  const token = process.env.SALS3_STOREFRONT_API_TOKEN;

  return token === undefined || token === '' ? 'Bearer' : `Bearer ${token}`;
}

export type SubmitReviewOutcome =
  | { ok: true; reviewId: string }
  | {
      ok: false;
      reason: 'not_eligible' | 'already_reviewed' | 'invalid' | 'failed';
    };

type SubmitReviewInput = {
  /** Session-verified. Never a form field — see the note below. */
  verifiedEmail: string;
  orderLineId: string;
  rating: number;
  body?: string;
  /**
   * A choice, not a name. The portal derives the published string from the
   * order's own checkout ship-to and masks it — this side cannot send a name,
   * because a caller-supplied one would let anybody publish any name against
   * any purchase.
   */
  attribution: 'named' | 'anonymous';
};

/**
 * Posts one review.
 *
 * `verifiedEmail` travels in `X-Buyer-Email`, the same header the order reads
 * use: an address stays out of URLs and access logs, and the portal treats that
 * header as the authorisation itself. The caller must only ever pass a
 * server-verified session address — this function is reachable only from a
 * Server Action for exactly that reason.
 *
 * Returns a typed outcome instead of throwing, because every failure here has a
 * different sentence to show the buyer and a thrown error collapses them into
 * one.
 */
export async function submitProductReview(
  input: SubmitReviewInput,
  options: { fetcher?: typeof fetch } = {},
): Promise<SubmitReviewOutcome> {
  const fetcher = options.fetcher ?? fetch;

  let response: Response;

  try {
    response = await fetcher(
      getStorefrontApiUrl(STOREFRONT_REVIEWS_PATH).toString(),
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authorizationHeader(),
          'X-Buyer-Email': input.verifiedEmail,
        },
        body: JSON.stringify({
          orderLineId: input.orderLineId,
          rating: input.rating,
          ...(input.body === undefined || input.body === ''
            ? {}
            : { body: input.body }),
          attribution: { kind: input.attribution },
        }),
      },
    );
  } catch {
    return { ok: false, reason: 'failed' };
  }

  if (response.status === 201) {
    const payload: unknown = await response.json().catch(() => null);
    const reviewId = (payload as { reviewId?: unknown } | null)?.reviewId;

    return typeof reviewId === 'string'
      ? { ok: true, reviewId }
      : { ok: false, reason: 'failed' };
  }

  // The portal's own vocabulary, mapped one-to-one. `404` is deliberately one
  // answer over unknown, not-yours and undelivered — this side must not try to
  // guess which, because the whole point of that collapse is that it cannot.
  if (response.status === 404) return { ok: false, reason: 'not_eligible' };
  if (response.status === 409) return { ok: false, reason: 'already_reviewed' };
  if (response.status === 400) return { ok: false, reason: 'invalid' };

  return { ok: false, reason: 'failed' };
}
