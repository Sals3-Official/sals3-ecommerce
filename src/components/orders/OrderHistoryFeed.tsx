import type { BuyerOrderTimelineStep } from '@/lib/orders/contracts';

/**
 * The order's own lifecycle, kept separate from the packages' tracking events.
 *
 * They answer different questions. This one is Sals3's record — placed, paid,
 * shipped, delivered — and every entry is something the platform itself did or
 * observed. The tracking feed inside each package is somebody else's report,
 * attributed to them. Merging the two would produce a single stream in which a
 * buyer cannot tell which claims Sals3 stands behind.
 *
 * The marks are shape-coded as well as colour-coded — filled, ringed, hollow,
 * and a red fill for a contested step — but each row also carries its own words
 * (`In progress`, `Not yet`, a timestamp), so the state never rests on the dot.
 */

const MARKS: Record<BuyerOrderTimelineStep['mark'], string> = {
  done: 'bg-brand-600',
  now: 'border-[3px] border-brand-600 bg-white',
  todo: 'border border-border-strong bg-white',
  alert: 'bg-red-600',
};

type OrderHistoryFeedProps = {
  timeline: readonly BuyerOrderTimelineStep[];
};

export default function OrderHistoryFeed({ timeline }: OrderHistoryFeedProps) {
  return (
    <section
      aria-labelledby="order-history"
      className="rounded-xl border border-border bg-white px-4.5 py-4"
    >
      <h2
        id="order-history"
        className="text-[11px] font-bold tracking-[0.07em] uppercase text-ink-muted"
      >
        Order history
      </h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {timeline.map((step) => (
          <li key={step.id} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={`mt-1 block h-[9px] w-[9px] flex-none rounded-full ${MARKS[step.mark]}`}
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-[13px] leading-snug text-ink">
                {step.label}
              </span>
              <span className="text-xs leading-snug text-ink-muted">
                {step.atLabel}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
