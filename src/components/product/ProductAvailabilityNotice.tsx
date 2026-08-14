import type { ProductAvailability } from '@/lib/product-detail';

type ProductAvailabilityNoticeProps = {
  availability?: ProductAvailability;
};

/**
 * Stock, as an evidence statement rather than a number.
 *
 * There is **no quantity anywhere in this component or its contract**, on
 * purpose. Sals3 observes a supplier's reported inventory at a point in time; it
 * does not hold the stock. "Only 3 left" would be a claim about a warehouse
 * nobody here controls, and urgency copy built on it would be a claim about a
 * claim.
 *
 * `UNKNOWN` and absent both render **nothing**. That is the honest reading of
 * "no fresh observation exists", and it is also the common case: the portal
 * only records `AVAILABLE` when observed inventory is positive *and* recent.
 * A green "in stock" badge on unknown evidence is the single most damaging
 * thing this component could do.
 */
export default function ProductAvailabilityNotice({
  availability,
}: ProductAvailabilityNoticeProps) {
  if (availability === undefined || availability === 'UNKNOWN') {
    return null;
  }

  const isAvailable = availability === 'AVAILABLE';

  return (
    <p
      className={`flex items-center gap-1.5 text-sm ${
        isAvailable ? 'text-teal-500' : 'text-red-600'
      }`}
    >
      {/* Icon plus words: the state is never carried by colour alone. */}
      <span aria-hidden="true">{isAvailable ? '●' : '✕'}</span>
      {isAvailable
        ? 'In stock with the supplier'
        : 'Currently unavailable from the supplier'}
    </p>
  );
}
