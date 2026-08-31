import type { ReviewFlagReason } from '@/lib/reviews/flag-reasons';
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
  /**
   * How the parcel arrived, 1-5, or absent because the buyer skipped it.
   *
   * Omitted from the body rather than sent as `0`. The portal's column refuses
   * anything outside 1-5 and every read excludes NULL from the average, so an
   * unanswered delivery must arrive as an absent key — a zero would fail the
   * write, and if it did not it would be a courier's verdict nobody gave.
   */
  deliveryRating?: number;
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
          ...(input.deliveryRating === undefined
            ? {}
            : { deliveryRating: input.deliveryRating }),
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

export type FlagReviewOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: 'not_found' | 'already_reported' | 'rate_limited' | 'failed';
    };

/**
 * Reports one review.
 *
 * Reaches the portal exactly the way a submission does: the session-verified
 * address in `X-Buyer-Email`, never a body field. That address is what the
 * portal's one-report-per-person index counts, which is the only reason a
 * report costs anything at all.
 *
 * Nothing this returns is a claim that the review was hidden. The portal
 * answers `202` deliberately — the buyer asked for a look, and the honest
 * answer is that it was recorded rather than acted on.
 */
export async function flagProductReview(
  input: {
    /** Session-verified. Never a form field. */
    verifiedEmail: string;
    reviewId: string;
    reason: ReviewFlagReason;
  },
  options: { fetcher?: typeof fetch } = {},
): Promise<FlagReviewOutcome> {
  const fetcher = options.fetcher ?? fetch;

  let response: Response;

  try {
    response = await fetcher(
      getStorefrontApiUrl(
        `${STOREFRONT_REVIEWS_PATH}/${encodeURIComponent(input.reviewId)}/flag`,
      ).toString(),
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authorizationHeader(),
          'X-Buyer-Email': input.verifiedEmail,
        },
        body: JSON.stringify({ reason: input.reason }),
      },
    );
  } catch {
    return { ok: false, reason: 'failed' };
  }

  // 202, not 201 — see the portal route. Accepted as a request to look.
  if (response.status === 202) return { ok: true };

  if (response.status === 404) return { ok: false, reason: 'not_found' };
  if (response.status === 409) return { ok: false, reason: 'already_reported' };
  if (response.status === 429) return { ok: false, reason: 'rate_limited' };

  return { ok: false, reason: 'failed' };
}

export type AttachReviewPhotoOutcome =
  { ok: true } | { ok: false; message: string };

/**
 * Attaches one photo to a review that already exists.
 *
 * One request per photo, because that is what the portal accepts, and its own
 * route explains why: the deployed platform caps a serverless request body at
 * 4.5 MB, and four photos at the 5 MB per-file ceiling is several times that.
 *
 * The refusal message comes from the portal rather than being re-derived here.
 * It is the side that knows which limit was hit, and deciding "too wide" versus
 * "too large" again on this side would be a second copy able to disagree with
 * the one actually doing the checking.
 */
export async function attachProductReviewPhoto(
  input: { verifiedEmail: string; reviewId: string; photo: File },
  options: { fetcher?: typeof fetch } = {},
): Promise<AttachReviewPhotoOutcome> {
  const fetcher = options.fetcher ?? fetch;
  const form = new FormData();

  form.set('photo', input.photo);

  let response: Response;

  try {
    response = await fetcher(
      getStorefrontApiUrl(
        `${STOREFRONT_REVIEWS_PATH}/${encodeURIComponent(input.reviewId)}/photos`,
      ).toString(),
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          // Deliberately no Content-Type: `fetch` sets `multipart/form-data`
          // with the boundary it generated, and naming it here without one
          // produces a body the portal cannot parse.
          Accept: 'application/json',
          Authorization: authorizationHeader(),
          'X-Buyer-Email': input.verifiedEmail,
        },
        body: form,
      },
    );
  } catch {
    return { ok: false, message: 'That photo could not be uploaded.' };
  }

  if (response.status === 201) return { ok: true };

  const payload: unknown = await response.json().catch(() => null);
  const message = (payload as { error?: unknown } | null)?.error;

  return {
    ok: false,
    message:
      typeof message === 'string' && message !== ''
        ? message
        : 'That photo could not be uploaded.',
  };
}
