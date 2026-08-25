/**
 * The review form's shared vocabulary — the constants both surfaces read.
 *
 * ## Why this file exists
 *
 * A review can now be written in two places: the route at
 * `/orders/[orderNumber]/review/[lineId]` and the modal on the order list. The
 * body limit, the five verdict words and the flash key have to be the same
 * string in both, and a second copy of `MAX_BODY` is a limit that drifts on one
 * surface only — the buyer types 1,000 characters into a form that accepts 900.
 *
 * ## Deliberately no Zod here
 *
 * The client imports this file, so nothing in it may pull the validator into the
 * browser bundle. The schemas live beside the server actions in
 * `review-schema.ts`, which no client component imports.
 */

/** Characters of free text a review may carry. The portal holds the same cap. */
export const MAX_BODY = 1000;

/**
 * How many lines one submit may carry.
 *
 * A cap rather than an unbounded loop: the payload is client-supplied, and one
 * request that fans out to an unbounded number of portal writes is a way to
 * spend somebody else's rate limit. Ten is comfortably above the largest real
 * order and small enough that the fan-out is bounded by inspection.
 */
export const MAX_REVIEW_ITEMS = 10;

/**
 * The word beside the stars. `0` is the unrated state and says what to do
 * rather than scoring nothing.
 */
export const VERDICTS: Record<number, string> = {
  0: 'Choose a rating',
  1: 'Not what I expected',
  2: 'Less than I hoped',
  3: 'It is acceptable',
  4: 'Good',
  5: 'Very good',
};

/**
 * Extracted so the branch is not three conditions deep inside a class string.
 * A low rating reads in `red-600` because it is the one answer a buyer might
 * have chosen by mistake.
 */
export function verdictTone(rating: number): string {
  if (rating === 0) return 'text-ink-subtle';

  return rating <= 2 ? 'text-red-600' : 'text-ink';
}

/**
 * How the success toast crosses the redirect: `?posted=2` on the Completed lane.
 *
 * A search parameter rather than `sessionStorage`, for the reason the lanes and
 * the filter chips are links — this list's state is already in its URL, and a
 * message read out of browser storage is a message the server cannot render.
 * The count is an integer the page validates like every other parameter it
 * accepts, and `OrdersFlashToast` strips it from the address bar once shown so a
 * refresh does not re-congratulate the buyer.
 */
export const REVIEW_POSTED_PARAM = 'posted';

/**
 * `?posted=…` as an integer, or `0`.
 *
 * Allow-listed rather than sanitised, the same posture `parseOrdersQuery` takes
 * with every other parameter on this page: a repeated parameter arrives as an
 * array and the first value is read, anything not an integer between 1 and the
 * submit cap becomes `0`, and `0` renders no toast at all. So a hand-typed
 * `?posted=<script>` is a number this function refused, never a string that
 * reaches the DOM.
 */
export function parsePostedCount(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_REVIEW_ITEMS
    ? parsed
    : 0;
}

/** How many reviews the toast will name before it stops counting. */
export function postedReviewsToast(posted: number): string {
  return posted === 1
    ? 'Review posted. Thank you.'
    : `${posted} reviews posted. Thank you.`;
}
