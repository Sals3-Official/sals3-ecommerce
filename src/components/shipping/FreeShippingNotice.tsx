'use client';

import { TruckIcon } from '@/components/icons/Icon';
import { formatMoney } from '@/lib/money';
import { useCart } from '@/components/cart/CartProvider';

type FreeShippingNoticeProps = {
  className?: string;
  /**
   * The free-Standard-delivery threshold for the buyer's likely destination,
   * in USD minor units — resolved server-side from
   * `fetchFreeShippingThresholds()` against `resolveDestination()`'s guess.
   * Absent means no destination-scoped estimate is available (Global, an
   * unmeasured country, or the Portal read failed), and the notice falls back
   * to its original amount-free copy.
   */
  thresholdAmountMinor?: number;
  /** The destination name to say the estimate is for, e.g. "Australia". */
  destinationLabel?: string;
  /**
   * Pulses the card, PDP-only — see `ProductRecordPanel` for why the card
   * that sits right before Add to Cart / Buy Now earns the extra emphasis and
   * the cart's copy of this component does not.
   */
  emphasize?: boolean;
};

/**
 * The one visual language for "free shipping exists" everywhere it can be
 * shown before checkout knows a destination for certain -- the PDP buy rail
 * and the cart summary both render this. Deliberately the same brand-blue
 * card treatment `CheckoutFreeShippingProgress` already uses
 * (`border-brand-600/45 bg-brand-600/8`), so the offer is visually one thing
 * a buyer recognises three times rather than three different-looking
 * mentions of it.
 *
 * ## Why this carries an amount but no longer names a country
 *
 * Neither the PDP nor the cart has a *confirmed* address. The dollar figure
 * still hangs off `resolveDestination()`'s geo-IP guess — `IndicativePriceLine`
 * does the same with the subtotal, and every figure built from
 * `thresholdAmountMinor` is introduced as "Estimated" and closes on
 * "confirmed at checkout", the same two-part discipline the FX line uses.
 *
 * A named country in the sentence itself was tried and reversed (2026-09-01,
 * owner decision): stating a specific destination out loud reads as a claim
 * about *where this buyer is*, which is a stronger assertion than "here is
 * roughly what this could cost" and not one a geo-IP guess should make on the
 * page's behalf. `destinationLabel` stays a prop — it still gates showing an
 * estimate at all, paired with the threshold it was resolved alongside — it
 * is simply no longer printed. Nothing here decides eligibility —
 * `CheckoutFreeShippingProgress`, fed by the Portal's real freight quote,
 * still owns that.
 */
export default function FreeShippingNotice({
  className = '',
  thresholdAmountMinor,
  destinationLabel,
  emphasize = false,
}: FreeShippingNoticeProps) {
  const { subtotal } = useCart();
  const hasEstimate =
    thresholdAmountMinor !== undefined && destinationLabel !== undefined;
  const remainingMinor = hasEstimate
    ? Math.max(0, thresholdAmountMinor - subtotal.amountMinor)
    : 0;
  const eligible = hasEstimate && remainingMinor === 0;
  const percent = hasEstimate
    ? Math.min(
        100,
        Math.round((subtotal.amountMinor / thresholdAmountMinor) * 100),
      )
    : 0;

  function headlineFor(): string {
    if (!hasEstimate) return 'Free Standard delivery on qualifying orders';

    if (eligible) {
      return 'Your cart already qualifies for free Standard delivery';
    }

    return `Add ${formatMoney({
      amountMinor: remainingMinor,
      currency: subtotal.currency,
    })} more for free Standard delivery`;
  }

  const headline = headlineFor();

  const subline = hasEstimate
    ? 'Estimated for your likely destination — confirmed once your address is entered at checkout.'
    : 'Confirmed once your address is known, at checkout.';

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-brand-600/45 bg-brand-600/8 px-4 py-3 ${
        emphasize ? 'animate-free-shipping-glow' : ''
      } ${className}`}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600/15 text-brand-600">
        <TruckIcon width={17} height={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p aria-live="polite" className="text-sm font-bold text-brand-600">
          {headline}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
          {subline}
        </p>
        {hasEstimate ? (
          <div
            role="progressbar"
            // No destination named here either — the same reasoning as the
            // headline applies to what a screen reader announces, not only to
            // what a sighted reader sees.
            aria-label="Estimated progress toward free Standard delivery"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken-strong"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
