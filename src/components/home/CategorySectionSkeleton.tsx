const SKELETON_TILE_COUNT = 10;

/** Static, so the tree is built once at module load, not on every render. */
const SKELETON_TILES = Array.from(
  { length: SKELETON_TILE_COUNT },
  (_, index) => (
    <div
      key={index}
      className="flex flex-col items-center gap-2 bg-white px-2 pt-3.5 pb-3 md:gap-2.5 md:px-3.5 md:pt-4.5 md:pb-4"
    >
      <div className="h-14 w-14 animate-pulse rounded-xl bg-surface-sunken md:h-18 md:w-18" />
      <div className="h-2.5 w-16 animate-pulse rounded-full bg-surface-sunken" />
      <div className="h-2.5 w-10 animate-pulse rounded-full bg-surface-sunken" />
    </div>
  ),
);

/**
 * `<Suspense>` fallback for the category grid (build spec §11.8: "Use
 * skeleton screens. Do not use a rotating circle."). Matches the real
 * tile's geometry — media square and both label lines — so the layout does
 * not shift when the live grid replaces it. `animate-pulse` is neutralised
 * by the existing `prefers-reduced-motion` rule in globals.css.
 */
export default function CategorySectionSkeleton() {
  return (
    <section className="mt-6.5" aria-hidden="true">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="text-xl font-bold whitespace-nowrap">
          Shop by category
        </h2>
      </div>
      <div
        aria-busy="true"
        className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5"
      >
        {SKELETON_TILES}
      </div>
    </section>
  );
}
