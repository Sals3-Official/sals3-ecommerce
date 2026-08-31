/**
 * Why a buyer says a review should be looked at.
 *
 * ## Why this is its own file
 *
 * The report control is a client component, and the only other home for this
 * list would be `services/storefront/reviews.ts` — which imports the HTTP
 * client and reads the storefront API token. Importing that from the browser to
 * get five strings would drag the whole boundary module into the client bundle.
 *
 * ## Why the list is closed
 *
 * No free text. A note field here would be an unmoderated string on a public
 * object reachable by anyone signed in, and the moderator's actual question is
 * which rule is said to be broken — five words answer that better than a
 * paragraph, and they answer it the same way every time.
 *
 * The portal validates the identical five. A sixth added here without adding it
 * there is a `400`, not a silently accepted value.
 */
export const REVIEW_FLAG_REASONS = [
  'OFF_TOPIC',
  'OFFENSIVE',
  'SPAM',
  'PERSONAL_INFORMATION',
  'NOT_A_REVIEW',
] as const;

export type ReviewFlagReason = (typeof REVIEW_FLAG_REASONS)[number];

/** What each reason says to the buyer choosing it. */
export const REVIEW_FLAG_REASON_COPY: Record<ReviewFlagReason, string> = {
  OFF_TOPIC: 'Not about this product',
  OFFENSIVE: 'Offensive or abusive',
  SPAM: 'Spam or an advertisement',
  PERSONAL_INFORMATION: 'Contains personal information',
  NOT_A_REVIEW: 'Not a review of using the item',
};
