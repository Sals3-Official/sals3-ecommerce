import {
  PARCEL_LIFECYCLE_STATES,
  isExceptionState,
  type OrderStatusTone,
  type ParcelLifecycleState,
} from './contracts';

/**
 * Buyer lanes, and the seven status words a buyer is ever shown.
 *
 * ## Why these are not the portal's lanes
 *
 * The portal's workspace has `unpaid`, `to-process` and `Needs attention`
 * because those are a seller's queues. A buyer's questions are narrower — have
 * I paid, is it being made, is it moving, did it arrive, is my money coming
 * back — so the lanes are named for those, and there is no attention lane: an
 * exception surfaces inside whichever lane the order already sits in.
 *
 * ## Why `all` and `to pay` carry no count
 *
 * A count is a claim that something needs doing. `all` measures nothing, and a
 * buyer with an abandoned checkout has no work waiting on them either. The
 * portal holds the same rule through `LANES[].showsCount`.
 */

export const BUYER_LANE_KEYS = [
  'all',
  'to-pay',
  'to-ship',
  'shipping',
  'completed',
  'returns',
] as const;

export type BuyerLaneKey = (typeof BUYER_LANE_KEYS)[number];

export const DEFAULT_LANE: BuyerLaneKey = 'all';

export type BuyerLane = {
  key: BuyerLaneKey;
  label: string;
  showsCount: boolean;
  states: readonly ParcelLifecycleState[];
};

export const BUYER_LANES: readonly BuyerLane[] = [
  {
    key: 'all',
    label: 'All',
    showsCount: false,
    states: PARCEL_LIFECYCLE_STATES,
  },
  {
    key: 'to-pay',
    label: 'To pay',
    showsCount: false,
    states: ['DRAFT', 'CHECKOUT_PENDING', 'PAYMENT_PENDING', 'PAYMENT_FAILED'],
  },
  {
    key: 'to-ship',
    label: 'To ship',
    showsCount: true,
    states: [
      'PAID',
      'FULFILLMENT_QUEUED',
      'CJ_ORDER_CREATED',
      'CJ_PAYMENT_PENDING',
      'FULFILLING',
    ],
  },
  {
    key: 'shipping',
    label: 'Shipping',
    showsCount: true,
    states: ['SHIPPED'],
  },
  {
    key: 'completed',
    label: 'Completed',
    showsCount: true,
    states: ['DELIVERED'],
  },
  {
    key: 'returns',
    label: 'Cancelled & refunds',
    showsCount: true,
    states: [
      'CANCEL_REQUESTED',
      'CANCELLED',
      'REFUND_PENDING',
      'REFUNDED',
      'RETURN_IN_PROGRESS',
      'RETURNED',
    ],
  },
];

/**
 * Where an exception lands.
 *
 * The four exception states have no lane of their own, but an order in one of
 * them still has to appear somewhere or it vanishes from the list entirely.
 * Each is filed under the lane it interrupted: a supplier problem is still work
 * in preparation, and a delivery problem is still a parcel in the post.
 */
const EXCEPTION_LANE: Record<string, BuyerLaneKey> = {
  FULFILLMENT_FAILED: 'to-ship',
  AWAITING_SUPPLIER_FUNDS: 'to-ship',
  DELIVERY_EXCEPTION: 'shipping',
  TRACKING_CONFLICT: 'shipping',
};

export function laneOf(state: ParcelLifecycleState): BuyerLaneKey {
  if (isExceptionState(state)) {
    return EXCEPTION_LANE[state] ?? 'to-ship';
  }

  const lane = BUYER_LANES.find(
    (candidate) => candidate.key !== 'all' && candidate.states.includes(state),
  );

  return lane?.key ?? 'to-ship';
}

export function isBuyerLaneKey(value: string): value is BuyerLaneKey {
  return (BUYER_LANE_KEYS as readonly string[]).includes(value);
}

/**
 * The status filter's vocabulary — seven words, and the states behind each.
 *
 * `AWAITING_SUPPLIER_FUNDS` is folded into "Needs attention" rather than
 * getting a word of its own. Explaining a supplier's wallet balance to a buyer
 * would be both meaningless and none of their business; the sentence beside the
 * label says preparing is taking longer than expected and routes to support.
 */
export const BUYER_STATUS_KEYS = [
  'any',
  'unpaid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunding',
  'attention',
] as const;

export type BuyerStatusKey = (typeof BUYER_STATUS_KEYS)[number];

export const DEFAULT_STATUS: BuyerStatusKey = 'any';

export type BuyerStatusOption = {
  key: BuyerStatusKey;
  label: string;
  tone: OrderStatusTone;
  states: readonly ParcelLifecycleState[];
};

export const BUYER_STATUSES: readonly BuyerStatusOption[] = [
  {
    key: 'any',
    label: 'Any status',
    tone: 'neutral',
    states: PARCEL_LIFECYCLE_STATES,
  },
  {
    key: 'unpaid',
    label: 'Payment not completed',
    tone: 'neutral',
    states: ['DRAFT', 'CHECKOUT_PENDING', 'PAYMENT_PENDING', 'PAYMENT_FAILED'],
  },
  {
    key: 'preparing',
    label: 'Being prepared',
    tone: 'neutral',
    states: [
      'PAID',
      'FULFILLMENT_QUEUED',
      'CJ_ORDER_CREATED',
      'CJ_PAYMENT_PENDING',
      'FULFILLING',
    ],
  },
  { key: 'shipped', label: 'Shipped', tone: 'info', states: ['SHIPPED'] },
  {
    key: 'delivered',
    label: 'Delivered',
    tone: 'delivered',
    states: ['DELIVERED'],
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    tone: 'neutral',
    states: ['CANCEL_REQUESTED', 'CANCELLED'],
  },
  {
    key: 'refunding',
    label: 'Refund in progress',
    tone: 'neutral',
    states: ['REFUND_PENDING', 'REFUNDED', 'RETURN_IN_PROGRESS', 'RETURNED'],
  },
  {
    key: 'attention',
    label: 'Needs attention',
    tone: 'alert',
    states: [
      'FULFILLMENT_FAILED',
      'AWAITING_SUPPLIER_FUNDS',
      'DELIVERY_EXCEPTION',
      'TRACKING_CONFLICT',
    ],
  },
];

export function isBuyerStatusKey(value: string): value is BuyerStatusKey {
  return (BUYER_STATUS_KEYS as readonly string[]).includes(value);
}

export function statusMatches(
  key: BuyerStatusKey,
  state: ParcelLifecycleState,
): boolean {
  if (key === 'any') return true;

  const option = BUYER_STATUSES.find((candidate) => candidate.key === key);

  return option ? option.states.includes(state) : true;
}
