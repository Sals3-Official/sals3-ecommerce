import type { BuyerOrderPackage } from '@/lib/orders/contracts';
import OrderLineRow from '@/components/orders/OrderLineRow';
import OrderStatusPill from '@/components/orders/OrderStatusPill';
import OrderTrackingFeed from '@/components/orders/OrderTrackingFeed';

/**
 * A package: one courier, one tracking number, one status.
 *
 * ## Why the package is the grouping unit
 *
 * Marketplaces usually group a buyer's rows by seller store. Sals3 has no
 * buyer-facing seller — a checkout splits into fulfillment groups, one per
 * supplier connection — and naming the supplier to a buyer would leak the
 * sourcing side of the business into the shopping side. The package is the
 * honest unit anyway: it is the thing that has a courier, a number to track,
 * and a status of its own.
 *
 * ## Why `Track package` is blocked even with a tracking number
 *
 * No carrier deep-link is confirmed for CJPacket, and a guessed URL sends a
 * buyer to a page that may not resolve. The number itself is right there in the
 * mono chip to paste into the carrier's own site; the button states plainly
 * that Sals3 has no link rather than pretending to one.
 */

const TRACK_BUTTON =
  'inline-flex min-h-[34px] cursor-not-allowed items-center rounded-lg border border-border bg-white px-3 text-xs font-bold text-ink-subtle';

function trackReason(pkg: BuyerOrderPackage): string {
  if (pkg.trackingNumber === null) return 'Tracking not issued yet';

  return 'No carrier tracking link yet — copy the number';
}

type OrderPackageBlockProps = {
  package: BuyerOrderPackage;
  /** The detail page adds the tracking feed; the list card does not. */
  showEvents?: boolean;
  /** Needed for the per-line review link, which lives under the order. */
  orderNumber: string;
  /** Detail page only — see `OrderLineRow`'s own note. */
  showReviewControl?: boolean;
};

export default function OrderPackageBlock({
  package: pkg,
  showEvents = false,
  orderNumber,
  showReviewControl = false,
}: OrderPackageBlockProps) {
  const headingId = `package-${pkg.id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-sunken px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 id={headingId} className="text-xs font-bold text-ink">
            {pkg.label}
          </h3>
          <span aria-hidden className="hidden text-border-strong sm:inline">
            |
          </span>
          <span className="text-[13px] text-ink-muted">{pkg.carrier}</span>
          {pkg.trackingNumber === null ? null : (
            <span className="rounded-md border border-border bg-white px-2 py-0.5 font-mono text-xs text-ink">
              {pkg.trackingNumber}
            </span>
          )}
          <span className="text-[13px] text-ink-muted">{pkg.arrivalLabel}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <OrderStatusPill tone={pkg.tone}>{pkg.statusLabel}</OrderStatusPill>
          <button type="button" disabled aria-disabled className={TRACK_BUTTON}>
            {trackReason(pkg)}
          </button>
        </div>
      </div>

      <ul aria-labelledby={headingId} className="divide-y divide-border">
        {pkg.lines.map((line) => (
          <OrderLineRow
            key={line.id}
            line={line}
            compact={showEvents}
            orderNumber={orderNumber}
            // The package's own state, not the order's rollup: one order can
            // hold a delivered package beside one still moving, and the review
            // control belongs to the item that actually arrived.
            parcelDelivered={pkg.state === 'DELIVERED'}
            showReviewControl={showReviewControl}
          />
        ))}
      </ul>

      {showEvents ? (
        <OrderTrackingFeed
          events={pkg.events}
          headingId={`${headingId}-events`}
        />
      ) : null}
    </div>
  );
}
