import {
  DEFAULT_LANE,
  DEFAULT_STATUS,
  isBuyerLaneKey,
  isBuyerStatusKey,
  type BuyerLaneKey,
  type BuyerStatusKey,
} from './lanes';

/**
 * `/orders` list state, in the URL and nowhere else.
 *
 * A lane, a search, a range and a status are all things a buyer might want to
 * send to support or come back to from history, so they are query parameters
 * rather than client state, and the tabs and chips are `next/link` anchors
 * rather than buttons. That also keeps the whole list a Server Component.
 *
 * ## Security posture
 *
 * Every value is allow-listed, not sanitised: `lane`, `range` and `status` must
 * match a known key or they fall back to the default, and `page` must parse to
 * a positive integer. A repeated parameter (`?lane=all&lane=x`) arrives as an
 * array and is rejected outright rather than resolved to its first element,
 * matching `post-login-redirect.ts`. `q` is the one free-text value; it is only
 * ever compared against order text server-side and re-rendered by React, which
 * escapes it — it never reaches a URL, a redirect, or a query builder.
 *
 * ## Why defaults drop out of the URL
 *
 * `buildOrdersQueryString` passes `null` for a default so the key is removed,
 * the same semantics the portal's orders workspace uses. The default lane
 * therefore renders `/orders`, not `/orders?lane=all`, and one view has one
 * address instead of several.
 */

export const ORDERS_PATH = '/orders';

/** Cards per page. One number, used by the reader and the pager alike. */
export const ORDERS_PAGE_SIZE = 10;

export const ORDER_RANGE_KEYS = [
  'all',
  'last-30-days',
  'last-6-months',
  'this-year',
] as const;

export type OrderRangeKey = (typeof ORDER_RANGE_KEYS)[number];

export const DEFAULT_RANGE: OrderRangeKey = 'all';

export function isOrderRangeKey(value: string): value is OrderRangeKey {
  return (ORDER_RANGE_KEYS as readonly string[]).includes(value);
}

/**
 * `this-year` is labelled with the year it actually means. The design names
 * "2026" because that is when it was drawn; hard-coding it would quietly
 * mislabel the filter on 1 January.
 */
export function rangeLabel(key: OrderRangeKey, now: Date): string {
  switch (key) {
    case 'last-30-days':
      return 'Last 30 days';
    case 'last-6-months':
      return 'Last 6 months';
    case 'this-year':
      return String(now.getUTCFullYear());
    case 'all':
    default:
      return 'All time';
  }
}

export type OrdersQuery = {
  lane: BuyerLaneKey;
  q: string;
  range: OrderRangeKey;
  status: BuyerStatusKey;
  page: number;
};

export const DEFAULT_ORDERS_QUERY: OrdersQuery = {
  lane: DEFAULT_LANE,
  q: '',
  range: DEFAULT_RANGE,
  status: DEFAULT_STATUS,
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** A repeated parameter is ambiguous, so it is discarded rather than guessed. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Bounded so a pasted `?q=` of any length cannot become the page's content. */
const MAX_QUERY_LENGTH = 120;

export function parseOrdersQuery(params: RawSearchParams): OrdersQuery {
  const lane = single(params.lane);
  const range = single(params.range);
  const status = single(params.status);
  const rawPage = Number.parseInt(single(params.page) ?? '', 10);

  return {
    lane: lane !== undefined && isBuyerLaneKey(lane) ? lane : DEFAULT_LANE,
    q: (single(params.q) ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    range:
      range !== undefined && isOrderRangeKey(range) ? range : DEFAULT_RANGE,
    status:
      status !== undefined && isBuyerStatusKey(status)
        ? status
        : DEFAULT_STATUS,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

/**
 * Builds `?…` from a query, dropping every value that equals its default.
 * Returns `''` for the default view so callers can concatenate unconditionally.
 */
export function buildOrdersQueryString(query: OrdersQuery): string {
  const params = new URLSearchParams();

  if (query.lane !== DEFAULT_ORDERS_QUERY.lane) params.set('lane', query.lane);
  if (query.q !== '') params.set('q', query.q);
  if (query.range !== DEFAULT_ORDERS_QUERY.range)
    params.set('range', query.range);
  if (query.status !== DEFAULT_ORDERS_QUERY.status)
    params.set('status', query.status);
  if (query.page > 1) params.set('page', String(query.page));

  const search = params.toString();

  return search === '' ? '' : `?${search}`;
}

/**
 * A link to the same list with some values changed. Changing anything but the
 * page resets to page 1: page 4 of a different filter is a page that probably
 * does not exist, and landing on an empty one reads as "no orders".
 */
export function ordersHref(
  query: OrdersQuery,
  changes: Partial<OrdersQuery>,
): string {
  const next: OrdersQuery = {
    ...query,
    ...changes,
    ...(changes.page === undefined ? { page: 1 } : {}),
  };

  return `${ORDERS_PATH}${buildOrdersQueryString(next)}`;
}

/** True when anything narrows the list — decides empty vs filtered-empty. */
export function hasActiveFilters(query: OrdersQuery): boolean {
  return (
    query.lane !== DEFAULT_ORDERS_QUERY.lane ||
    query.q !== '' ||
    query.range !== DEFAULT_ORDERS_QUERY.range ||
    query.status !== DEFAULT_ORDERS_QUERY.status
  );
}
