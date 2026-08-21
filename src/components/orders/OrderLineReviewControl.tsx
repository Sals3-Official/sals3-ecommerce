import Link from 'next/link';
import StarRating from '@/components/product/StarRating';
import type { BuyerOrderLine } from '@/lib/orders/contracts';

type OrderLineReviewControlProps = {
  line: BuyerOrderLine;
  orderNumber: string;
  parcelDelivered: boolean;
};

/**
 * The review entry point on one order line — and the three answers it can give.
 *
 * ## Why three states and not a disabled button
 *
 * A control that is present but dead tells a buyer nothing about why. The
 * package still moving, the review already written, and the window closed are
 * three different pieces of news, and each gets its own sentence:
 *
 * - **delivered, unreviewed** — the link, the only case with an action.
 * - **already reviewed** — their own rating, with no invitation to redo it.
 * - **not delivered** — one line saying they can review it after it arrives.
 *
 * ## `reviewable` is not re-derived here
 *
 * The portal decides eligibility in a single `WHERE`: the line's own parcel
 * `DELIVERED`, inside the window, not already reviewed. This component reads
 * that boolean and never recomputes it, because this side cannot see the parcel
 * state and a second implementation of the rule would eventually disagree with
 * the first.
 *
 * `parcelDelivered` is passed separately only to choose the *wording* for the
 * absent case. It never grants anything: a delivered parcel whose line is not
 * `reviewable` still gets no link, which is what makes the closed-window and
 * already-reviewed cases safe to distinguish.
 */
export default function OrderLineReviewControl({
  line,
  orderNumber,
  parcelDelivered,
}: OrderLineReviewControlProps) {
  if (line.review !== undefined) {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span>You rated this</span>
        <StarRating
          rating={line.review.rating}
          size="sm"
          label={`${line.review.rating} out of 5`}
        />
      </p>
    );
  }

  if (line.reviewable) {
    return (
      <Link
        href={`/orders/${encodeURIComponent(orderNumber)}/review/${encodeURIComponent(line.id)}`}
        prefetch={false}
        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-[13px] font-semibold text-white transition hover:bg-brand-900 hover:no-underline"
      >
        <StarRating rating={1} size="sm" label="" />
        Write a review
      </Link>
    );
  }

  if (!parcelDelivered) {
    return (
      <p className="mt-2 text-xs text-ink-subtle">
        You can review this after it is delivered.
      </p>
    );
  }

  // Delivered, not reviewed, and still not offered — the window has closed.
  // Said plainly rather than silently omitted: a buyer who meant to review this
  // and finds nothing should learn that the chance has passed, not wonder
  // whether the page is broken.
  return (
    <p className="mt-2 text-xs text-ink-subtle">
      Reviews for this item are closed.
    </p>
  );
}
