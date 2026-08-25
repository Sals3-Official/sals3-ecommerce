'use client';

import { useMemo, useState } from 'react';
import reviewFilters, {
  matchesReviewFilter,
  type ReviewFilterKey,
} from '@/lib/reviews/filters';
import type { ProductReview } from '@/services/storefront/reviews';
import ProductReviewCard from './ProductReviewCard';

/**
 * The filter chips and the list they narrow.
 *
 * ## Why this filters in the browser instead of routing
 *
 * Everything else that narrows a list in this storefront is a `next/link` —
 * order lanes, category filters, paging — because those change *which rows are
 * fetched*, and a URL is then the honest home for that state. This does not: the
 * whole list is already on the page (capped at 50 by
 * `ProductReviewsResponseSchema`), so a chip is a lens on data in hand. Routing
 * it would re-render an entire product page — gallery, buy box, description,
 * specifications, related products — to hide some list items that never left.
 *
 * The cost is one small client component and the reviews in the RSC payload, on
 * a page that already ships the gallery and the variant selector as client
 * components. The alternative costs a server round trip per chip press.
 *
 * ## Server-rendered anyway, which is the part that matters for crawling
 *
 * A `'use client'` component still renders on the server, so the reviews are in
 * the initial HTML and a crawler or answer engine reads them without executing
 * anything. This is why the list is **not** behind `next/dynamic` with
 * `ssr: false` — that would trade the section's discoverability for a few
 * kilobytes, and review text is exactly the kind of content that earns a page
 * its long-tail queries.
 *
 * ## There is no "no reviews match" state, because there cannot be
 *
 * `reviewFilters` only offers a chip that matches *some but not all* of the
 * list, so every chip on screen yields at least one row. An empty state would be
 * unreachable UI — built, never seen, and never really tested, which is the
 * failure mode `/orders` avoided by not drawing a signed-out panel behind a
 * redirect. If a filter is ever added that can legitimately match nothing, the
 * state comes back with it.
 *
 * `selected` is the one guard that is load-bearing: `reviews` changes on a
 * variant navigation, and a band that existed for the old variant may not exist
 * for the new one.
 */
export default function ProductReviewList({
  reviews,
}: {
  reviews: ProductReview[];
}) {
  const [active, setActive] = useState<ReviewFilterKey>('all');

  const filters = useMemo(() => reviewFilters(reviews), [reviews]);
  const shown = useMemo(
    () => reviews.filter((review) => matchesReviewFilter(review, active)),
    [reviews, active],
  );

  // A band can only vanish if `reviews` itself changed, which on a product page
  // means a variant navigation. Falling back to `all` beats rendering an empty
  // list under a chip that is no longer drawn.
  const selected = filters.some((filter) => filter.key === active)
    ? active
    : 'all';

  return (
    <>
      {filters.length > 1 ? (
        <div
          role="group"
          aria-label="Filter reviews"
          className="mt-4 flex flex-wrap gap-2"
        >
          {filters.map((filter) => {
            const isActive = filter.key === selected;

            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(filter.key)}
                // 44px on a phone — the touch-target floor — and 36px from
                // `sm`, the same split `OrderActions` uses. A chip row is the
                // easiest place to drop below it, because the chips look small
                // and there are six of them side by side.
                className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors sm:min-h-9 ${
                  isActive
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-border-strong bg-white text-ink-muted hover:bg-surface-sunken'
                }`}
              >
                {filter.label}
                <span
                  className={`ml-1.5 tabular-nums ${isActive ? 'text-white/75' : 'text-ink-subtle'}`}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ul aria-live="polite" className="mt-2">
        {shown.map((review) => (
          <ProductReviewCard key={review.id} review={review} />
        ))}
      </ul>
    </>
  );
}
