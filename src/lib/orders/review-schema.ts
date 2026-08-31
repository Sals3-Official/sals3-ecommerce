import { z } from 'zod';
import { MAX_BODY, MAX_REVIEW_ITEMS } from './review-form';

/**
 * Server-side validation for a review submission, shared by both actions.
 *
 * ## Only the actions import this
 *
 * Kept out of `review-form.ts` on purpose: that file is read by client
 * components, and importing a schema there would ship Zod to the browser for
 * five verdict words. Nothing here is reachable from a `'use client'` file.
 *
 * ## What is deliberately absent
 *
 * No `buyerEmail`, and no display name. The address comes from the session on
 * the server and travels to the portal as the authorisation itself, and the
 * published name is derived portal-side from the order's own checkout ship-to.
 * A field for either one would be a way to publish anything against anybody
 * else's purchase, so neither field exists to be tampered with.
 */

export const reviewItemSchema = z.object({
  orderLineId: z.string().min(1).max(120),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(MAX_BODY).optional(),
  /**
   * How the parcel arrived, 1-5, or absent because the buyer skipped it.
   *
   * The empty string an untouched star row yields in `FormData` has to reach
   * the portal as **absent**, never as a zero: an unanswered delivery question
   * is excluded from the average, while a zero would be folded in as a verdict
   * on a courier nobody complained about — and the portal's `CHECK` refuses it
   * outright, so it would cost the whole review rather than merely mislead.
   *
   * `z.coerce.number()` turns `''` into `0`, so the empty cases are dropped
   * *before* coercion. Afterwards the two are indistinguishable.
   */
  deliveryRating: z.preprocess(
    (value) =>
      value === '' || value === null || value === '0' ? undefined : value,
    z.coerce.number().int().min(1).max(5).optional(),
  ),
  /**
   * `named` credits the buyer; `anonymous` publishes no name. A choice between
   * two known strings, never free text.
   */
  attribution: z.enum(['named', 'anonymous']),
});

export type ReviewItemInput = z.infer<typeof reviewItemSchema>;

/**
 * One order's worth of reviews.
 *
 * `MAX_REVIEW_ITEMS` bounds the fan-out before any portal call is made: the
 * array arrives from the client, and an unbounded one is a way to spend the
 * shared supplier-facing rate limit from a single request.
 */
export const submitOrderReviewsSchema = z.object({
  orderNumber: z.string().min(1).max(40),
  items: z.array(reviewItemSchema).min(1).max(MAX_REVIEW_ITEMS),
});

/**
 * One sentence per failure. Generic enough to leak nothing about which orders
 * exist, specific enough that the buyer knows whether to retry, sign in again,
 * or stop.
 */
export const REVIEW_MESSAGES = {
  invalid: 'Choose a rating from 1 to 5 and try again.',
  signed_out: 'Sign in again to post your review.',
  not_eligible:
    'You can review this item once the package that carried it is delivered.',
  already_reviewed: 'You have already reviewed this item.',
  failed: 'Your review could not be posted. Try again in a moment.',
} as const;

export type ReviewFailureReason = keyof typeof REVIEW_MESSAGES;
