/**
 * The buyer's view of an order.
 *
 * ## Why the storefront owns these types at all
 *
 * The portal is the system of record: `PARCEL_LIFECYCLE_STATES` and the lane
 * machine live in `sals3-portal/src/modules/orders/contracts.ts` (ADR-004 §2)
 * and nothing here may invent a state the portal does not publish. The two
 * repositories do not share a package, so the vocabulary is mirrored rather
 * than imported, and `contracts.test.ts` pins the mirror against the list
 * recorded here. A state added portal-side without landing here would drop out
 * of every lane at once, which is the failure this file exists to make loud.
 *
 * ## Why every money value is a string
 *
 * The buyer surface renders what Stripe charged. Amounts arrive already run
 * through `formatMoney` on the server, so no component multiplies, sums, or
 * rounds anything — the same rule the portal's order contracts hold. A
 * component that could do arithmetic is a component that can disagree with the
 * receipt.
 *
 * ## What is deliberately absent
 *
 * No supplier name, no connection name, no `S3V-` hash, no store grouping, no
 * rating or review. A buyer's grouping unit is the **package**, because that is
 * the thing with one courier, one tracking number and one status.
 */

import type {
  ProductDescriptionBlock,
  ProductSpecification,
  ProductSpecs,
} from '@/lib/product-detail';
import type { ShippingTier } from '@/lib/checkout/shipping-tiers';

/**
 * Mirrored from `sals3-portal/src/modules/orders/contracts.ts`. Order matters:
 * `leastAdvancedState` reads it as a progression, primary states first.
 */
export const PARCEL_LIFECYCLE_STATES = [
  // Primary
  'DRAFT',
  'CHECKOUT_PENDING',
  'PAYMENT_PENDING',
  'PAID',
  'FULFILLMENT_QUEUED',
  'CJ_ORDER_CREATED',
  'CJ_PAYMENT_PENDING',
  'FULFILLING',
  'SHIPPED',
  'DELIVERED',
  // Exception
  'PAYMENT_FAILED',
  'FULFILLMENT_FAILED',
  'AWAITING_SUPPLIER_FUNDS',
  'CANCEL_REQUESTED',
  'CANCELLED',
  'DELIVERY_EXCEPTION',
  'TRACKING_CONFLICT',
  'REFUND_PENDING',
  'REFUNDED',
  'RETURN_IN_PROGRESS',
  'RETURNED',
] as const;

export type ParcelLifecycleState = (typeof PARCEL_LIFECYCLE_STATES)[number];

/**
 * The four states that mean something has gone wrong. They get no buyer lane:
 * the seller's workspace has a "Needs attention" queue because it is their
 * work, while a buyer wants the order where they left it. Buyer-side an
 * exception is a red edge on the card inside its existing lane, plus a
 * page-level notice.
 */
export const EXCEPTION_STATES = [
  'FULFILLMENT_FAILED',
  'AWAITING_SUPPLIER_FUNDS',
  'DELIVERY_EXCEPTION',
  'TRACKING_CONFLICT',
] as const;

export type ExceptionState = (typeof EXCEPTION_STATES)[number];

export function isExceptionState(
  state: ParcelLifecycleState,
): state is ExceptionState {
  return (EXCEPTION_STATES as readonly string[]).includes(state);
}

/**
 * Four tones, all from `globals.css`. The portal's five-tone `StatusPill`
 * belongs to the seller center: its `success` and `warning` surfaces have no
 * token in this repository, so importing it would introduce colours the
 * storefront has never approved.
 */
export type OrderStatusTone = 'info' | 'neutral' | 'delivered' | 'alert';

/** One line of an order, frozen at acceptance. */
export type BuyerOrderLine = {
  id: string;
  title: string;
  /** Option label as ordered, e.g. `Warm white · EU plug`. */
  variant: string | null;
  quantity: number;
  /** `US$22.99` — already formatted. */
  unitAmountLabel: string;
  /** `US$45.98` — already formatted, and equal to unit × quantity. */
  lineTotalLabel: string;
  /** `12 Aug 2026`. */
  acceptedOnLabel: string;
  /** The line's own snapshot media. `null` renders the sunken placeholder. */
  imageUrl: string | null;
  /**
   * The listing as it was when this order was placed.
   *
   * Absent for an order accepted before the portal froze it, and absent when the
   * stored document is one this deployment cannot read. Both cases fall back to
   * `title`, `variant` and `imageUrl`, which are frozen on the line regardless —
   * so the panel is additive and its absence is never an error a buyer sees.
   */
  listing?: OrderedListing;
  /**
   * Whether this buyer can review this line right now.
   *
   * The portal decides it — the line's own parcel delivered, inside the window,
   * not already reviewed — and this side only renders the answer. Duplicating
   * the rule here would give it two homes, and this one cannot see the parcel
   * state it depends on.
   */
  reviewable: boolean;
  /** This buyer's own review of this line, when they have written one. */
  review?: { id: string; rating: number };
};

/**
 * What the buyer saw on the product page, at the moment they bought it.
 *
 * A seller may rename a product, replace every photo and rewrite the
 * description afterwards — they are entitled to, and it applies to new orders.
 * This is why it does not reach back: the order carries its own copy.
 */
export type OrderedListing = {
  /** The option axes in the seller's own words, as chosen. */
  options: { name: string; value: string }[];
  /** Host-checked, in the order the gallery showed them. */
  imageUrls: string[];
  description?: ProductDescriptionBlock[];
  specification?: ProductSpecification[];
  specs?: ProductSpecs;
  categoryPath?: string;
};

/** Who reported a tracking event. Never Sals3 — it reports nothing of its own. */
export type TrackingEventSource = 'CARRIER' | 'SUPPLIER' | 'OPERATIONS';

export type BuyerOrderTrackingEvent = {
  id: string;
  label: string;
  /** `15 Aug 2026, 22:41`. */
  occurredAtLabel: string;
  source: TrackingEventSource;
  /**
   * Rendered in `red-600` inline. An exception event never promotes itself to
   * the package status: the package status is the portal's, not the feed's.
   */
  isException: boolean;
};

/**
 * One package: one supplier connection, one courier, one tracking number, one
 * status. The connection itself is never named to a buyer — only the carrier.
 */
export type BuyerOrderPackage = {
  id: string;
  /** `Package 1 of 2`. */
  label: string;
  shippingTier: ShippingTier | null;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  /** `Arrives in 12–18 days`, or `Arrival window unavailable`. */
  arrivalLabel: string;
  state: ParcelLifecycleState;
  statusLabel: string;
  tone: OrderStatusTone;
  lines: BuyerOrderLine[];
  events: BuyerOrderTrackingEvent[];
};

export type TimelineMark = 'done' | 'now' | 'todo' | 'alert';

export type BuyerOrderTimelineStep = {
  id: string;
  label: string;
  /** `12 Aug 2026, 14:09`, or a plain `Not yet`. */
  atLabel: string;
  mark: TimelineMark;
};

/**
 * An action offered on a card or in the detail rail.
 *
 * A blocked action keeps its place, greyed, with `blockedReason` used as the
 * visible label *and* the accessible name. An action that disappears when it
 * cannot run reads as a missing feature, and the buyer cannot tell the
 * difference between "not yet" and "never".
 */
export type BuyerOrderAction = {
  id: string;
  label: string;
  kind: 'primary' | 'secondary' | 'quiet';
  blockedReason: string | null;
  href: string | null;
};

export type BuyerOrderShipTo = {
  name: string;
  address: string;
  /** `buyer@example.com · 0927 173 9215`. */
  contact: string;
};

export type BuyerOrder = {
  id: string;
  /** `S3-20260812-9F3C1A7B2E`. Issued the moment Stripe confirms a payment. */
  number: string;
  /** ISO 8601. Used for range filtering only; never rendered. */
  placedAt: string;
  /** `Placed 12 Aug 2026 · 2 packages · 3 items`. */
  metaLine: string;
  /** The rollup state: any exception wins, else the least-advanced package. */
  state: ParcelLifecycleState;
  statusLabel: string;
  tone: OrderStatusTone;
  /** Where the order is. Always paired with the label — never a bare pill. */
  statusDetail: string;
  /** Whether anything is needed from the buyer. */
  nextStep: string;
  hasException: boolean;
  itemsLabel: string;
  subtotalLabel: string;
  shippingLabel: string;
  totalChargedLabel: string;
  paymentLine: string;
  /** Truncated but copyable, e.g. `Stripe reference cs_live_a1B2…9xYz`. */
  stripeReferenceLabel: string;
  footNote: string;
  packages: BuyerOrderPackage[];
  timeline: BuyerOrderTimelineStep[];
  actions: BuyerOrderAction[];
  shipTo: BuyerOrderShipTo;
};

/**
 * The order's status is the rollup of its packages: any exception wins, else
 * the least-advanced package's state. Nothing here invents a state the packages
 * do not already support.
 */
export function rollupState(
  states: readonly ParcelLifecycleState[],
): ParcelLifecycleState | undefined {
  const exception = states.find(isExceptionState);

  if (exception !== undefined) return exception;

  return states.reduce<ParcelLifecycleState | undefined>((least, state) => {
    if (least === undefined) return state;

    return PARCEL_LIFECYCLE_STATES.indexOf(state) <
      PARCEL_LIFECYCLE_STATES.indexOf(least)
      ? state
      : least;
  }, undefined);
}
