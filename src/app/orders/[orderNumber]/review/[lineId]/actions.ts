'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getBuyerSession } from '@/lib/auth/dal';
import { MAX_REVIEW_PHOTOS } from '@/lib/orders/review-form';
import { REVIEW_MESSAGES, reviewItemSchema } from '@/lib/orders/review-schema';
import {
  attachProductReviewPhoto,
  submitProductReview,
} from '@/services/storefront/reviews';

/**
 * The buyer's review submission.
 *
 * ## The address never comes from the form
 *
 * `getBuyerSession()` is read here and the verified address goes to the portal
 * in `X-Buyer-Email`, where it **is** the authorisation. A `buyerEmail` field on
 * this action would be a way to review somebody else's purchase, so there is
 * not one — the only identity input is the session cookie, and Next.js verifies
 * the request origin for Server Actions, which is the CSRF control for it.
 *
 * ## Eligibility is not checked here
 *
 * The portal owns it in a single `WHERE` — the line's own parcel `DELIVERED`,
 * inside the window, not already reviewed — and answers `404` for anything
 * else. This side has no access to the parcel state, so re-deriving it would be
 * a guess that could disagree with the real gate.
 *
 * The page hides the form when the line is not `reviewable`, which is a
 * usability measure, not the authorisation (rule 19).
 */

/**
 * One line, plus the order it belongs to. The item half is `reviewItemSchema`,
 * shared with the order list's batch action in `src/app/orders/review-actions.ts`
 * — the body limit and the two attribution words must be the same rule on both
 * surfaces, and two copies is one that drifts.
 */
const submitReviewSchema = reviewItemSchema.extend({
  orderNumber: z.string().min(1).max(40),
});

export type SubmitReviewFormState = {
  status: 'idle' | 'error';
  message?: string;
};

/**
 * The photos the form carried, in the order the buyer chose.
 *
 * Read by **index**, not by iterating the form: a `FormData`'s field order is
 * the client's, and a photo silently reordered between the picker and the page
 * is the kind of thing nobody notices until a buyer complains that their
 * "before" picture came second. A gap ends the run rather than closing up.
 *
 * Empty parts are skipped — a file input the buyer opened and cancelled
 * contributes a zero-byte `File`, and posting it would earn an `EMPTY_FILE`
 * refusal for something they never chose.
 */
function readPhotos(formData: FormData): File[] {
  const photos: File[] = [];

  for (let index = 0; index < MAX_REVIEW_PHOTOS; index += 1) {
    const part = formData.get(`photo${index}`);

    if (!(part instanceof File)) break;
    if (part.size > 0) photos.push(part);
  }

  return photos;
}

/**
 * Uploads each photo onto a review that already exists, and returns the first
 * refusal, or `null`.
 *
 * Sequential rather than `Promise.all`. Each request costs the portal a decode,
 * a re-encode and an object write, and the position a photo takes is counted
 * server-side from what is already there — four at once race that count, and
 * the unique index turns the losers into refusals rather than photos. Four is
 * small enough that the wall clock is not worth the churn.
 *
 * Stops at the first failure. Continuing would publish photos two and four
 * without three, in an order that no longer matches what the buyer arranged.
 */
async function attachPhotos(
  verifiedEmail: string,
  reviewId: string,
  photos: File[],
): Promise<string | null> {
  // eslint-disable-next-line no-restricted-syntax -- ordered and serial, see above.
  for (const photo of photos) {
    // eslint-disable-next-line no-await-in-loop -- ordered and serial, see above.
    const result = await attachProductReviewPhoto({
      verifiedEmail,
      reviewId,
      photo,
    });

    if (!result.ok) {
      return `Your review is posted, but a photo did not attach: ${result.message}`;
    }
  }

  return null;
}

export default async function submitReviewAction(
  _previous: SubmitReviewFormState,
  formData: FormData,
): Promise<SubmitReviewFormState> {
  const parsed = submitReviewSchema.safeParse({
    orderNumber: formData.get('orderNumber'),
    orderLineId: formData.get('orderLineId'),
    rating: formData.get('rating'),
    deliveryRating: formData.get('deliveryRating'),
    body: formData.get('body') ?? undefined,
    attribution: formData.get('attribution'),
  });

  if (!parsed.success) {
    return { status: 'error', message: REVIEW_MESSAGES.invalid };
  }

  const session = await getBuyerSession();
  const verifiedEmail = session?.email ?? '';

  if (verifiedEmail === '') {
    return { status: 'error', message: REVIEW_MESSAGES.signed_out };
  }

  const photos = readPhotos(formData);

  const outcome = await submitProductReview({
    verifiedEmail,
    orderLineId: parsed.data.orderLineId,
    rating: parsed.data.rating,
    // Spread only when answered, so an unanswered delivery question reaches the
    // portal as an absent key and lands in the column as NULL. A `0` would fail
    // its CHECK and cost the whole review.
    ...(parsed.data.deliveryRating === undefined
      ? {}
      : { deliveryRating: parsed.data.deliveryRating }),
    ...(parsed.data.body === undefined || parsed.data.body === ''
      ? {}
      : { body: parsed.data.body }),
    // The choice, never a name. The portal derives the published string from
    // the order's own checkout ship-to, so nothing here can publish a name
    // against somebody else's purchase.
    attribution: parsed.data.attribution,
  });

  if (!outcome.ok) {
    return { status: 'error', message: REVIEW_MESSAGES[outcome.reason] };
  }

  const photoFailure = await attachPhotos(
    verifiedEmail,
    outcome.reviewId,
    photos,
  );

  // The order page's review control and the product page's rating both change.
  // `revalidatePath` on the order is enough here: the product page reads the
  // portal's cached payload, which the portal expires itself on write.
  revalidatePath(`/orders/${parsed.data.orderNumber}`);
  revalidatePath('/orders');

  /*
    The review is posted either way, and this is the honest half-outcome.

    Photos attach after the review exists, because the deployed platform caps a
    serverless request body at 4.5 MB and four photos at the 5 MB per-file
    ceiling is several times that. So one can fail after the words are already
    public.

    The buyer has to be told. Saying nothing leaves them looking for pictures
    that never arrived, and reporting it as a failed review would invite a
    second attempt the portal refuses as a duplicate — one review per purchased
    line, whatever this page does next.
  */
  if (photoFailure !== null) {
    return { status: 'error', message: photoFailure };
  }

  return { status: 'idle' };
}
