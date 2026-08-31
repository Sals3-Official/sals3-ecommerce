'use server';

import { getBuyerSession } from '@/lib/auth/dal';
import {
  REVIEW_FLAG_REASONS,
  type ReviewFlagReason,
} from '@/lib/reviews/flag-reasons';
import { flagProductReview } from '@/services/storefront/reviews';

/**
 * A buyer reporting a review on a product page.
 *
 * ## Signed in, and the address is never a field
 *
 * `getBuyerSession()` is read here and the verified address travels to the
 * portal in `X-Buyer-Email`, where it is the authorisation itself — the same
 * shape as every other buyer write. There is no email field on this action, so
 * a crafted payload has nothing to aim at, and Next.js verifies the request
 * origin for Server Actions, which is the CSRF control for it (rule 27).
 *
 * The sign-in requirement is not friction for its own sake. An anonymous report
 * costs nothing to make and nothing to repeat, and the portal's
 * one-report-per-person index — the thing that makes a queue count read as a
 * count of people — has nothing to key on without an identity.
 *
 * ## Nothing this returns means the review was hidden
 *
 * The portal answers `202`: recorded, not acted on. Saying "reported" is the
 * whole truth, and telling a buyer their report *removed* something would be a
 * promise no threshold here is allowed to keep — an automatic hide would mean a
 * competitor with four accounts can erase a rating.
 *
 * ## Refusals a buyer can act on, and one they cannot
 *
 * "You already reported this" is worth saying: it is their own action and
 * telling them stops a second attempt. "That review is no longer available"
 * collapses unknown-and-already-hidden, because the portal deliberately cannot
 * tell them apart and neither should this.
 */
export type ReportReviewResult = { ok: true } | { ok: false; message: string };

const MESSAGES = {
  signed_out: 'Sign in to report a review.',
  invalid: 'Choose a reason and try again.',
  not_found: 'That review is no longer available.',
  already_reported: 'You have already reported this review.',
  rate_limited: 'Too many reports. Wait a moment and try again.',
  failed: 'The report could not be sent. Try again in a moment.',
} as const;

function isReason(value: unknown): value is ReviewFlagReason {
  return REVIEW_FLAG_REASONS.includes(value as ReviewFlagReason);
}

export default async function reportReviewAction(input: {
  reviewId: unknown;
  reason: unknown;
}): Promise<ReportReviewResult> {
  const { reviewId, reason } = input;

  if (
    typeof reviewId !== 'string' ||
    reviewId === '' ||
    reviewId.length > 120
  ) {
    return { ok: false, message: MESSAGES.invalid };
  }

  if (!isReason(reason)) return { ok: false, message: MESSAGES.invalid };

  const session = await getBuyerSession();
  // A session with no verified address cannot be the reporter the portal's
  // one-per-person index keys on, and sending an empty header would be refused
  // there anyway — refused here, with a sentence the buyer can act on.
  const verifiedEmail = session?.email ?? '';

  if (verifiedEmail === '') {
    return { ok: false, message: MESSAGES.signed_out };
  }

  const result = await flagProductReview({
    verifiedEmail,
    reviewId,
    reason,
  });

  if (result.ok) return { ok: true };

  return { ok: false, message: MESSAGES[result.reason] };
}
