/**
 * Three card outlines while the orders load.
 *
 * Shaped like the real card — header strip, image square, two text bars, a
 * money bar — so the page does not reflow into a different geometry when the
 * data lands. The region is `aria-busy` and carries a polite announcement,
 * because a skeleton communicates nothing at all to a screen reader.
 */

const ROWS = ['a', 'b', 'c'];

export default function OrdersSkeleton() {
  return (
    <div aria-busy className="mt-4 flex flex-col gap-3.5">
      {ROWS.map((row) => (
        <div
          key={row}
          aria-hidden
          className="animate-s3pulse overflow-hidden rounded-xl border border-border bg-white"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5">
            <div className="flex flex-col gap-2">
              <span className="block h-3 w-48 rounded bg-surface-sunken-strong" />
              <span className="block h-2.5 w-32 rounded bg-surface-sunken" />
            </div>
            <span className="block h-[22px] w-24 rounded-full bg-surface-sunken" />
          </div>
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <span className="block h-16 w-16 rounded-lg bg-surface-sunken" />
            <div className="flex flex-1 flex-col gap-2">
              <span className="block h-3 w-3/5 rounded bg-surface-sunken-strong" />
              <span className="block h-2.5 w-1/3 rounded bg-surface-sunken" />
            </div>
            <span className="block h-3 w-[74px] rounded bg-surface-sunken-strong" />
          </div>
        </div>
      ))}
      <p aria-live="polite" className="text-[13px] text-ink-muted">
        Loading your orders…
      </p>
    </div>
  );
}
