import { UserIcon } from '@/components/icons/Icon';
import type { ProductReview } from '@/services/storefront/reviews';
import StarRating from './StarRating';

const DATE_FORMAT = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * The monogram, from the name the buyer already consented to publish.
 *
 * Derived, never invented: `displayName` arrives already masked ("aj G."), so
 * the initial is a letter the page is showing anyway. An anonymous review gets
 * the `UserIcon` rather than a letter from somewhere else — there is no name to
 * take one from, and taking it from the order would publish exactly what the
 * buyer declined.
 *
 * Shopee puts a photo here. Sals3 has no buyer avatars: no field on the wire, no
 * upload anywhere, and inventing an identicon would dress up an account that
 * does not exist as a person with a face.
 */
function ReviewerMark({ displayName }: { displayName: string | null }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken-strong text-[13px] font-semibold text-ink-muted"
    >
      {displayName === null ? (
        <UserIcon width={16} height={16} />
      ) : (
        displayName.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

/**
 * One review, laid out the way Shopee lays one out: identity and score together
 * at the top left, then the metadata line, then the words.
 *
 * ## What moved, and why
 *
 * The stars used to sit far right on the same line as the name, which put the
 * two halves of "who said this and how did they score it" at opposite ends of a
 * wide row. They now sit directly under the name, so the pair reads as one unit
 * at any width and the row needs no `ml-auto` that collapses on a phone.
 *
 * The variation reads `Variation: Black` rather than `Bought Black`. It comes
 * from the order line's frozen snapshot, not the listing as it stands today — a
 * renamed variant must not rewrite what a past buyer says they bought (ADR-007).
 *
 * ## No "verified purchase" badge
 *
 * Every review here is one: the portal refuses any line whose own parcel is not
 * `DELIVERED`. A badge on every row would carry no information, so the guarantee
 * is stated once in the summary block instead of stamped a hundred times.
 *
 * ## No helpful votes, no kebab menu
 *
 * Shopee has both. Neither has anything behind it here — there is no vote
 * table and no buyer-facing report route — and a control that does nothing is
 * worse than its absence.
 */
export default function ProductReviewCard({
  review,
}: {
  review: ProductReview;
}) {
  return (
    <li className="flex gap-3 border-t border-border py-5">
      <ReviewerMark displayName={review.displayName} />

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[13.5px] font-semibold text-ink">
            {review.displayName ?? 'A Sals3 customer'}
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <StarRating
              rating={review.rating}
              label={`${review.rating} out of 5`}
            />
            <span className="text-xs text-ink-subtle">
              {DATE_FORMAT.format(new Date(review.createdAt))}
            </span>
            {review.variantLabel === null ? null : (
              // No middot between these. The row wraps at 375px, and a
              // separator dangles alone at the end of the first line the moment
              // it does — the gap already reads as separation, and a stranded
              // dot reads as a rendering fault.
              <span className="text-xs text-ink-subtle">
                Variation:{' '}
                <span className="font-medium text-ink-muted">
                  {review.variantLabel}
                </span>
              </span>
            )}
          </div>
        </div>

        {review.body === null ? null : (
          <p className="max-w-[66ch] text-sm leading-relaxed text-ink">
            {review.body}
          </p>
        )}

        {review.reply === null ? null : (
          <div className="mt-0.5 rounded-r-lg border-l-2 border-border-strong bg-surface px-3.5 py-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-semibold text-ink">
                Sals3 Official
              </span>
              <span className="rounded bg-surface-sunken-strong px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.02em] text-brand-900">
                SELLER
              </span>
              <span className="text-xs text-ink-subtle">
                {DATE_FORMAT.format(new Date(review.reply.createdAt))}
              </span>
            </div>
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink-muted">
              {review.reply.body}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
