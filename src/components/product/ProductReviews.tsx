import type { ProductReview } from '@/services/storefront/reviews';
import ProductRatingBreakdown from './ProductRatingBreakdown';
import ProductReviewList from './ProductReviewList';
import StarRating from './StarRating';

/** Five zeros, so an unreviewed product draws the same five bars as any other. */
const EMPTY_BREAKDOWN: [number, number, number, number, number] = [
  0, 0, 0, 0, 0,
];

/**
 * What stands where the review list would be on an unreviewed product.
 *
 * The same reframe the card uses, and for the same reason: "no reviews yet"
 * states a deficit and asks the shopper for nothing, while going first is the one
 * thing that is reliably true here — somebody has to. Quiet on purpose. No
 * urgency, no count of people looking, no scarcity; an unreviewed product is new,
 * not bad.
 *
 * Text, not a button, exactly as on the card. Reviewing is gated on the parcel
 * being delivered, which is weeks out on this catalogue, so a control offering it
 * now could not be honoured. The second sentence says so rather than leaving the
 * buyer to find out — an invitation is only worth making if its terms are stated.
 */
function FirstReviewInvitation() {
  return (
    <p className="mt-5 text-[13.5px] leading-relaxed text-ink-muted">
      <span className="font-medium text-ink">Be the first to review this.</span>{' '}
      Once Sals3 has delivered it to you, you can say how it turned out — and
      yours is the review the next buyer reads.
    </p>
  );
}

type ProductReviewsProps = {
  rating?: {
    average: number;
    count: number;
    /**
     * How the deliveries were scored, over its own denominator. Absent when
     * nobody answered — not the same fact as a low score, and the summary
     * renders it as absence for exactly that reason.
     */
    delivery?: { average: number; count: number };
  };
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
 * - **Avatars** — no buyer avatar exists on the wire. The row shows the initial
 *   of the name already published, or `UserIcon` for an anonymous review.
 * - **Helpful votes** — no vote table.
 * - **Per-attribute sub-scores** ("Material Quality: 10") — the wire carries one
 *   product rating per line, not a rubric. The delivery score below is not one
 *   of these: it is a second party's work, not a facet of the item.
 *
 * Each of those would be a control or a claim with nothing behind it, which is
 * the one thing this section cannot afford: it is the part of the page whose
 * whole value is that a buyer can trust what it says.
 *
 * Two of the original absences are now filled, because something real arrived
 * behind them: reviews carry **photos**, and a buyer can **report** one. The
 * "With Media" filter chip is still absent — a filter is worth its row of
 * chrome once enough reviews carry pictures to make filtering them a real
 * question, and on this catalogue that day has not come.
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
 * ## No reviews still means a section — reversed 2026-08-30, owner's call
 *
 * This used to render nothing at all on an unreviewed product, under the repo's
 * "no section for data the portal did not send" rule. The owner overrode it, and
 * the override is right for this one section: a buyer who scrolls past the
 * description and finds no reviews block cannot tell whether the product has no
 * reviews or whether the page is broken. Zero is itself the answer to the
 * question they came here with, and stating it plainly costs less trust than
 * leaving a hole where they expected to look. It also puts the provenance
 * sentence — that every review comes from a delivered Sals3 order — on every
 * product rather than only on the ones already carrying reviews.
 *
 * The average is the one figure the empty state does NOT print as a number.
 * "0.0" beside five hollow stars does not read as "not yet rated"; it reads as
 * "rated zero out of five", which is the single worst thing this page could say
 * about a product nobody has complained about. An em dash says the true thing.
 * The counts are all rendered as the zeros they are.
 *
 * A filter the buyer *chose* returning nothing is a different case and gets its
 * own sentence; that one lives in `ProductReviewList`.
 *
 * ## The one case that still renders nothing
 *
 * A rating that claims reviews exist while the list came back empty — the review
 * read failed, and the product payload's rating outlived it. Neither branch can
 * be told honestly there: the summary would head an empty list, and the
 * first-review invitation would be a fabrication on a product with reviews. So
 * that case still hides, and the card's stars still carry the number.
 */
export default function ProductReviews({
  rating,
  breakdown,
  reviews,
}: ProductReviewsProps) {
  const hasRating = rating !== undefined && rating.count > 0;
  /*
    The mirror of the guard below, and the one that was missing.

    The reviews arrived and the aggregate did not, so the summary would say
    "No reviews yet", "—" out of 5 and five empty bars directly above a review
    somebody wrote. Reported from live on 2026-08-31.

    It is a timing gap rather than bad data: the product payload carries the
    aggregate and is cached for 60s on this page, while the review list is read
    `no-store`, so a review posted inside that window reaches the list before
    the summary that counts it. Nothing is wrong with either number — they are
    from different moments.

    So the score block is withheld until the aggregate catches up, rather than
    printed as zero. The reviews still render, the provenance sentence still
    renders, and the section never contradicts itself.
  */
  const aggregateLags = !hasRating && reviews.length > 0;

  // The rating says there are reviews and none arrived: see the doc block.
  if (hasRating && reviews.length === 0) return null;

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
        {aggregateLags ? null : (
          <span className="text-[13.5px] font-medium text-ink-muted">
            {hasRating
              ? `${rating.count} ${rating.count === 1 ? 'review' : 'reviews'}`
              : 'No reviews yet'}
          </span>
        )}
      </div>

      {/*
        White, matching `ProductSupplierDetails` — owner decision 2026-08-31.
        It was `bg-surface`, the page's own ground, so the panel read as a
        tinted area of the page rather than as a bounded record. On a page
        whose every other panel is white on that ground, the odd one out looked
        disabled rather than distinct.
      */}
      <div className="mt-5 rounded-[10px] border border-border bg-white p-5">
        {aggregateLags ? null : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-[12.5rem_1fr]">
            <div className="flex flex-col gap-2">
              <span className="font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
                {hasRating ? rating.average.toFixed(1) : '—'}
              </span>
              <StarRating
                rating={hasRating ? Math.round(rating.average) : 0}
                size="lg"
                label={
                  hasRating
                    ? `${rating.average.toFixed(1)} out of 5`
                    : 'Not yet rated'
                }
              />
              <span className="text-xs leading-normal text-ink-subtle">
                {hasRating
                  ? `Out of 5, from ${rating.count} ${rating.count === 1 ? 'review' : 'reviews'} of this product.`
                  : 'Out of 5. Nobody has reviewed this product yet.'}
              </span>

              {/*
                The delivery score, under the product score and visibly apart
                from it. Apart is the whole point: the number above stays about
                the item, and this one is about how the parcel arrived — Sals3
                and the courier, not the seller's product.

                Hidden entirely when nobody answered, rather than shown as 0.0
                or as a dash. A buyer reading "Delivery 0.0" would take it as a
                verdict on the shipping, and no verdict was given.

                It carries its own denominator because it is not the one above:
                a product can hold forty reviews and six delivery scores.
              */}
              {hasRating && rating.delivery !== undefined ? (
                <div className="mt-1 flex flex-col gap-1 border-t border-border pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium text-ink-muted">
                      Delivery
                    </span>
                    <span className="ml-auto font-display text-lg leading-none font-semibold text-ink tabular-nums">
                      {rating.delivery.average.toFixed(1)}
                    </span>
                    <span className="text-xs font-medium text-ink-subtle">
                      / 5
                    </span>
                  </div>
                  <span className="text-xs leading-normal text-ink-subtle">
                    Speed and condition, from{' '}
                    {rating.delivery.count === rating.count
                      ? `all ${rating.count}`
                      : `${rating.delivery.count} of ${rating.count}`}{' '}
                    who answered.
                  </span>
                </div>
              ) : null}
            </div>

            <ProductRatingBreakdown
              breakdown={
                hasRating ? (breakdown ?? EMPTY_BREAKDOWN) : EMPTY_BREAKDOWN
              }
              total={hasRating ? rating.count : 0}
            />
          </div>
        )}

        <p
          className={`border-t border-border pt-3.5 text-[12.5px] leading-relaxed text-ink-muted ${
            aggregateLags ? '' : 'mt-5'
          }`}
        >
          Every review here was written by a customer after Sals3 delivered this
          item to them. We do not accept reviews from anyone else, and we do not
          carry ratings from our supplier.
        </p>
      </div>

      {reviews.length > 0 ? (
        <ProductReviewList reviews={reviews} />
      ) : (
        <FirstReviewInvitation />
      )}
    </section>
  );
}
