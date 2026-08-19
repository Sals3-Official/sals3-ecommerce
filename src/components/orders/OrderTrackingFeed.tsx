import type { BuyerOrderTrackingEvent } from '@/lib/orders/contracts';

/**
 * The carrier's and the supplier's own scans, in the order they arrived.
 *
 * ## Why an exception event is not promoted
 *
 * An `Operations` note saying one option is slow to source, or a carrier
 * marking an attempted delivery, is a fact about a moment. The package's status
 * is the portal's rollup, which weighs all of them. So an exception event is
 * red where it sits and changes nothing above it — a feed that could rewrite
 * the status would let the loudest line win rather than the true one.
 *
 * ## Why the sources are not merged
 *
 * Two systems report the same parcel and sometimes disagree; that disagreement
 * is information. Each row is attributed, nothing is reconciled, and the note
 * at the bottom says so, so a buyer reading two contradictory lines knows they
 * are reading two sources rather than one confused one.
 */

const EVENT_NOTE =
  'Events are the carrier’s and the supplier’s own, kept in the order they arrived. Sals3 does not rewrite or merge them.';

type OrderTrackingFeedProps = {
  events: readonly BuyerOrderTrackingEvent[];
  headingId: string;
};

export default function OrderTrackingFeed({
  events,
  headingId,
}: OrderTrackingFeedProps) {
  if (events.length === 0) {
    return (
      <div className="p-4">
        <h3
          id={headingId}
          className="text-[11px] font-bold tracking-[0.07em] uppercase text-ink-muted"
        >
          Tracking events
        </h3>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">
          No carrier or supplier event has been reported for this package yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3
        id={headingId}
        className="text-[11px] font-bold tracking-[0.07em] uppercase text-ink-muted"
      >
        Tracking events
      </h3>
      <ol aria-labelledby={headingId} className="mt-2.5 flex flex-col gap-2.5">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-1 block h-[9px] w-[9px] flex-none rounded-full ${
                event.isException ? 'bg-red-600' : 'bg-brand-600'
              }`}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span
                className={`text-[13px] leading-snug ${
                  event.isException ? 'text-red-600' : 'text-ink'
                }`}
              >
                {event.label}
              </span>
              <span className="text-xs leading-snug text-ink-muted">
                {event.occurredAtLabel}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {EVENT_NOTE}
      </p>
    </div>
  );
}
