import type { OrderStatusTone, ParcelLifecycleState } from './contracts';

/**
 * Every buyer-facing word for the 21 lifecycle states, in one place.
 *
 * The portal's states are internal vocabulary (ADR-004 §2); a buyer never
 * reads `CJ_PAYMENT_PENDING`. Each state maps to a label, a tone, a sentence
 * saying where the order is, and a sentence saying whether anything is needed
 * from the buyer — because a bare pill is banned on this surface.
 *
 * `AWAITING_SUPPLIER_FUNDS` deliberately says "taking longer than expected"
 * and routes to support: explaining a supplier's wallet to a buyer would be
 * meaningless and none of their business. `TRACKING_CONFLICT` names both
 * sources and refuses to pick a winner.
 */

export type StatusCopy = {
  /** Card/pill label, e.g. `Shipped`. */
  label: string;
  /** Per-package pill label where it differs, e.g. `In transit`. */
  packageLabel: string;
  tone: OrderStatusTone;
  /** Where the order is. */
  detail: string;
  /** Whether anything is needed from the buyer. */
  nextStep: string;
};

const NOTHING_NEEDED =
  'Nothing is needed from you. Tracking updates as the carrier scans the parcel.';

const PREPARING: StatusCopy = {
  label: 'Being prepared',
  packageLabel: 'Being prepared',
  tone: 'neutral',
  detail:
    'Payment is confirmed and the supplier has the order. Nothing has shipped, so no tracking number exists yet.',
  nextStep:
    'Nothing is needed from you. A tracking number appears here when the package leaves the warehouse.',
};

const UNPAID: StatusCopy = {
  label: 'Payment not completed',
  packageLabel: 'Unpaid',
  tone: 'neutral',
  detail:
    'You left Stripe without paying. Nothing was charged and your cart is unchanged.',
  nextStep:
    'Check out again when you are ready — this record closes itself if you do nothing.',
};

const COPY: Record<ParcelLifecycleState, StatusCopy> = {
  DRAFT: UNPAID,
  CHECKOUT_PENDING: UNPAID,
  PAYMENT_PENDING: {
    label: 'Payment processing',
    packageLabel: 'On hold',
    tone: 'neutral',
    detail:
      'Stripe received checkout details, but the payment is still processing. Nothing more is needed from you.',
    nextStep:
      'The supplier is not asked to prepare anything until the payment settles. This page updates itself when it does.',
  },
  PAYMENT_FAILED: {
    label: 'Payment not completed',
    packageLabel: 'Unpaid',
    tone: 'neutral',
    detail:
      'Stripe could not complete this payment. Nothing was charged and nothing is reserved.',
    nextStep: 'Check out again when you are ready, or use a different card.',
  },
  PAID: PREPARING,
  FULFILLMENT_QUEUED: PREPARING,
  CJ_ORDER_CREATED: PREPARING,
  CJ_PAYMENT_PENDING: PREPARING,
  FULFILLING: PREPARING,
  SHIPPED: {
    label: 'Shipped',
    packageLabel: 'In transit',
    tone: 'info',
    detail: 'The package has left the warehouse and is with the carrier.',
    nextStep: NOTHING_NEEDED,
  },
  DELIVERED: {
    label: 'Delivered',
    packageLabel: 'Delivered',
    tone: 'delivered',
    detail: 'The carrier and the supplier both report this delivered.',
    nextStep: 'Nothing is needed from you. Support can still act on a problem.',
  },
  FULFILLMENT_FAILED: {
    label: 'Needs attention',
    packageLabel: 'Needs attention',
    tone: 'alert',
    detail:
      'Preparing this order hit a problem on the supplier side. Your payment is safe and nothing further is charged.',
    nextStep:
      'Nothing is needed from you yet — if this does not clear, contact support with your order number.',
  },
  AWAITING_SUPPLIER_FUNDS: {
    label: 'Taking longer than expected',
    packageLabel: 'Being prepared',
    tone: 'alert',
    detail:
      'Preparing is taking longer than expected. Your payment is confirmed and nothing further is charged.',
    nextStep:
      'Nothing is needed from you — if this does not move, contact support with your order number.',
  },
  CANCEL_REQUESTED: {
    label: 'Cancellation requested',
    packageLabel: 'Cancelling',
    tone: 'neutral',
    detail: 'A cancellation is recorded for this order and is being processed.',
    nextStep:
      'Nothing is needed from you. The refund follows once the cancellation completes.',
  },
  CANCELLED: {
    label: 'Cancelled',
    packageLabel: 'Cancelled',
    tone: 'neutral',
    detail: 'This order was cancelled before it shipped.',
    nextStep:
      'If a payment was taken, Stripe returns it to the card that paid.',
  },
  DELIVERY_EXCEPTION: {
    label: 'Delivery needs attention',
    packageLabel: 'Needs attention',
    tone: 'alert',
    detail: 'The carrier reported a problem delivering this package.',
    nextStep:
      'If the parcel is not with you, contact support — a delivery problem is exactly the case they can act on.',
  },
  TRACKING_CONFLICT: {
    label: 'Delivery needs attention',
    packageLabel: 'Sources disagree',
    tone: 'alert',
    detail:
      'The carrier and the supplier disagree about whether this package was delivered. Sals3 is holding the delivered status until the two agree, rather than showing you one of them as fact.',
    nextStep:
      'If the parcel is not with you, contact support — a conflict is exactly the case they can act on.',
  },
  REFUND_PENDING: {
    label: 'Refund in progress',
    packageLabel: 'Cancelled',
    tone: 'neutral',
    detail: 'Stripe is returning the payment to the card that paid.',
    nextStep:
      'A refund lands on your statement on the card issuer’s schedule, which Sals3 cannot see.',
  },
  REFUNDED: {
    label: 'Refunded',
    packageLabel: 'Refunded',
    tone: 'neutral',
    detail: 'Stripe has returned this payment to the card that paid.',
    nextStep:
      'Nothing is needed from you. The refund appears on your statement on the card issuer’s schedule.',
  },
  RETURN_IN_PROGRESS: {
    label: 'Return in progress',
    packageLabel: 'Returning',
    tone: 'neutral',
    detail: 'A return is recorded for this order and is being processed.',
    nextStep:
      'Nothing is needed from you until the supplier confirms the return arrived.',
  },
  RETURNED: {
    label: 'Returned',
    packageLabel: 'Returned',
    tone: 'neutral',
    detail: 'The supplier confirmed this return arrived.',
    nextStep: 'If a refund is due, it follows through Stripe.',
  },
};

export default function statusCopyOf(state: ParcelLifecycleState): StatusCopy {
  return COPY[state];
}
