import { formatMoney, percentOff, type Money } from '@/lib/money';

type ProductPriceDisplayProps = {
  price: Money;
  /**
   * Only ever an evidence-backed comparison price. Absent means none exists, and
   * no strikethrough or percent-off badge renders — which is the current state
   * of every product, because Sals3 publishes no was/now pair (ADR-003).
   */
  oldPrice?: Money;
};

/**
 * The price line, shared by the server price box and the client purchase panel
 * so a variant switch cannot render money differently from the initial paint.
 */
export default function ProductPriceDisplay({
  price,
  oldPrice,
}: ProductPriceDisplayProps) {
  const hasDiscount =
    oldPrice !== undefined && oldPrice.amountMinor > price.amountMinor;

  return (
    <div className="flex items-baseline gap-2.5">
      <span className="font-display text-3xl font-semibold tracking-tight text-ink">
        {formatMoney(price)}
      </span>
      {hasDiscount ? (
        <>
          <span className="text-sm text-ink-faint line-through">
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
