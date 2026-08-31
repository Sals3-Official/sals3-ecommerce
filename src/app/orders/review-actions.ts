'use server';

import { revalidatePath } from 'next/cache';
import { getBuyerSession } from '@/lib/auth/dal';
import {
  REVIEW_MESSAGES,
  submitOrderReviewsSchema,
  type ReviewFailureReason,
} from '@/lib/orders/review-schema';
import { submitProductReview } from '@/services/storefront/reviews';

/**
 * The order list modal's submit — one order, one to many lines, one request.
 *
 * ## Why a second action instead of calling the single-line one N times
 *
 * The modal's Submit is one button over every item the buyer just rated, and N
 * round trips from the browser would give it N partial outcomes to reconcile
 * client-side, each with its own pending state. One action means the fan-out is
 * bounded and validated server-side, and the buyer gets one answer.
 *
 * `Promise.all` rather than a loop: these are independent writes on separate
 * rows, and awaiting them in sequence would multiply the modal's spinner by the
 * number of items for no gain. The array is capped by
 * `submitOrderReviewsSchema` before any of them starts.
 *
 * ## The address never comes from the client
 *
 * `getBuyerSession()` is read here and the verified address goes to the portal
 * in `X-Buyer-Email`, where it **is** the authorisation. There is no email field
 * on this action, and Next.js verifies the request origin for Server Actions,
 * which is the CSRF control for it (rule 27).
 *
 * ## Eligibility is still not decided here
 *
 * The portal owns it in a single `WHERE` — the line's own parcel `DELIVERED`,
 * inside the window, not already reviewed — and answers `404` for anything it
 * refuses. The modal only draws buttons for lines the payload marked
 * `reviewable`, which is usability, not the gate (rule 19): a hand-made payload
 * naming somebody else's line reaches this action and is refused there.
 *
 * ## Partial success is reported, not smoothed over
 *
 * Two of three posting is a real outcome — a window can close between the page
 * render and the press. Saying "posted" would be a lie and saying "failed"
 * would invite a duplicate attempt on the ones that landed, so it has its own
 * status and the modal stays open on it.
 */

export type OrderReviewsState =
  | { status: 'success'; posted: number }
  | { status: 'partial'; posted: number; message: string }
  | { status: 'error'; message: string };

export type OrderReviewsPayload = {
  orderNumber: string;
  items: {
    orderLineId: string;
    rating: number;
    /**
     * Absent when the buyer skipped the question. Never `0` — the portal's
     * column refuses anything outside 1-5, and an unanswered delivery has to
     * land there as NULL rather than as a verdict nobody gave.
     */
    deliveryRating?: number;
    body?: string;
    attribution: 'named' | 'anonymous';
  }[];
};

/** The first refusal in submit order, so the sentence matches what the buyer did. */
function firstFailure(
  reasons: readonly ReviewFailureReason[],
): ReviewFailureReason {
  return reasons[0] ?? 'failed';
}

/**
 * One payload in, one outcome out — not a `useActionState` reducer.
 *
 * The caller awaits this inside `startTransition` and acts on the answer in the
 * same event handler: a success has to write the flash message *and* navigate,
 * and threading that through a state value means doing it in an effect, one
 * render after the buyer pressed the button.
 */
export default async function submitOrderReviewsAction(
  payload: OrderReviewsPayload,
): Promise<OrderReviewsState> {
  const parsed = submitOrderReviewsSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 'error', message: REVIEW_MESSAGES.invalid };
  }

  const session = await getBuyerSession();
  const verifiedEmail = session?.email ?? '';

  if (verifiedEmail === '') {
    return { status: 'error', message: REVIEW_MESSAGES.signed_out };
  }

  const outcomes = await Promise.all(
    parsed.data.items.map((item) =>
      submitProductReview({
        verifiedEmail,
        orderLineId: item.orderLineId,
        rating: item.rating,
        ...(item.deliveryRating === undefined
          ? {}
          : { deliveryRating: item.deliveryRating }),
        ...(item.body === undefined || item.body === ''
          ? {}
          : { body: item.body }),
        // The choice, never a name. The portal derives the published string
        // from the order's own checkout ship-to.
        attribution: item.attribution,
      }),
    ),
  );

  const posted = outcomes.filter((outcome) => outcome.ok).length;
  const refusals = outcomes.flatMap((outcome) =>
    outcome.ok ? [] : [outcome.reason],
  );

  // Anything that landed changes the order's review controls and the list's.
  // Done before returning so a partial outcome still drops the posted lines out
  // of the modal's own trigger on refresh. The product page is not revalidated
  // here: it reads the portal's cached payload, which the portal expires itself
  // on write.
  if (posted > 0) {
    revalidatePath(`/orders/${parsed.data.orderNumber}`);
    revalidatePath('/orders');
  }

  if (refusals.length === 0) return { status: 'success', posted };

  const message = REVIEW_MESSAGES[firstFailure(refusals)];

  return posted === 0
    ? { status: 'error', message }
    : { status: 'partial', posted, message };
}
