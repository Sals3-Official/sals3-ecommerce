import {
  SkeletonBar,
  SkeletonBlock,
  SkeletonProductGrid,
} from '@/components/ui/Skeleton';

type CatalogPageSkeletonProps = {
  /**
   * Category pages carry a breadcrumb above the grid; search does not.
   *
   * Nothing passes `true` today — `/c/[slug]` has no `loading.tsx`, because one
   * there turns a genuinely unknown department's 404 into a 200 (a streamed
   * response cannot set a status). The flag stays because the shells are
   * otherwise identical — `c/[slug]/page.tsx:328` and `search/page.tsx:163`
   * render the same `max-w-6xl px-6 py-4 pb-16` main and the same
   * `lg:grid-cols-[248px_minmax(0,1fr)]` row — so if that trade is ever taken,
   * the category skeleton is this component with one prop, not a second copy.
   */
  breadcrumb?: boolean;
  /** Polite announcement. Names what is loading rather than just "loading". */
  label: string;
};

/**
 * The listing shell for `/c/[slug]` and `/search`.
 *
 * The filter rail's section headings are real — "Price" and "Availability" are
 * fixed facets, not data — while their options pulse, because how many bands a
 * category has and what they cost is exactly what the Portal has yet to answer.
 *
 * The result count is deliberately a bar and not a number. Rendering "0 results"
 * or a guessed total while the read is in flight would put a false fact on
 * screen, and a count that then jumps is worse than one that arrives once.
 */
export default function CatalogPageSkeleton({
  breadcrumb = false,
  label,
}: CatalogPageSkeletonProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-4 pb-16">
      {breadcrumb ? (
        <div className="animate-s3pulse mb-4 flex items-center gap-2">
          <span className="text-[13px] text-ink-subtle">Home</span>
          <span aria-hidden className="text-[11px] text-border-strong">
            /
          </span>
          <SkeletonBar width="88px" height={8} soft />
          <span aria-hidden className="text-[11px] text-border-strong">
            /
          </span>
          <SkeletonBar width="112px" height={8} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-white p-4">
          <p className="m-0 text-[13px] font-bold text-ink">Price</p>
          <div className="animate-s3pulse mt-3 flex flex-col gap-2.5">
            {['a', 'b', 'c', 'd'].map((slot) => (
              <div key={slot} className="flex items-center gap-2.5">
                <SkeletonBlock className="h-3.5 w-3.5 shrink-0 rounded-full border border-border-strong" />
                <SkeletonBar width="100%" height={8} soft />
              </div>
            ))}
          </div>

          <div className="my-4 h-px bg-border" />

          <p className="m-0 text-[13px] font-bold text-ink">Availability</p>
          <div className="animate-s3pulse mt-3 flex flex-col gap-2.5">
            <SkeletonBar width="84%" height={8} soft />
            <SkeletonBar width="66%" height={8} soft />
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="animate-s3pulse flex flex-col gap-2">
              <SkeletonBar width="260px" height={21} />
              <SkeletonBar width="118px" height={9} soft />
            </div>
            <SkeletonBlock
              className="h-8 w-[132px] shrink-0 rounded-lg border border-border-strong"
              soft
            />
          </div>

          <SkeletonProductGrid label={label} />
        </div>
      </div>
    </main>
  );
}
