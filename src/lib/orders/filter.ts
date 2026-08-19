import type { BuyerOrder } from './contracts';
import { BUYER_LANES, laneOf, statusMatches, type BuyerLaneKey } from './lanes';
import {
  ORDERS_PAGE_SIZE,
  type OrderRangeKey,
  type OrdersQuery,
} from './query';

/**
 * Lane, search, range and status, applied in one place.
 *
 * Pure and time-injected: `now` is a parameter rather than a `new Date()` inside
 * the function, so "last 30 days" is testable and so a render and its test can
 * agree about what today is.
 */

function rangeStart(range: OrderRangeKey, now: Date): Date | null {
  switch (range) {
    case 'last-30-days': {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 30);
      return start;
    }
    case 'last-6-months': {
      const start = new Date(now);
      start.setUTCMonth(start.getUTCMonth() - 6);
      return start;
    }
    case 'this-year':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    case 'all':
    default:
      return null;
  }
}

/**
 * What the search box reads. The order number and the product titles are what a
 * buyer actually holds; a carrier name or a status word would make the box
 * quietly duplicate the two selects beside it.
 */
function searchTextOf(order: BuyerOrder): string {
  return [
    order.number,
    ...order.packages.flatMap((pkg) => pkg.lines.map((line) => line.title)),
  ]
    .join(' ')
    .toLowerCase();
}

export function laneMatches(lane: BuyerLaneKey, order: BuyerOrder): boolean {
  return lane === 'all' || laneOf(order.state) === lane;
}

export function filterOrders(
  orders: readonly BuyerOrder[],
  query: OrdersQuery,
  now: Date,
): BuyerOrder[] {
  const start = rangeStart(query.range, now);
  const needle = query.q.toLowerCase();

  return orders.filter((order) => {
    if (!laneMatches(query.lane, order)) return false;
    if (!statusMatches(query.status, order.state)) return false;
    if (start !== null && new Date(order.placedAt) < start) return false;
    if (needle !== '' && !searchTextOf(order).includes(needle)) return false;

    return true;
  });
}

/**
 * Counts are computed against the lane filter only. Narrowing by search then
 * watching every tab's count collapse would make the tabs look like they had
 * lost the orders rather than the search having hidden them.
 */
export function laneCounts(
  orders: readonly BuyerOrder[],
  query: OrdersQuery,
  now: Date,
): Record<BuyerLaneKey, number> {
  const withoutLane = filterOrders(orders, { ...query, lane: 'all' }, now);

  return BUYER_LANES.reduce(
    (counts, lane) => ({
      ...counts,
      [lane.key]: withoutLane.filter((order) => laneMatches(lane.key, order))
        .length,
    }),
    {} as Record<BuyerLaneKey, number>,
  );
}

export type OrdersPage = {
  orders: BuyerOrder[];
  total: number;
  page: number;
  pageCount: number;
};

export function paginate(
  orders: readonly BuyerOrder[],
  page: number,
): OrdersPage {
  const pageCount = Math.max(1, Math.ceil(orders.length / ORDERS_PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), pageCount);
  const from = (current - 1) * ORDERS_PAGE_SIZE;

  return {
    orders: orders.slice(from, from + ORDERS_PAGE_SIZE),
    total: orders.length,
    page: current,
    pageCount,
  };
}
