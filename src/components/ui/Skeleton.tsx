/**
 * The shared shapes every route skeleton is built from.
 *
 * `OrdersSkeleton` established the vocabulary in August: `animate-s3pulse` on
 * the group rather than the bar (one heartbeat per card, not a dozen out of
 * step), `--color-surface-sunken-strong` for the bars that stand for text and
 * `--color-surface-sunken` for the quieter ones, and the whole region marked
 * `aria-busy` with a polite announcement, because a skeleton says nothing at all
 * to a screen reader. These are that vocabulary extracted so the five new
 * skeletons cannot each drift their own version of it.
 *
 * Deliberately not a single `<Skeleton variant=…>`: the bars, blocks and cards
 * take different props and a variant enum would collapse them into one
 * signature where most props are wrong for most calls.
 */

type SkeletonBarProps = {
  /** Any CSS width — a percentage keeps ragged text edges from lining up. */
  width: string;
  /** Bar height in px. 13 stands in for a heading, 7-10 for body text. */
  height?: number;
  /** The quieter tone, for secondary lines. */
  soft?: boolean;
  className?: string;
};

/** One line of not-yet-known text. */
export function SkeletonBar({
  width,
  height = 8,
  soft = false,
  className = '',
}: SkeletonBarProps) {
  return (
    <span
      aria-hidden
      className={`block rounded ${soft ? 'bg-surface-sunken' : 'bg-surface-sunken-strong'} ${className}`}
      style={{ width, height: `${height}px` }}
    />
  );
}

type SkeletonBlockProps = {
  /** Tailwind classes for the shape — aspect, radius, sizing. */
  className?: string;
  soft?: boolean;
};

/** A rectangle standing in for an image, a control, or a panel. */
export function SkeletonBlock({
  className = '',
  soft = false,
}: SkeletonBlockProps) {
  return (
    <span
      aria-hidden
      className={`block ${soft ? 'bg-surface-sunken' : 'bg-surface-sunken-strong'} ${className}`}
    />
  );
}

type SkeletonProductCardProps = {
  /** Varies the two title bars so a grid does not read as a printed pattern. */
  titleWidth: string;
  subtitleWidth: string;
};

/**
 * Matches `home/ProductCard` — the card every grid route actually renders.
 *
 * Same `rounded-xl border border-border bg-white`, same square image well, same
 * order of title then price, so the grid does not change geometry when the real
 * cards land. `catalog/ProductCard` is deliberately not the reference: its own
 * doc comment says not to route real traffic to it.
 */
export function SkeletonProductCard({
  titleWidth,
  subtitleWidth,
}: SkeletonProductCardProps) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border bg-white"
    >
      <SkeletonBlock className="aspect-square w-full" soft />
      <div className="flex flex-col gap-1.5 px-2.5 pt-2.5 pb-3">
        <SkeletonBar width={titleWidth} height={7} />
        <SkeletonBar width={subtitleWidth} height={7} />
        <SkeletonBar width="56%" height={13} soft className="mt-1.5" />
      </div>
    </div>
  );
}

/**
 * Ten cards in the live grid geometry.
 *
 * Ten and not three: the grid is `grid-cols-5` at `lg`, so a shorter skeleton
 * collapses to one row and the page then reflows downward when the real ten
 * arrive — a jump that reads as a second load rather than as one.
 *
 * The widths are a fixed list rather than anything random, so the server and
 * client renders agree and the shape is stable across a re-render.
 */
const CARD_WIDTHS: ReadonlyArray<readonly [string, string]> = [
  ['92%', '58%'],
  ['78%', '66%'],
  ['88%', '44%'],
  ['70%', '60%'],
  ['95%', '52%'],
  ['82%', '62%'],
  ['74%', '48%'],
  ['90%', '56%'],
  ['86%', '40%'],
  ['76%', '64%'],
];

type SkeletonProductGridProps = {
  /** How many cards to draw. Defaults to two full desktop rows. */
  count?: number;
  /** The polite announcement. Name what is loading, not just "loading". */
  label?: string;
};

export function SkeletonProductGrid({
  count = 10,
  label = 'Loading products…',
}: SkeletonProductGridProps) {
  const cards = CARD_WIDTHS.slice(0, count);

  return (
    <div aria-busy>
      <div className="animate-s3pulse grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([titleWidth, subtitleWidth]) => (
          <SkeletonProductCard
            key={titleWidth + subtitleWidth}
            titleWidth={titleWidth}
            subtitleWidth={subtitleWidth}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-3.5 text-[13px] text-ink-muted">
        {label}
      </p>
    </div>
  );
}
