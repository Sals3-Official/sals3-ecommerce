import Link from 'next/link';
import type { BuyerOrder } from '@/lib/orders/contracts';
import CopyOrderNumber from '@/components/orders/CopyOrderNumber';
import OrderActions from '@/components/orders/OrderActions';
import OrderPackageBlock from '@/components/orders/OrderPackageBlock';
import OrderStatusPill from '@/components/orders/OrderStatusPill';

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
 */

type OrderCardProps = {
  order: BuyerOrder;
};

export default function OrderCard({ order }: OrderCardProps) {
  const detailHref = `/orders/${order.number}`;
  const actions = order.actions.map((action) =>
    action.id === 'details' ? { ...action, href: detailHref } : action,
  );

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
        <OrderActions actions={actions} />
      </div>
    </article>
  );
}
