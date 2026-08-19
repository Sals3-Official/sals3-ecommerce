import type { BuyerOrder } from '@/lib/orders/contracts';
import OrderCard from '@/components/orders/OrderCard';
import OrdersEmptyPanel from '@/components/orders/OrdersEmptyPanel';
import OrdersFilteredPanel from '@/components/orders/OrdersFilteredPanel';
import { hasActiveFilters, type OrdersQuery } from '@/lib/orders/query';

/**
 * Cards, or the right explanation for their absence.
 *
 * The branch lives here rather than in `page.tsx` because it is the one place
 * the difference between "you have no orders" and "your filters hid them" is
 * decided, and getting it backwards is the most alarming thing this feature
 * can do to somebody looking for an order they are worried about. One
 * predicate — is anything narrowing the list — chooses between them.
 */

type OrdersResultsProps = {
  orders: readonly BuyerOrder[];
  query: OrdersQuery;
  laneLabel: string;
  rangeLabel: string;
  statusLabel: string;
};

export default function OrdersResults({
  orders,
  query,
  laneLabel,
  rangeLabel,
  statusLabel,
}: OrdersResultsProps) {
  if (orders.length > 0) {
    return (
      <section aria-label="Your orders" className="mt-4 flex flex-col gap-3.5">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </section>
    );
  }

  if (hasActiveFilters(query)) {
    return (
      <OrdersFilteredPanel
        query={query}
        laneLabel={laneLabel}
        rangeLabel={rangeLabel}
        statusLabel={statusLabel}
      />
    );
  }

  return <OrdersEmptyPanel />;
}
