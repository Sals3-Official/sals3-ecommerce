const SKELETON_TILE_COUNT = 10;

/**
 * `<Suspense>` fallback for the category band (build spec §11.8: "Use
 * skeleton screens. Do not use a rotating circle."). Matches the real
 * tile's geometry exactly — `h-14 w-14 rounded-2xl` — so the layout does
 * not shift when the live row replaces it. `animate-pulse` is neutralised
 * by the existing `prefers-reduced-motion` rule in globals.css.
 */
export default function CategoryRowSkeleton() {
  return (
    <div className="border-y border-border bg-white" aria-hidden="true">
      <div className="mx-auto w-full max-w-6xl px-6 py-4">
        <div className="flex gap-2 overflow-hidden md:grid md:auto-cols-fr md:grid-flow-col md:gap-1">
          {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
            <div
              key={index}
              className="flex w-[78px] shrink-0 flex-col items-center gap-2 px-0.5 pt-2 pb-1.5 md:w-auto"
            >
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-surface-sunken" />
              <div className="h-2.5 w-12 animate-pulse rounded-full bg-surface-sunken" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
