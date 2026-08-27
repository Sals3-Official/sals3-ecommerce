import {
  canCheckOutTo,
  describeCheckoutReadyDestinations,
  type Destination,
} from '@/lib/destination/destinations';

/**
 * Says that an order cannot be placed to the buyer's destination, before the
 * buyer spends anything on finding out.
 *
 * ## Why it renders nothing most of the time
 *
 * The two destinations checkout accepts need no banner — for those buyers the
 * cart is already true. This is a statement about a gap, so it exists only
 * while there is one, and `canCheckOutTo` is the same gate the address form
 * enforces rather than a second copy of the rule.
 *
 * ## Why the countries are not written out
 *
 * `describeCheckoutReadyDestinations()` builds the sentence from
 * `CHECKOUT_ALLOWED_COUNTRIES`. A hard-coded "Australia and the Philippines"
 * would be a second place to edit on the day a third country opens, and the
 * one that gets missed — `destinations.ts` records that the two lists must
 * never be collapsed, and this is the copy side of the same rule.
 *
 * ## Why the wording is this flat
 *
 * ADR-003 §1 allows "ships to supported countries" and forbids "ships
 * worldwide". So: no date, no "coming soon", nothing about cost, duty, tax or
 * how long anything takes — none of which this codebase knows. It is the
 * register `OrdersHonestyNote` uses on the orders page: an absence stated
 * plainly beats an apology, because an apology implies a fix is scheduled and
 * none is.
 */
export default function DestinationNotice({
  destination,
}: {
  destination: Destination;
}) {
  if (canCheckOutTo(destination.code)) return null;

  return (
    <section className="mb-5 rounded-xl border border-border-strong bg-white px-5 py-4">
      <h2 className="text-xs font-bold tracking-[0.07em] text-ink-muted uppercase">
        Where orders can be placed
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
        {destination.isGlobal
          ? `Checkout takes a delivery address in ${describeCheckoutReadyDestinations()}. No other destination can be entered yet.`
          : `Checkout does not take a ${destination.proseLabel ?? destination.label} delivery address yet. Orders can be placed to ${describeCheckoutReadyDestinations()}.`}
      </p>
    </section>
  );
}
