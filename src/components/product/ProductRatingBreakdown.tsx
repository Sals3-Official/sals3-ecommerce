import StarRating from './StarRating';

type ProductRatingBreakdownProps = {
  /** Counts for 1..5 stars, in that order. */
  breakdown: [number, number, number, number, number];
  total: number;
};

/**
 * The five bars, kept alongside the filter chips rather than replaced by them.
 *
 * Shopee ships only chips. The bars answer a different question: a chip tells a
 * buyer how many 2-star reviews exist, and the bar shows them the *shape* of the
 * distribution at a glance — whether 4.6 means "consistently good" or "mostly
 * five with a few furious ones", which is the thing a buyer is actually reading
 * an average to find out.
 *
 * Presentational on purpose. The bars are not buttons: the chips directly above
 * them already filter, and two controls for one action means two hit targets
 * that have to stay in agreement about which is selected.
 */
export default function ProductRatingBreakdown({
  breakdown,
  total,
}: ProductRatingBreakdownProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = breakdown[star - 1] ?? 0;
        const share = total === 0 ? 0 : Math.round((count / total) * 100);

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
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
