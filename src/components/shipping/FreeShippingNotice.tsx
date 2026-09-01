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
 * and the cart summary both render this. Deliberately the same teal card
 * treatment `CheckoutFreeShippingProgress` already uses
 * (`border-teal-500/45 bg-teal-500/8`), so the offer is visually one thing a
 * buyer recognises three times rather than three different-looking mentions
 * of it.
 *
 * ## Why this now can carry an amount, when it deliberately did not before
 *
 * Neither the PDP nor the cart has a *confirmed* address, and the original
 * version of this component reasoned from that straight to showing no figure
 * at all — the same caution `CartPageClient`'s own comment still states.
 * `resolveDestination()`'s geo-IP guess was ruled "fine for the approximate
 * FX figure, not sound enough to anchor a specific dollar threshold claim
 * on".
 *
 * The owner's read is that an unlabelled badge does not entice the way a
 * concrete "add $X more" does, and that the same guess is already good enough
 * to hang a priced figure on right next to this card — `IndicativePriceLine`
 * does exactly that with the subtotal. So this follows that precedent rather
 * than overriding it: every figure built from `thresholdAmountMinor` is
 * introduced as "Estimated" and closes on "confirmed at checkout", the same
 * two-part discipline the FX line uses. Nothing here decides eligibility —
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
      return `Your cart already qualifies for free Standard delivery to ${destinationLabel}`;
    }

    return `Add ${formatMoney({
      amountMinor: remainingMinor,
      currency: subtotal.currency,
    })} more for free Standard delivery to ${destinationLabel}`;
  }

  const headline = headlineFor();

  const subline = hasEstimate
    ? 'Estimated for your likely destination — confirmed once your address is entered at checkout.'
    : 'Confirmed once your address is known, at checkout.';

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-teal-500/45 bg-teal-500/8 px-4 py-3 ${
        emphasize ? 'animate-free-shipping-glow' : ''
      } ${className}`}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-500">
        <TruckIcon width={17} height={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p aria-live="polite" className="text-sm font-bold text-teal-500">
          {headline}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
          {subline}
        </p>
        {hasEstimate ? (
          <div
            role="progressbar"
            aria-label={`Estimated progress toward free Standard delivery to ${destinationLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken-strong"
          >
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
