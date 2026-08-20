import { formatMoney, percentOff, type Money } from '@/lib/money';

type ProductPriceDisplayProps = {
  price: Money;
  /**
   * Only ever an evidence-backed comparison price. Absent means none exists, and
   * no strikethrough or percent-off badge renders — which is the current state
   * of every product, because Sals3 publishes no was/now pair (ADR-003).
   */
  oldPrice?: Money;
  /**
   * A qualifier rendered beside the price, e.g. "From", when the figure is the
   * floor of a range rather than the price of a chosen variant.
   *
   * Deliberately a separate, smaller, **non-currency** token: the price block
   * must contain exactly one currency-formatted string, because a second one is
   * what a price extractor can pick up instead of the real offer price. That is
   * also why the range itself is never rendered — it stays machine-readable in
   * the page's `AggregateOffer`.
   */
  fromLabel?: string;
};

/**
 * The price line, shared by the server price box and the client purchase panel
 * so a variant switch cannot render money differently from the initial paint.
 */
export default function ProductPriceDisplay({
  price,
  oldPrice,
  fromLabel,
}: ProductPriceDisplayProps) {
  const hasDiscount =
    oldPrice !== undefined && oldPrice.amountMinor > price.amountMinor;

  return (
    <div className="flex items-baseline gap-2.5">
      {fromLabel === undefined ? null : (
        <span className="font-display text-lg font-semibold text-ink-muted">
          {fromLabel}
        </span>
      )}
      <span className="font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
        {formatMoney(price)}
      </span>
      {hasDiscount ? (
        <>
          <span className="text-sm text-ink-subtle line-through">
            {formatMoney(oldPrice)}
          </span>
          <span className="text-sm font-bold text-deal">
            {percentOff(oldPrice.amountMinor, price.amountMinor)}
          </span>
        </>
      ) : null}
    </div>
  );
}
