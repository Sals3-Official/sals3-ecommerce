import 'server-only';

import { isSupportedCurrency, type CurrencyCode } from '@/lib/money';
import {
  getAllowedProductImageUrl,
  toDescriptionBlocks,
} from '@/services/storefront/mappers';
import type {
  BuyerOrderPayload,
  BuyerOrderPackagePayload,
  BuyerOrderLinePayload,
  BuyerTrackingEventPayload,
  OrderedListingPayload,
} from '@/services/storefront/orders';
import {
  isExceptionState,
  rollupState,
  type BuyerOrder,
  type BuyerOrderAction,
  type BuyerOrderLine,
  type BuyerOrderPackage,
  type BuyerOrderTimelineStep,
  type BuyerOrderTrackingEvent,
  type OrderedListing,
  type ParcelLifecycleState,
} from './contracts';
import {
  countLabel,
  formatAmount,
  formatOrderDate,
  formatOrderDateTime,
  truncateStripeReference,
} from './format';
import statusCopyOf from './status-copy';

/**
 * Maps the portal's buyer orders payload into the presentation types the
 * `/orders` components render.
 *
 * This is the one place arithmetic on money happens (line total = unit ×
 * quantity, subtotal = Σ lines), and it runs on the server: every amount
 * leaves here as a `formatMoney` string, so no component can disagree with
 * the receipt. `Total charged` is deliberately NOT recomputed — it renders
 * the portal's `amountTotalMinor`, which is what Stripe actually charged.
 *
 * The worker-side `fulfillmentStatus` fills in for packages the status sync
 * has not stamped yet, so a just-paid order says "Being prepared" rather than
 * nothing; `parcelState` wins the moment it exists.
 */

const SOURCE_LABEL: Record<BuyerTrackingEventPayload['source'], string> = {
  CARRIER: 'Carrier',
  SUPPLIER: 'Supplier',
  OPERATIONS: 'Operations',
};

/** Worker statuses → the lifecycle state they imply, until the sync stamps one. */
const FULFILLMENT_STATUS_STATE: Record<string, ParcelLifecycleState> = {
  PENDING: 'FULFILLMENT_QUEUED',
  CJ_ORDER_CREATED: 'CJ_ORDER_CREATED',
  CJ_CART_CONFIRMED: 'CJ_ORDER_CREATED',
  CJ_PARENT_ORDER_CREATED: 'CJ_PAYMENT_PENDING',
  CJ_PAID: 'FULFILLING',
  FULFILLMENT_FAILED: 'FULFILLMENT_FAILED',
  AWAITING_SUPPLIER_FUNDS: 'AWAITING_SUPPLIER_FUNDS',
};

function currencyOf(payload: BuyerOrderPayload): CurrencyCode {
  const upper = payload.currency.toUpperCase();

  if (!isSupportedCurrency(upper)) {
    // Refusing beats mislabeling: a bare number is the one rendering of a
    // price that misrepresents it.
    throw new Error(`Unsupported order currency: ${payload.currency}`);
  }

  return upper;
}

function stateOf(pkg: BuyerOrderPackagePayload): ParcelLifecycleState {
  return (
    pkg.parcelState ??
    FULFILLMENT_STATUS_STATE[pkg.fulfillmentStatus] ??
    'FULFILLMENT_QUEUED'
  );
}

function arrivalLabelOf(
  pkg: BuyerOrderPackagePayload,
  state: ParcelLifecycleState,
): string {
  if (state === 'DELIVERED') return 'Delivered';
  if (state === 'TRACKING_CONFLICT' || state === 'DELIVERY_EXCEPTION')
    return 'Arrival window has passed';
  if (pkg.trackingNumber === null) return 'Arrival window issued when it ships';
  if (pkg.arrivalDays === null) return 'Arrival window unavailable';

  // The freight quote's own `12-18`, captured at checkout and attributed to
  // the carrier — Sals3 invents no estimate of its own.
  return `Arrives in ${pkg.arrivalDays.replace('-', '–')} days`;
}

/**
 * The frozen listing, mapped with the same gates the product page uses.
 *
 * Every image address is re-checked against the host allow-list even though the
 * portal checked it on the way in: a stored URL is still an address this
 * deployment is about to fetch, and the allow-list is the only thing that makes
 * that safe. Description blocks go through `toDescriptionBlocks`, the product
 * page's own mapper, so an image block inside a frozen description is subject to
 * exactly the same per-block check as a live one.
 *
 * Empty sections are dropped rather than kept as empty arrays: a heading over
 * nothing reads as "the seller wrote nothing here", which is a different claim
 * from "this order did not record it".
 */
function toOrderedListing(
  listing: OrderedListingPayload,
  fallbackTitle: string,
): OrderedListing {
  const imageUrls = (listing.imageUrls ?? [])
    .map((url) => getAllowedProductImageUrl(url))
    .filter((url): url is string => url !== undefined);
  const description =
    listing.description === null || listing.description === undefined
      ? []
      : toDescriptionBlocks(listing.description.blocks, fallbackTitle);
  const specification = listing.specification ?? [];

  return {
    options: listing.options ?? [],
    imageUrls,
    ...(description.length === 0 ? {} : { description }),
    ...(specification.length === 0 ? {} : { specification }),
    ...(listing.specs === null || listing.specs === undefined
      ? {}
      : { specs: listing.specs }),
    ...(listing.categoryPath === null || listing.categoryPath === undefined
      ? {}
      : { categoryPath: listing.categoryPath }),
  };
}

/**
 * The option axes, as one line of prose.
 *
 * Prefers the frozen buyer-facing pairs over `variantLabel`. They are not the
 * same string: `variantLabel` is the supplier's own token (`army green-L`),
 * while the buyer chose `Colour: Army Green` and `Size: L` from the seller's
 * mapped axes. The supplier token is what CJ fulfilment matches on and is kept
 * on the line, but it was never what the buyer read.
 */
function variantLineOf(line: BuyerOrderLinePayload): string | null {
  const options = line.listing?.options ?? [];

  if (options.length === 0) return line.variantLabel;

  return options.map((option) => `${option.name}: ${option.value}`).join(' · ');
}

function toLine(
  line: BuyerOrderLinePayload,
  currency: CurrencyCode,
): BuyerOrderLine {
  const listing =
    line.listing === undefined
      ? undefined
      : toOrderedListing(line.listing, line.title);

  return {
    id: line.id,
    title: line.title,
    variant: variantLineOf(line),
    quantity: line.quantity,
    unitAmountLabel: formatAmount(line.unitAmountMinor, currency),
    lineTotalLabel: formatAmount(
      line.unitAmountMinor * line.quantity,
      currency,
    ),
    acceptedOnLabel: formatOrderDate(line.acceptedAt),
    // Same host allow-list as every other product image; an address on any
    // other host renders as the placeholder square rather than being fetched.
    imageUrl: getAllowedProductImageUrl(line.imageUrl) ?? null,
    ...(listing === undefined ? {} : { listing }),
  };
}

function toEvent(event: BuyerTrackingEventPayload): BuyerOrderTrackingEvent {
  return {
    id: event.id,
    label: event.label,
    occurredAtLabel: `${formatOrderDateTime(event.occurredAt)} · ${SOURCE_LABEL[event.source]}`,
    source: event.source,
    isException: event.isException,
  };
}

function toPackage(
  pkg: BuyerOrderPackagePayload,
  index: number,
  total: number,
  currency: CurrencyCode,
): BuyerOrderPackage {
  const state = stateOf(pkg);
  const copy = statusCopyOf(state);

  return {
    id: pkg.packageId,
    label: `Package ${index + 1} of ${total}`,
    carrier: pkg.carrier,
    trackingNumber: pkg.trackingNumber,
    // No confirmed carrier deep link exists; the number itself is copyable.
    trackingUrl: null,
    arrivalLabel: arrivalLabelOf(pkg, state),
    state,
    statusLabel: copy.packageLabel,
    tone: copy.tone,
    lines: pkg.lines.map((line) => toLine(line, currency)),
    events: pkg.events.map(toEvent),
  };
}

function shippedMark(
  anyShipped: boolean,
  state: ParcelLifecycleState,
): BuyerOrderTimelineStep['mark'] {
  if (anyShipped) return 'done';

  return isExceptionState(state) ? 'alert' : 'now';
}

function timelineOf(
  payload: BuyerOrderPayload,
  state: ParcelLifecycleState,
): BuyerOrderTimelineStep[] {
  const placed = formatOrderDateTime(payload.placedAt);
  const anyShipped = payload.packages.some((pkg) => {
    const packageState = stateOf(pkg);

    return packageState === 'SHIPPED' || packageState === 'DELIVERED';
  });
  const allDelivered =
    payload.packages.length > 0 &&
    payload.packages.every((pkg) => stateOf(pkg) === 'DELIVERED');

  // Only claims with evidence get timestamps; everything else says where it
  // stands in words. Shipped/delivered times live in the tracking feed, which
  // is the carrier's record, not Sals3's.
  return [
    { id: 't-placed', label: 'Placed', atLabel: placed, mark: 'done' },
    {
      id: 't-paid',
      label: 'Payment confirmed by Stripe',
      atLabel: placed,
      mark: 'done',
    },
    {
      id: 't-shipped',
      label: 'Shipped',
      atLabel: anyShipped ? 'See tracking events' : 'Not yet',
      mark: shippedMark(anyShipped, state),
    },
    {
      id: 't-delivered',
      label: 'Delivered',
      atLabel: allDelivered ? 'Confirmed by both sources' : 'Not yet',
      mark: allDelivered ? 'done' : 'todo',
    },
  ];
}

function actionsOf(
  state: ParcelLifecycleState,
  flags: { anyShipped: boolean; anyTracking: boolean },
): BuyerOrderAction[] {
  const support: BuyerOrderAction = {
    id: 'support',
    label: 'Contact support',
    kind: isExceptionState(state) ? 'primary' : 'quiet',
    blockedReason: null,
    href: '/help',
  };
  const details: BuyerOrderAction = {
    id: 'details',
    label: 'View order details',
    kind: isExceptionState(state) ? 'secondary' : 'primary',
    blockedReason: null,
    href: null,
  };
  const track: BuyerOrderAction = {
    id: 'track',
    label: 'Track package',
    kind: 'quiet',
    blockedReason: flags.anyTracking
      ? 'No carrier tracking link yet — copy the number'
      : 'No tracking number yet',
    href: null,
  };
  const cancel: BuyerOrderAction = {
    id: 'cancel',
    label: 'Cancel order',
    kind: 'quiet',
    // Both reasons are honest today (no cancel path exists), but the shipped
    // wording matters more: it will stay true even after cancelling ships.
    blockedReason: flags.anyShipped
      ? 'Cannot be cancelled — one package has shipped'
      : 'Cancelling is not open yet — contact support',
    href: null,
  };

  if (state === 'DELIVERED') {
    return [
      details,
      support,
      {
        id: 'return',
        label: 'Request return',
        kind: 'quiet',
        blockedReason: 'Returns are not open yet — contact support',
        href: null,
      },
    ];
  }

  if (isExceptionState(state)) return [support, details, track];

  return [details, support, track, cancel];
}

function paymentLineOf(payload: BuyerOrderPayload): string {
  switch (payload.paymentStatus) {
    case 'REFUNDED':
      return 'Refund issued through Stripe.';
    case 'DISPUTED':
      return 'This payment is under review with Stripe.';
    case 'PAID':
    default:
      return `Paid by card through Stripe on ${formatOrderDate(payload.placedAt)}.`;
  }
}

export default function toBuyerOrder(payload: BuyerOrderPayload): BuyerOrder {
  const currency = currencyOf(payload);
  const packages = payload.packages.map((pkg, index) =>
    toPackage(pkg, index, payload.packages.length, currency),
  );

  const packageStates = packages.map((pkg) => pkg.state);
  const anyShipped = packageStates.some(
    (candidate) => candidate === 'SHIPPED' || candidate === 'DELIVERED',
  );
  const anyTracking = packages.some((pkg) => pkg.trackingNumber !== null);
  const rolled = rollupState(packageStates) ?? 'FULFILLMENT_QUEUED';
  // A refunded payment outranks parcel movement: the money story is settled
  // and the card should say so even if a parcel row never advanced.
  const state: ParcelLifecycleState =
    payload.paymentStatus === 'REFUNDED' ? 'REFUNDED' : rolled;
  const copy = statusCopyOf(state);

  const units = payload.packages.reduce(
    (total, pkg) =>
      total + pkg.lines.reduce((sum, line) => sum + line.quantity, 0),
    0,
  );
  const subtotalMinor = payload.packages.reduce(
    (total, pkg) =>
      total +
      pkg.lines.reduce(
        (sum, line) => sum + line.unitAmountMinor * line.quantity,
        0,
      ),
    0,
  );
  const shippingMinor = payload.packages.reduce(
    (total, pkg) => total + pkg.shippingAmountMinor,
    0,
  );

  const address = [
    payload.shipTo.addressLine1,
    payload.shipTo.addressLine2,
    payload.shipTo.city,
    payload.shipTo.region,
    payload.shipTo.postalCode,
    payload.shipTo.country,
  ]
    .filter((part) => part !== null && part !== '')
    .join(', ');

  return {
    id: payload.orderNumber,
    number: payload.orderNumber,
    placedAt: payload.placedAt,
    metaLine: [
      `Placed ${formatOrderDate(payload.placedAt)}`,
      countLabel(packages.length, 'package'),
      countLabel(units, 'item'),
    ].join(' · '),
    state,
    statusLabel: copy.label,
    tone: copy.tone,
    statusDetail: copy.detail,
    nextStep: copy.nextStep,
    hasException: packageStates.some(isExceptionState),
    itemsLabel: countLabel(units, 'item'),
    subtotalLabel: formatAmount(subtotalMinor, currency),
    shippingLabel: formatAmount(shippingMinor, currency),
    totalChargedLabel: formatAmount(payload.amountTotalMinor, currency),
    paymentLine: paymentLineOf(payload),
    stripeReferenceLabel: truncateStripeReference(
      payload.stripeCheckoutSessionId,
    ),
    footNote:
      state === 'TRACKING_CONFLICT'
        ? 'Two sources disagree; neither is presented as settled.'
        : 'Item, price and options are frozen as ordered.',
    packages,
    timeline: timelineOf(payload, state),
    actions: actionsOf(state, { anyShipped, anyTracking }),
    shipTo: {
      name: payload.shipTo.name,
      address,
      contact: [payload.shipTo.email, payload.shipTo.phone]
        .filter((part) => part !== null && part !== '')
        .join(' · '),
    },
  };
}
