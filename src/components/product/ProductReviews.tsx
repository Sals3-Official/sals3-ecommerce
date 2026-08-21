import type { ProductReview } from '@/services/storefront/reviews';
import StarRating from './StarRating';

const DATE_FORMAT = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

type ProductReviewsProps = {
  rating?: { average: number; count: number };
  breakdown?: [number, number, number, number, number];
  reviews: ProductReview[];
};

/**
 * Ratings and reviews on the product page.
 *
 * ## The provenance line is the point of the summary block
 *
 * Every review here comes from a delivered Sals3 order — the portal will not
 * accept one otherwise. So a per-review "verified purchase" badge would be
 * noise on every single row; the guarantee is stated once, where a buyer
 * deciding whether to trust the number is actually looking.
 *
 * It also says what is *not* here: no supplier ratings. CJ's own review counts
 * describe CJ's marketplace, and presenting them as a Sals3 rating is the
 * fabrication the wiki's corrected external facts exist to prevent.
 *
 * ## No reviews means no section
 *
 * The page renders nothing here rather than an empty state. That is this repo's
 * standing rule — `page.test.tsx`'s "renders no section for data the portal did
 * not send" — and the description, specifications and variant sections all
 * follow it. A heading reading "Ratings and reviews" above a sentence saying
 * there are none is a section about an absence, which on a catalogue where most
 * products have no reviews yet would be noise on almost every page.
 *
 * Consequence, accepted: a product whose rating exists but whose list could not
 * be fetched shows nothing here. The card's stars still carry the number, and a
 * summary above an empty list would look broken rather than honest.
 */
export default function ProductReviews({
  rating,
  breakdown,
  reviews,
}: ProductReviewsProps) {
  if (reviews.length === 0) return null;

  const hasRating = rating !== undefined && rating.count > 0;

  return (
    <section
      aria-labelledby="reviews-heading"
      className="border-t border-border py-10"
    >
      <div className="flex items-baseline gap-3">
        <h2
          id="reviews-heading"
          className="font-display text-xl font-semibold tracking-[-0.02em] text-ink"
        >
          Ratings and reviews
        </h2>
        {hasRating ? (
          <span className="text-[13.5px] font-medium text-ink-muted">
            {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
          </span>
        ) : null}
      </div>

      {hasRating ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-8 rounded-[10px] border border-border bg-surface p-5 sm:grid-cols-[12.5rem_1fr]">
            <div className="flex flex-col gap-2">
              <span className="font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
                {rating.average.toFixed(1)}
              </span>
              <StarRating
                rating={Math.round(rating.average)}
                size="lg"
                label={`${rating.average.toFixed(1)} out of 5`}
              />
              <span className="text-xs leading-normal text-ink-subtle">
                Out of 5, from {rating.count}{' '}
                {rating.count === 1 ? 'review' : 'reviews'} of this product.
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {breakdown === undefined ? null : (
                <div className="flex flex-col gap-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = breakdown[star - 1] ?? 0;
                    const share =
                      rating.count === 0
                        ? 0
                        : Math.round((total / rating.count) * 100);

                    return (
                      <div key={star} className="flex items-center gap-2.5">
                        <span className="flex w-[2.125rem] shrink-0 items-center gap-1 text-xs font-medium text-ink-muted">
                          {star}
                          <StarRating rating={1} size="sm" label="" />
                        </span>
                        <div className="h-[7px] flex-grow overflow-hidden rounded-full bg-surface-sunken-strong">
                          <div
                            className="h-[7px] rounded-full bg-rating"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-right text-xs text-ink-subtle tabular-nums">
                          {total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="border-t border-border pt-3 text-[12.5px] leading-relaxed text-ink-muted">
                Every review here was written by a customer after Sals3
                delivered this item to them. We do not accept reviews from
                anyone else, and we do not carry ratings from our supplier.
              </p>
            </div>
          </div>

          <ul className="mt-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="flex flex-col gap-2.5 border-t border-border py-5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {review.displayName ?? 'A Sals3 customer'}
                  </span>
                  <span className="text-xs text-ink-subtle">
                    {DATE_FORMAT.format(new Date(review.createdAt))}
                  </span>
                  <span className="ml-auto">
                    <StarRating
                      rating={review.rating}
                      label={`${review.rating} out of 5`}
                    />
                  </span>
                </div>

                {review.variantLabel === null ? null : (
                  // From the order line's frozen snapshot, not the listing as
                  // it stands today — a renamed variant must not rewrite what
                  // a past buyer says they bought (ADR-007).
                  <span className="text-[12.5px] text-ink-subtle">
                    Bought{' '}
                    <strong className="font-semibold text-ink-muted">
                      {review.variantLabel}
                    </strong>
                  </span>
                )}

                {review.body === null ? null : (
                  <p className="max-w-[66ch] text-sm leading-relaxed text-ink">
                    {review.body}
                  </p>
                )}

                {review.reply === null ? null : (
                  <div className="mt-0.5 ml-6 rounded-r-lg border-l-2 border-border-strong bg-surface px-3.5 py-3">
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
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
