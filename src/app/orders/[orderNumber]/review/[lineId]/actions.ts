'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getBuyerSession } from '@/lib/auth/dal';
import { REVIEW_MESSAGES, reviewItemSchema } from '@/lib/orders/review-schema';
import { submitProductReview } from '@/services/storefront/reviews';

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

export default async function submitReviewAction(
  _previous: SubmitReviewFormState,
  formData: FormData,
): Promise<SubmitReviewFormState> {
  const parsed = submitReviewSchema.safeParse({
    orderNumber: formData.get('orderNumber'),
    orderLineId: formData.get('orderLineId'),
    rating: formData.get('rating'),
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

  const outcome = await submitProductReview({
    verifiedEmail,
    orderLineId: parsed.data.orderLineId,
    rating: parsed.data.rating,
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

  // The order page's review control and the product page's rating both change.
  // `revalidatePath` on the order is enough here: the product page reads the
  // portal's cached payload, which the portal expires itself on write.
  revalidatePath(`/orders/${parsed.data.orderNumber}`);
  revalidatePath('/orders');

  return { status: 'idle' };
}
