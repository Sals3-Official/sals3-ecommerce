import Link from 'next/link';
import type { BuyerOrder } from '@/lib/orders/contracts';
import CopyOrderNumber from '@/components/orders/CopyOrderNumber';
import OrderActions from '@/components/orders/OrderActions';
import OrderPackageBlock from '@/components/orders/OrderPackageBlock';
import OrderStatusPill from '@/components/orders/OrderStatusPill';
import RateReviewButton from '@/components/orders/RateReviewButton';
import maskBuyerName from '@/lib/orders/buyer-name';
import reviewableLinesOf from '@/lib/orders/reviewable';

/**
 * One order, as a ledger.
 *
 * Layout A of the two candidates in the design handoff, chosen 2026-08-19; the
 * `Record` split-rail candidate was not built. A statement reads top to bottom
 * — what it is, where it is, what is in each package, what to do — and a
 * one-package order does not pay for a right rail it cannot fill.
 *
 * ## The exception edge
 *
 * An order carrying an exception takes a 3px red inset edge, and the sentence
 * under the header names both sources. The edge is never the only signal: the
 * pill carries a word, and rule "status is never colour alone" is what makes
 * the card legible to a buyer who cannot see the red.
 *
 * ## Why the header repeats the total
 *
 * A buyer scanning a list is answering "what did this cost" as often as "where
 * is it". Putting the charged total in the header strip means the answer is one
 * glance rather than an expand, and it is the same string the detail page's
 * payment card prints, produced once on the server.
 *
 * ## The one review control the card carries (owner decision 2026-08-25)
 *
 * This card used to print nothing about reviews at all — the argument being that
 * a payment-and-fulfilment statement should stay one, with the review control a
 * click away on the detail page. The owner asked for it here, on the Completed
 * lane, and that is the right call for the actual job: a buyer who has just had
 * three parcels arrive is on this list, not on three detail pages.
 *
 * It is **one** order-level button and never a per-line rating. The footer is a
 * row of order actions and three review buttons in it would read as three
 * different things to do, so the count goes in the label and the dialog holds
 * the items. Nothing about the card's arithmetic moved.
 *
 * `reviewableLinesOf` returns nothing unless the portal marked a line
 * reviewable, so the button is absent on every order that has not been
 * delivered, is past its window, or is already reviewed — and this component
 * re-derives none of those rules.
 *
 * **A delivered order can still show no button, and that is not a bug here.**
 * The portal answers `reviewable: false` for every line while
 * `sals3_product_reviews` does not exist (its DDL arrives through a
 * `workflow_dispatch`, not through a deploy), because it would rather hide a
 * control that would have worked than offer one that cannot. Drawing the button
 * anyway would open a dialog whose `Submit` could only fail.
 */

type OrderCardProps = {
  order: BuyerOrder;
};

export default function OrderCard({ order }: OrderCardProps) {
  const detailHref = `/orders/${order.number}`;
  const reviewable = reviewableLinesOf(order);
  const actions = order.actions.map((action) => {
    if (action.id !== 'details') return action;

    // Two filled buttons side by side compete, and the one with a deadline
    // should win: a review closes after the window, while the detail page is
    // there for as long as the order is. So `View order details` steps down to
    // the outline treatment exactly when the review button is present, and
    // takes the fill back on every other card.
    const demoted = reviewable.length > 0 && action.kind === 'primary';

    return {
      ...action,
      href: detailHref,
      ...(demoted ? { kind: 'secondary' as const } : {}),
    };
  });

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white ${
        order.hasException
          ? 'border-border-strong shadow-[inset_3px_0_0_var(--color-red-600)]'
          : 'border-border'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold tracking-[0.01em] whitespace-nowrap text-ink">
              <Link href={detailHref} className="text-ink hover:text-brand-600">
                {order.number}
              </Link>
            </h2>
            <CopyOrderNumber value={order.number} />
          </div>
          <p className="mt-1.5 text-[13px] text-ink-muted">{order.metaLine}</p>
        </div>
        <div className="flex w-full items-center justify-between gap-3.5 sm:w-auto sm:justify-end">
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase whitespace-nowrap text-ink-muted">
              Total charged
            </p>
            <p className="mt-0.5 font-display text-[19px] font-semibold text-ink">
              {order.totalChargedLabel}
            </p>
          </div>
          <OrderStatusPill tone={order.tone}>
            {order.statusLabel}
          </OrderStatusPill>
        </div>
      </div>

      <p className="border-b border-border px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
        {order.statusDetail}
      </p>

      {order.packages.map((pkg) => (
        <OrderPackageBlock
          key={pkg.id}
          package={pkg}
          orderNumber={order.number}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3.5 border-t border-border px-4 py-3">
        <p className="text-xs text-ink-muted">{order.footNote}</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <RateReviewButton
            orderNumber={order.number}
            lines={reviewable}
            maskedName={maskBuyerName(order.shipTo.name)}
          />
          <OrderActions actions={actions} />
        </div>
      </div>
    </article>
  );
}
