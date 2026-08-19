import type { BuyerOrderShipTo } from '@/lib/orders/contracts';

/**
 * The destination, unmasked.
 *
 * This is the buyer's own address on the buyer's own authenticated page, so
 * masking it would hide information from the only person entitled to it while
 * protecting nobody. The seller-side surface is the one that masks — different
 * reader, different rule.
 *
 * The closing sentence exists because the address looks editable and is not:
 * it was frozen onto the order at payment, the supplier order was placed
 * against it, and a field here would imply Sals3 can still change where a
 * parcel already in the post is going.
 */

type OrderShipToProps = {
  shipTo: BuyerOrderShipTo;
};

export default function OrderShipTo({ shipTo }: OrderShipToProps) {
  return (
    <section
      aria-labelledby="order-ship-to"
      className="rounded-xl border border-border bg-white px-4.5 py-4"
    >
      <h2
        id="order-ship-to"
        className="text-[11px] font-bold tracking-[0.07em] uppercase text-ink-muted"
      >
        Ship to
      </h2>
      <p className="mt-2 font-display text-[15px] font-semibold text-ink">
        {shipTo.name}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-balance text-ink">
        {shipTo.address}
      </p>
      <p className="mt-1 text-[13px] text-ink-muted">{shipTo.contact}</p>
      <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
        Frozen at payment. A change of address needs support, not an edit here.
      </p>
    </section>
  );
}
