import type { CurrencyCode } from '@/lib/money';
import {
  isExceptionState,
  rollupState,
  type BuyerOrder,
  type BuyerOrderAction,
  type BuyerOrderLine,
  type BuyerOrderPackage,
  type BuyerOrderTimelineStep,
  type BuyerOrderTrackingEvent,
  type OrderStatusTone,
  type ParcelLifecycleState,
} from './contracts';
import {
  countLabel,
  formatAmount,
  formatOrderDate,
  formatOrderDateTime,
  truncateStripeReference,
} from './format';

/**
 * Test fixtures for the buyer orders surface.
 *
 * Until 2026-08-19 this module was also the data behind `/orders`, because no
 * buyer orders read API existed. The portal now serves
 * `GET /api/storefront/orders*` and `lib/orders/read.ts` reads it through
 * `services/storefront/orders.ts` — so this file is imported by tests only,
 * where it exercises the lane/filter/query machinery and the card components
 * against every state the design covers. It is not a seed, not a default, and
 * not a fallback for a failed fetch.
 *
 * Every money label is produced by `formatMoney`, and every line total is
 * `unit × quantity` rather than a typed-in number, so the arithmetic the tests
 * assert is the arithmetic the pages do.
 */

const CURRENCY: CurrencyCode = 'USD';

type SeedLine = {
  id: string;
  title: string;
  variant: string | null;
  quantity: number;
  unitMinor: number;
  acceptedOn: string;
};

type SeedEvent = {
  label: string;
  at: string;
  source: BuyerOrderTrackingEvent['source'];
  isException?: boolean;
};

type SeedPackage = {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  arrivalLabel: string;
  state: ParcelLifecycleState;
  statusLabel: string;
  tone: OrderStatusTone;
  lines: SeedLine[];
  events?: SeedEvent[];
};

type SeedAction = {
  id: string;
  label: string;
  kind: BuyerOrderAction['kind'];
  blockedReason?: string;
  href?: string;
};

type SeedOrder = {
  id: string;
  number: string;
  placedAt: string;
  /** A checkout that was never paid was started, not placed. */
  startedOnly?: boolean;
  statusLabel: string;
  tone: OrderStatusTone;
  statusDetail: string;
  nextStep: string;
  shippingMinor: number;
  paymentLine: string;
  stripeReference: string;
  footNote: string;
  packages: SeedPackage[];
  timeline: {
    label: string;
    at: string;
    mark: BuyerOrderTimelineStep['mark'];
  }[];
  actions: SeedAction[];
};

const SHIP_TO = {
  name: 'Aljon Garrigues',
  address:
    'Blk 4 Lot 10, Carnation Street, Phase 2, San Fernando, Pampanga, 2000, PH',
  contact: 'aljon@example.com · 0927 173 9215',
};

const EVENT_NOTE_SOURCES: Record<BuyerOrderTrackingEvent['source'], string> = {
  CARRIER: 'Carrier',
  SUPPLIER: 'Supplier',
  OPERATIONS: 'Operations',
};

function toLine(seed: SeedLine): BuyerOrderLine {
  return {
    id: seed.id,
    title: seed.title,
    variant: seed.variant,
    quantity: seed.quantity,
    unitAmountLabel: formatAmount(seed.unitMinor, CURRENCY),
    lineTotalLabel: formatAmount(seed.unitMinor * seed.quantity, CURRENCY),
    acceptedOnLabel: formatOrderDate(seed.acceptedOn),
    imageUrl: null,
    // Fixtures never offer the review control. Eligibility is a real parcel
    // state on a real order, and a fixture that claimed it would put a button
    // in front of a developer that no backend could honour.
    reviewable: false,
  };
}

function toEvent(seed: SeedEvent, index: number): BuyerOrderTrackingEvent {
  return {
    id: `e${index}`,
    label: seed.label,
    occurredAtLabel: `${formatOrderDateTime(seed.at)} · ${EVENT_NOTE_SOURCES[seed.source]}`,
    source: seed.source,
    isException: seed.isException ?? false,
  };
}

function toPackage(
  seed: SeedPackage,
  index: number,
  total: number,
): BuyerOrderPackage {
  return {
    id: seed.id,
    label:
      total === 1 && seed.state === 'CHECKOUT_PENDING'
        ? 'Not yet a package'
        : `Package ${index + 1} of ${total}`,
    carrier: seed.carrier,
    trackingNumber: seed.trackingNumber,
    // No carrier deep link is confirmed for CJPacket, and guessing one would
    // send a buyer to a page that may not resolve. `Track package` therefore
    // stays in the design as a control with no destination until a tracking URL
    // arrives with the data.
    trackingUrl: null,
    arrivalLabel: seed.arrivalLabel,
    state: seed.state,
    statusLabel: seed.statusLabel,
    tone: seed.tone,
    lines: seed.lines.map(toLine),
    events: (seed.events ?? []).map(toEvent),
  };
}

function toAction(seed: SeedAction): BuyerOrderAction {
  return {
    id: seed.id,
    label: seed.label,
    kind: seed.kind,
    blockedReason: seed.blockedReason ?? null,
    href: seed.href ?? null,
  };
}

function buildOrder(seed: SeedOrder): BuyerOrder {
  const packages = seed.packages.map((pkg, index) =>
    toPackage(pkg, index, seed.packages.length),
  );

  const units = seed.packages.reduce(
    (total, pkg) =>
      total + pkg.lines.reduce((sum, line) => sum + line.quantity, 0),
    0,
  );

  const subtotalMinor = seed.packages.reduce(
    (total, pkg) =>
      total +
      pkg.lines.reduce((sum, line) => sum + line.unitMinor * line.quantity, 0),
    0,
  );

  const state = rollupState(packages.map((pkg) => pkg.state)) ?? 'DRAFT';

  const metaParts = [
    `${seed.startedOnly ? 'Started' : 'Placed'} ${formatOrderDate(seed.placedAt)}`,
    ...(seed.startedOnly ? [] : [countLabel(packages.length, 'package')]),
    countLabel(units, 'item'),
  ];

  return {
    id: seed.id,
    number: seed.number,
    placedAt: seed.placedAt,
    metaLine: metaParts.join(' · '),
    state,
    statusLabel: seed.statusLabel,
    tone: seed.tone,
    statusDetail: seed.statusDetail,
    nextStep: seed.nextStep,
    hasException: packages.some((pkg) => isExceptionState(pkg.state)),
    itemsLabel: countLabel(units, 'item'),
    subtotalLabel: formatAmount(subtotalMinor, CURRENCY),
    shippingLabel: formatAmount(seed.shippingMinor, CURRENCY),
    totalChargedLabel: formatAmount(
      subtotalMinor + seed.shippingMinor,
      CURRENCY,
    ),
    paymentLine: seed.paymentLine,
    stripeReferenceLabel: truncateStripeReference(seed.stripeReference),
    footNote: seed.footNote,
    packages,
    timeline: seed.timeline.map((step, index) => ({
      id: `t${index}`,
      label: step.label,
      atLabel: step.at,
      mark: step.mark,
    })),
    actions: seed.actions.map(toAction),
    shipTo: SHIP_TO,
  };
}

const SEED: SeedOrder[] = [
  {
    id: 'o1',
    number: 'S3-20260812-9F3C1A7B2E',
    placedAt: '2026-08-12T14:08:00Z',
    statusLabel: 'Shipped',
    tone: 'info',
    statusDetail:
      'One package left the warehouse on 14 Aug and is moving. The second is still being prepared, so this order arrives in two deliveries.',
    nextStep:
      'Nothing is needed from you. Tracking updates as the carrier scans the parcel.',
    shippingMinor: 2284,
    paymentLine: 'Paid by card through Stripe on 12 Aug 2026.',
    stripeReference: 'cs_live_a1B2c3D4e5F6g7H8i9xYz',
    footNote: 'Item, price and options are frozen as ordered.',
    packages: [
      {
        id: 'o1p1',
        carrier: 'CJPacket Ordinary',
        trackingNumber: 'CJP7742119055',
        arrivalLabel: 'Arrives in 12–18 days',
        state: 'SHIPPED',
        statusLabel: 'In transit',
        tone: 'info',
        lines: [
          {
            id: 'o1p1l1',
            title: 'Solar wall lamp, motion sensor, 3 colour modes',
            variant: 'Warm white · EU plug',
            quantity: 2,
            unitMinor: 2299,
            acceptedOn: '2026-08-12T14:09:00Z',
          },
        ],
        events: [
          {
            label: 'Handed to the carrier',
            at: '2026-08-14T09:22:00Z',
            source: 'CARRIER',
          },
          {
            label: 'Departed sorting facility, Shenzhen',
            at: '2026-08-15T22:41:00Z',
            source: 'CARRIER',
          },
          {
            label: 'In transit to destination country',
            at: '2026-08-17T06:10:00Z',
            source: 'CARRIER',
          },
        ],
      },
      {
        id: 'o1p2',
        carrier: 'CJPacket Sensitive',
        trackingNumber: null,
        arrivalLabel: 'Arrival window issued when it ships',
        state: 'FULFILLING',
        statusLabel: 'Being prepared',
        tone: 'neutral',
        lines: [
          {
            id: 'o1p2l1',
            title: 'Wireless earbuds, active noise cancelling',
            variant: 'Midnight black',
            quantity: 1,
            unitMinor: 4599,
            acceptedOn: '2026-08-12T14:09:00Z',
          },
        ],
        events: [
          {
            label: 'Supplier order placed',
            at: '2026-08-12T14:20:00Z',
            source: 'SUPPLIER',
          },
          {
            label: 'Preparing the package',
            at: '2026-08-13T03:55:00Z',
            source: 'SUPPLIER',
          },
          {
            label: 'One option is slower to source than the rest of the order',
            at: '2026-08-13T04:02:00Z',
            source: 'OPERATIONS',
            isException: true,
          },
        ],
      },
    ],
    timeline: [
      { label: 'Placed', at: '12 Aug 2026, 14:08', mark: 'done' },
      {
        label: 'Payment confirmed by Stripe',
        at: '12 Aug 2026, 14:09',
        mark: 'done',
      },
      { label: 'Package 1 shipped', at: '14 Aug 2026, 09:22', mark: 'now' },
      { label: 'Delivered', at: 'Not yet', mark: 'todo' },
    ],
    actions: [
      {
        id: 'track',
        label: 'Track package',
        kind: 'primary',
        blockedReason: 'No carrier tracking link is available yet',
      },
      { id: 'details', label: 'View order details', kind: 'secondary' },
      { id: 'support', label: 'Contact support', kind: 'quiet', href: '/help' },
      {
        id: 'cancel',
        label: 'Cancel order',
        kind: 'quiet',
        blockedReason: 'Cannot be cancelled — one package has shipped',
      },
    ],
  },
  {
    id: 'o2',
    number: 'S3-20260731-4C81DDA930',
    placedAt: '2026-07-31T21:41:00Z',
    statusLabel: 'Delivered',
    tone: 'delivered',
    statusDetail:
      'The carrier and the supplier both report this delivered on 18 Aug 2026.',
    nextStep: 'Nothing is needed from you. Support can still act on a problem.',
    shippingMinor: 750,
    paymentLine: 'Paid by card through Stripe on 31 Jul 2026.',
    stripeReference: 'cs_live_b2C3d4E5f6G7h8I9j0kLm',
    footNote: 'Item, price and options are frozen as ordered.',
    packages: [
      {
        id: 'o2p1',
        carrier: 'CJPacket Ordinary',
        trackingNumber: 'CJP7614038871',
        arrivalLabel: 'Delivered 18 Aug 2026',
        state: 'DELIVERED',
        statusLabel: 'Delivered',
        tone: 'delivered',
        lines: [
          {
            id: 'o2p1l1',
            title: 'Stainless steel insulated tumbler, 750 ml',
            variant: 'Brushed steel',
            quantity: 1,
            unitMinor: 1899,
            acceptedOn: '2026-07-31T21:42:00Z',
          },
        ],
        events: [
          {
            label: 'Handed to the carrier',
            at: '2026-08-03T11:05:00Z',
            source: 'CARRIER',
          },
          {
            label: 'Delivered',
            at: '2026-08-18T15:30:00Z',
            source: 'CARRIER',
          },
          {
            label: 'Supplier confirms delivery',
            at: '2026-08-18T18:02:00Z',
            source: 'SUPPLIER',
          },
        ],
      },
    ],
    timeline: [
      { label: 'Placed', at: '31 Jul 2026, 21:41', mark: 'done' },
      {
        label: 'Payment confirmed by Stripe',
        at: '31 Jul 2026, 21:42',
        mark: 'done',
      },
      { label: 'Shipped', at: '03 Aug 2026, 11:05', mark: 'done' },
      { label: 'Delivered', at: '18 Aug 2026, 15:30', mark: 'done' },
    ],
    actions: [
      {
        id: 'buy-again',
        label: 'Buy again',
        kind: 'primary',
        blockedReason: 'Buy again is not available yet',
      },
      { id: 'details', label: 'View order details', kind: 'secondary' },
      { id: 'support', label: 'Contact support', kind: 'quiet', href: '/help' },
      {
        id: 'return',
        label: 'Request return',
        kind: 'quiet',
        blockedReason: 'Returns are not open yet — contact support',
      },
    ],
  },
  {
    id: 'o3',
    number: 'S3-20260818-2B6E44F017',
    placedAt: '2026-08-18T08:12:00Z',
    statusLabel: 'Being prepared',
    tone: 'neutral',
    statusDetail:
      'Payment is confirmed and the supplier has the order. Nothing has shipped, so no tracking number exists yet.',
    nextStep:
      'Nothing is needed from you. A tracking number appears here when the package leaves the warehouse.',
    shippingMinor: 1080,
    paymentLine: 'Paid by card through Stripe on 18 Aug 2026.',
    stripeReference: 'cs_live_c3D4e5F6g7H8i9J0k1lMn',
    footNote: 'Item, price and options are frozen as ordered.',
    packages: [
      {
        id: 'o3p1',
        carrier: 'CJPacket Ordinary',
        trackingNumber: null,
        arrivalLabel: 'Arrival window issued when it ships',
        state: 'FULFILLING',
        statusLabel: 'Being prepared',
        tone: 'neutral',
        lines: [
          {
            id: 'o3p1l1',
            title: 'Ergonomic mesh office chair',
            variant: 'Graphite · headrest',
            quantity: 1,
            unitMinor: 12900,
            acceptedOn: '2026-08-18T08:13:00Z',
          },
        ],
        events: [
          {
            label: 'Supplier order placed',
            at: '2026-08-18T08:30:00Z',
            source: 'SUPPLIER',
          },
          {
            label: 'Preparing the package',
            at: '2026-08-19T02:14:00Z',
            source: 'SUPPLIER',
          },
        ],
      },
    ],
    timeline: [
      { label: 'Placed', at: '18 Aug 2026, 08:12', mark: 'done' },
      {
        label: 'Payment confirmed by Stripe',
        at: '18 Aug 2026, 08:13',
        mark: 'done',
      },
      { label: 'Preparing to ship', at: 'In progress', mark: 'now' },
      { label: 'Delivered', at: 'Not yet', mark: 'todo' },
    ],
    actions: [
      { id: 'details', label: 'View order details', kind: 'primary' },
      { id: 'support', label: 'Contact support', kind: 'quiet', href: '/help' },
      {
        id: 'track',
        label: 'Track package',
        kind: 'quiet',
        blockedReason: 'No tracking number yet',
      },
      {
        id: 'cancel',
        label: 'Cancel order',
        kind: 'quiet',
        blockedReason: 'Cancelling is not open yet — contact support',
      },
    ],
  },
  {
    id: 'o4',
    number: 'S3-20260819-77A1C2BE05',
    placedAt: '2026-08-19T10:02:00Z',
    startedOnly: true,
    statusLabel: 'Payment not completed',
    tone: 'neutral',
    statusDetail:
      'You left Stripe without paying. Nothing was charged and your cart is unchanged.',
    nextStep:
      'The items are still in your cart. Check out again when you are ready — this record closes itself if you do nothing.',
    shippingMinor: 700,
    paymentLine: 'No payment is recorded for this checkout.',
    stripeReference: 'cs_live_d4E5f6G7h8I9j0K1l2mNo',
    footNote: 'No order number is issued until a payment is confirmed.',
    packages: [
      {
        id: 'o4p1',
        carrier: 'Delivery option chosen at checkout',
        trackingNumber: null,
        arrivalLabel: 'No arrival window',
        state: 'CHECKOUT_PENDING',
        statusLabel: 'Unpaid',
        tone: 'neutral',
        lines: [
          {
            id: 'o4p1l1',
            title: 'Bamboo cutting board set',
            variant: '3 pieces',
            quantity: 1,
            unitMinor: 2799,
            acceptedOn: '2026-08-19T10:02:00Z',
          },
        ],
      },
    ],
    timeline: [
      { label: 'Checkout started', at: '19 Aug 2026, 10:02', mark: 'done' },
      { label: 'Payment', at: 'Not completed', mark: 'todo' },
    ],
    actions: [
      { id: 'cart', label: 'Back to cart', kind: 'primary', href: '/cart' },
      { id: 'support', label: 'Contact support', kind: 'quiet', href: '/help' },
      {
        id: 'return',
        label: 'Request return',
        kind: 'quiet',
        blockedReason: 'Nothing was purchased to return',
      },
    ],
  },
  {
    id: 'o5',
    number: 'S3-20260714-D0F91A3C58',
    placedAt: '2026-07-14T19:20:00Z',
    statusLabel: 'Refund in progress',
    tone: 'neutral',
    statusDetail:
      'This order was cancelled on 16 Jul before it shipped. Stripe is returning the payment to the card that paid.',
    nextStep:
      'A refund lands on your statement on the card issuer’s schedule, which Sals3 cannot see.',
    shippingMinor: 631,
    paymentLine: 'Refund issued through Stripe on 16 Jul 2026.',
    stripeReference: 'cs_live_e5F6g7H8i9J0k1L2m3nOp',
    footNote: 'Cancelled before the supplier shipped anything.',
    packages: [
      {
        id: 'o5p1',
        carrier: 'CJPacket Ordinary',
        trackingNumber: null,
        arrivalLabel: 'Never shipped',
        state: 'REFUND_PENDING',
        statusLabel: 'Cancelled',
        tone: 'neutral',
        lines: [
          {
            id: 'o5p1l1',
            title: 'Wireless earbuds, active noise cancelling',
            variant: 'Ivory',
            quantity: 1,
            unitMinor: 4599,
            acceptedOn: '2026-07-14T19:21:00Z',
          },
        ],
        events: [
          {
            label: 'Supplier order cancelled',
            at: '2026-07-16T08:44:00Z',
            source: 'SUPPLIER',
          },
        ],
      },
    ],
    timeline: [
      { label: 'Placed', at: '14 Jul 2026, 19:20', mark: 'done' },
      {
        label: 'Payment confirmed by Stripe',
        at: '14 Jul 2026, 19:21',
        mark: 'done',
      },
      { label: 'Cancelled', at: '16 Jul 2026, 08:44', mark: 'done' },
      {
        label: 'Refund settled',
        at: 'Pending with your card issuer',
        mark: 'now',
      },
    ],
    actions: [
      {
        id: 'buy-again',
        label: 'Buy again',
        kind: 'secondary',
        blockedReason: 'Buy again is not available yet',
      },
      { id: 'details', label: 'View order details', kind: 'quiet' },
      { id: 'support', label: 'Contact support', kind: 'quiet', href: '/help' },
    ],
  },
  {
    id: 'o6',
    number: 'S3-20260819-5E2C90B441',
    placedAt: '2026-08-19T11:47:00Z',
    statusLabel: 'Payment processing',
    tone: 'neutral',
    statusDetail:
      'Stripe received checkout details, but the payment is still processing. Nothing more is needed from you.',
    nextStep:
      'The supplier is not asked to prepare anything until the payment settles. This page updates itself when it does.',
    shippingMinor: 622,
    paymentLine: 'Stripe has your details; the payment has not settled yet.',
    stripeReference: 'cs_live_f6G7h8I9j0K1l2M3n4oPq',
    footNote: 'No supplier order is placed while a payment is unsettled.',
    packages: [
      {
        id: 'o6p1',
        carrier: 'Delivery option chosen at checkout',
        trackingNumber: null,
        arrivalLabel: 'Arrival window issued when it ships',
        state: 'PAYMENT_PENDING',
        statusLabel: 'On hold',
        tone: 'neutral',
        lines: [
          {
            id: 'o6p1l1',
            title: 'Refillable travel bottle set',
            variant: '4 bottles',
            quantity: 2,
            unitMinor: 2099,
            acceptedOn: '2026-08-19T11:47:00Z',
          },
        ],
      },
    ],
    timeline: [
      { label: 'Placed', at: '19 Aug 2026, 11:47', mark: 'done' },
      { label: 'Payment settling with Stripe', at: 'In progress', mark: 'now' },
      { label: 'Supplier order', at: 'Waits for settlement', mark: 'todo' },
    ],
    actions: [
      { id: 'details', label: 'View order details', kind: 'secondary' },
      { id: 'support', label: 'Contact support', kind: 'quiet', href: '/help' },
      {
        id: 'cancel',
        label: 'Cancel order',
        kind: 'quiet',
        blockedReason: 'Locked while the payment settles',
      },
    ],
  },
  {
    id: 'o7',
    number: 'S3-20260805-A31F7C0D96',
    placedAt: '2026-08-05T16:30:00Z',
    statusLabel: 'Delivery needs attention',
    tone: 'alert',
    statusDetail:
      'The carrier reported this delivered on 17 Aug. The supplier still reports it in transit. Sals3 is holding the delivered status until the two agree, rather than showing you one of them as fact.',
    nextStep:
      'If the parcel is not with you, contact support — a conflict is exactly the case they can act on.',
    shippingMinor: 641,
    paymentLine: 'Paid by card through Stripe on 05 Aug 2026.',
    stripeReference: 'cs_live_g7H8i9J0k1L2m3N4o5pQr',
    footNote: 'Two sources disagree; neither is presented as settled.',
    packages: [
      {
        id: 'o7p1',
        carrier: 'CJPacket Ordinary',
        trackingNumber: 'CJP7590441220',
        arrivalLabel: 'Arrival window has passed',
        state: 'TRACKING_CONFLICT',
        statusLabel: 'Sources disagree',
        tone: 'alert',
        lines: [
          {
            id: 'o7p1l1',
            title: 'LED desk lamp, 3 brightness levels',
            variant: 'White · USB-C',
            quantity: 1,
            unitMinor: 5499,
            acceptedOn: '2026-08-05T16:31:00Z',
          },
        ],
        events: [
          {
            label: 'Handed to the carrier',
            at: '2026-08-07T10:14:00Z',
            source: 'CARRIER',
          },
          {
            label: 'Reported delivered',
            at: '2026-08-17T13:02:00Z',
            source: 'CARRIER',
            isException: true,
          },
          {
            label: 'Reports the parcel still in transit',
            at: '2026-08-18T02:20:00Z',
            source: 'SUPPLIER',
            isException: true,
          },
        ],
      },
    ],
    timeline: [
      { label: 'Placed', at: '05 Aug 2026, 16:30', mark: 'done' },
      { label: 'Shipped', at: '07 Aug 2026, 10:14', mark: 'done' },
      {
        label: 'Carrier reported delivered',
        at: '17 Aug 2026, 13:02',
        mark: 'alert',
      },
      {
        label: 'Supplier reports in transit',
        at: '18 Aug 2026, 02:20',
        mark: 'alert',
      },
    ],
    actions: [
      {
        id: 'support',
        label: 'Contact support',
        kind: 'primary',
        href: '/help',
      },
      { id: 'details', label: 'View order details', kind: 'secondary' },
      {
        id: 'buy-again',
        label: 'Buy again',
        kind: 'quiet',
        blockedReason: 'Buy again is not available yet',
      },
    ],
  },
];

/** Newest first, the only order this page ever shows. */
export default function buildFixtureOrders(): BuyerOrder[] {
  return SEED.map(buildOrder).sort((a, b) =>
    b.placedAt.localeCompare(a.placedAt),
  );
}
