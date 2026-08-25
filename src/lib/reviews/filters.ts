import type { ProductReview } from '@/services/storefront/reviews';

/**
 * The review filter chips, derived from the reviews already on the page.
 *
 * ## Why a chip is absent rather than dead
 *
 * Shopee renders every star band whether or not it has anything in it, so a
 * product with one review shows five chips of which four can only ever produce
 * an empty list. A control with nothing behind it is the thing
 * `OrderActions` exists to argue against — except there the answer is a *reason*
 * on a greyed button, because a buyer went looking for "Cancel order" and needs
 * to know it exists. Nobody goes looking for the 2-star band. So an empty band
 * is simply not offered, which is also what the category filter panel does: it
 * shows a count beside every option it lists, and lists no option that matches
 * nothing.
 *
 * ## What is deliberately not here
 *
 * **No "With media" chip.** Shopee's is the most prominent one and it has no
 * equivalent: `ProductReviewSchema` carries no image or video, because the
 * review form has never accepted an upload. A chip that filtered on a field the
 * wire does not have would be a fabricated control.
 *
 * **No chip that selects everything.** One rule, applied to every band and to
 * comments alike: a chip is offered when it matches *some but not all* of the
 * list. A band holding every review selects the same set as `All`, and "With
 * comments" when every review has one partitions nothing — both are the dead
 * control in different costumes. It also means a product with one review, or
 * with five all at five stars, gets `All` on its own and therefore no chip row
 * at all, which is the correct amount of chrome for a list nothing can narrow.
 *
 * ## Why counting happens here and not in the portal
 *
 * The list is capped at 50 by `ProductReviewsResponseSchema` and is already in
 * memory. Asking the portal for per-band counts would be a second round trip to
 * re-derive what the first one already sent, and the two could disagree — the
 * same reason the portal's own aggregate is a `GROUP BY` and not a rollup.
 */

export const REVIEW_FILTER_KEYS = [
  'all',
  '5',
  '4',
  '3',
  '2',
  '1',
  'commented',
] as const;

export type ReviewFilterKey = (typeof REVIEW_FILTER_KEYS)[number];

export type ReviewFilter = {
  key: ReviewFilterKey;
  label: string;
  count: number;
};

export function matchesReviewFilter(
  review: ProductReview,
  key: ReviewFilterKey,
): boolean {
  if (key === 'all') return true;
  if (key === 'commented') return review.body !== null && review.body !== '';

  return review.rating === Number(key);
}

/**
 * `All` first, then the star bands that have something in them, then comments.
 * The order is Shopee's, because it is the order people read: the overall set,
 * then narrow by score, then narrow by whether there is anything to read.
 */
export default function reviewFilters(
  reviews: readonly ProductReview[],
): ReviewFilter[] {
  const count = (key: ReviewFilterKey) =>
    reviews.filter((review) => matchesReviewFilter(review, key)).length;

  /** Some but not all — the one rule every chip below is filtered by. */
  const narrows = (total: number) => total > 0 && total < reviews.length;

  return [
    { key: 'all' as const, label: 'All', count: reviews.length },
    ...([5, 4, 3, 2, 1] as const)
      .map((star) => ({
        key: String(star) as ReviewFilterKey,
        label: `${star} star`,
        count: count(String(star) as ReviewFilterKey),
      }))
      .filter((filter) => narrows(filter.count)),
    ...(narrows(count('commented'))
      ? [
          {
            key: 'commented' as const,
            label: 'With comments',
            count: count('commented'),
          },
        ]
      : []),
  ];
}
