import type { ProductReview } from '@/services/storefront/reviews';
import ProductRatingBreakdown from './ProductRatingBreakdown';
import ProductReviewList from './ProductReviewList';
import StarRating from './StarRating';

type ProductReviewsProps = {
  rating?: { average: number; count: number };
  breakdown?: [number, number, number, number, number];
  reviews: ProductReview[];
};

/**
 * Ratings and reviews on the product page.
 *
 * Rebuilt 2026-08-26 from the Shopee "Product Ratings" pattern the owner
 * supplied. What was adopted: the score panel reading as one horizontal band,
 * the **filter chips**, and a per-review row that leads with who and how they
 * scored it rather than spreading the two across a wide line.
 *
 * What was not adopted, and why it is not an oversight:
 *
 * - **"With Media" chip** — the most prominent one on Shopee. No review here
 *   carries an image or a video, because the form has never accepted an upload
 *   and `ProductReviewSchema` has no field for one.
 * - **Avatars** — no buyer avatar exists on the wire. The row shows the initial
 *   of the name already published, or `UserIcon` for an anonymous review.
 * - **Helpful votes and the report menu** — no vote table, no buyer-facing
 *   report route.
 * - **Per-attribute sub-scores** ("Material Quality: 10") — the wire carries one
 *   rating per line, not a rubric.
 *
 * Each of those would be a control or a claim with nothing behind it, which is
 * the one thing this section cannot afford: it is the part of the page whose
 * whole value is that a buyer can trust what it says.
 *
 * ## The provenance line is still the point of the summary block
 *
 * Every review comes from a delivered Sals3 order — the portal will not accept
 * one otherwise. So a per-review "verified purchase" badge would be noise on
 * every single row; the guarantee is stated once, where a buyer deciding whether
 * to trust the number is looking. It also says what is *not* here: no supplier
 * ratings. CJ's own review counts describe CJ's marketplace, and presenting them
 * as a Sals3 rating is the fabrication the wiki's corrected external facts exist
 * to prevent.
 *
 * ## No reviews means no section
 *
 * The page renders nothing here rather than an empty state — this repo's
 * standing rule, which `page.test.tsx` asserts for the page as a whole. A
 * heading reading "Ratings and reviews" above a sentence saying there are none
 * is a section about an absence, which on a catalogue where most products have
 * no reviews yet would be noise on almost every page.
 *
 * A filter the buyer *chose* returning nothing is the opposite case and does get
 * a sentence; that one lives in `ProductReviewList`.
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

  if (!hasRating) return null;

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
        <span className="text-[13.5px] font-medium text-ink-muted">
          {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      <div className="mt-5 rounded-[10px] border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-[12.5rem_1fr]">
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

          {breakdown === undefined ? null : (
            <ProductRatingBreakdown
              breakdown={breakdown}
              total={rating.count}
            />
          )}
        </div>

        <p className="mt-5 border-t border-border pt-3.5 text-[12.5px] leading-relaxed text-ink-muted">
          Every review here was written by a customer after Sals3 delivered this
          item to them. We do not accept reviews from anyone else, and we do not
          carry ratings from our supplier.
        </p>
      </div>

      <ProductReviewList reviews={reviews} />
    </section>
  );
}
