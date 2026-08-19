import type { BuyerOrder } from '@/lib/orders/contracts';
import { countLabel } from '@/lib/orders/format';

/**
 * What Stripe charged, as a description list.
 *
 * ## Why `Tax` has a row at all
 *
 * `automatic_tax` is off. Omitting the line would let a buyer assume tax was
 * included in the total; printing "Not calculated by Sals3" says what actually
 * happened, and is the same wording the checkout receipt uses so the two
 * documents agree.
 *
 * ## Why the Stripe reference is truncated but present
 *
 * It is the string support asks for. Full ids in a screenshot are more exposure
 * than the buyer intends, and the middle of a `cs_live_…` id carries no
 * recognition value, so the ends are enough to match a record against.
 *
 * A `<dl>` and not a table: these are label/value pairs, not a grid, and every
 * value is a string produced by `formatMoney` upstream. Nothing here computes.
 */

type OrderPaymentSummaryProps = {
  order: BuyerOrder;
};

export default function OrderPaymentSummary({
  order,
}: OrderPaymentSummaryProps) {
  return (
    <section
      aria-labelledby="order-payment"
      className="rounded-xl border border-border bg-white px-4.5 py-4"
    >
      <h2
        id="order-payment"
        className="text-[11px] font-bold tracking-[0.07em] uppercase text-ink-muted"
      >
        Payment
      </h2>
      <dl className="mt-3 flex flex-col gap-2">
        <div className="flex justify-between gap-3 text-[13px]">
          <dt className="text-ink-muted">{order.itemsLabel}</dt>
          <dd className="text-ink">{order.subtotalLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 text-[13px]">
          <dt className="text-ink-muted">
            Delivery — {countLabel(order.packages.length, 'package')}
          </dt>
          <dd className="text-ink">{order.shippingLabel}</dd>
        </div>
        <div className="flex justify-between gap-3 text-[13px]">
          <dt className="text-ink-muted">Tax</dt>
          <dd className="text-ink-muted">Not calculated by Sals3</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
          <dt className="text-[13px] font-bold text-ink">Total charged</dt>
          <dd className="font-display text-[22px] font-semibold text-ink">
            {order.totalChargedLabel}
          </dd>
        </div>
      </dl>
      <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
        {order.paymentLine}
      </p>
      <p className="mt-1.5 font-mono text-[11px] break-all text-ink-muted">
        {order.stripeReferenceLabel}
      </p>
    </section>
  );
}
