import 'server-only';

import type Stripe from 'stripe';
import { formatMoney, isSupportedCurrency } from '@/lib/money';
import {
  SHIPPING_TIERS,
  type ShippingTier,
} from '@/lib/checkout/shipping-tiers';

/**
 * Turns a Stripe Checkout Session into the receipt shown on
 * `/checkout/success`.
 *
 * A Data Transfer Object, deliberately: the session object carries payment
 * method fingerprints, customer ids, and raw metadata that the page has no
 * business rendering, so only display strings cross this boundary. Amounts are
 * formatted here rather than in the component, because the currency check has
 * to happen somewhere that can fail loudly.
 *
 * Everything below is read from data this app itself wrote at session creation
 * (see `services/stripe/checkout.ts`) — including `sals3_line_count`, which is
 * how the shipping line is told apart from the product lines without matching
 * on a display name.
 */

export type ReceiptItem = {
  id: string;
  title: string;
  quantity: number;
  imageUrl?: string;
  lineTotal: string;
};

export type ReceiptDeliveryPackage = {
  id: string;
  shippingTier?: ShippingTier;
  arrivalTime?: string;
};

export type ReceiptDelivery = {
  service?: string;
  amount?: string;
  packages: ReceiptDeliveryPackage[];
};

export type ReceiptShipTo = {
  fullName?: string;
  phone?: string;
  addressLine: string;
};

export type CheckoutReceipt = {
  items: ReceiptItem[];
  delivery?: ReceiptDelivery;
  shipTo?: ReceiptShipTo;
  customerEmail?: string;
};

function formatAmount(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
): string | undefined {
  const currencyCode = currency?.toUpperCase();

  if (
    amountMinor === null ||
    amountMinor === undefined ||
    currencyCode === undefined ||
    !isSupportedCurrency(currencyCode)
  ) {
    return undefined;
  }

  return formatMoney({ amountMinor, currency: currencyCode });
}

/** The product image, when Stripe returned an expanded, non-deleted product. */
function imageOf(price: Stripe.Price | null | undefined): string | undefined {
  const product = price?.product;

  if (typeof product !== 'object' || product === null || product.deleted) {
    return undefined;
  }

  return product.images?.[0];
}

function positiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * `sals3_shipping_options` is a comma-joined list of
 * `packageId:optionId:channelId:amountMinor:arrivalTime`. Fields are read from
 * the end rather than the start, so an id that itself contains a colon shifts
 * nothing: the arrival window is always last.
 */
function deliveryPackagesOf(options: string | undefined) {
  if (options === undefined || options === '') {
    return [];
  }

  return options
    .split(',')
    .filter((entry) => entry !== '')
    .map((entry, index) => {
      const parts = entry.split(':');
      const arrivalTime = parts.at(-1);

      return {
        id: parts[0] || `package-${index + 1}`,
        ...(arrivalTime === undefined || arrivalTime === ''
          ? {}
          : { arrivalTime }),
      };
    });
}

function deliveryPackagesV2(delivery: string | undefined) {
  if (delivery === undefined || delivery === '') return [];

  return delivery
    .split(',')
    .filter((entry) => entry !== '')
    .flatMap((entry, index) => {
      const separator = entry.indexOf(':');
      const tier = entry.slice(0, separator);
      const arrivalTime = entry.slice(separator + 1);

      if (
        separator < 1 ||
        !SHIPPING_TIERS.some((candidate) => candidate === tier)
      ) {
        return [];
      }

      return [
        {
          id: `package-${index + 1}`,
          shippingTier: tier as ShippingTier,
          ...(arrivalTime === '' ? {} : { arrivalTime }),
        },
      ];
    });
}

/**
 * The buyer-facing service name lives in the shipping line item. Version 1
 * stored the CJ courier; version 2 stores the Sals3 tier (or mixed-tier copy).
 * The prefix is stripped for display so both receipt versions remain readable.
 */
function serviceOf(description: string | null | undefined) {
  if (description === null || description === undefined) {
    return undefined;
  }

  const withoutPrefix = description.replace(/^Shipping\s*-\s*/i, '').trim();

  return withoutPrefix === '' ? undefined : withoutPrefix;
}

function addressLineOf(address: Stripe.Address | null | undefined) {
  if (!address) {
    return undefined;
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join(', ');
}

function shipToOf(session: Stripe.Checkout.Session): ReceiptShipTo | undefined {
  const paymentIntent = session.payment_intent;
  const shipping =
    typeof paymentIntent === 'object' && paymentIntent !== null
      ? paymentIntent.shipping
      : undefined;
  const addressLine = addressLineOf(shipping?.address);

  if (addressLine === undefined || addressLine === '') {
    return undefined;
  }

  return {
    ...(shipping?.name ? { fullName: shipping.name } : {}),
    ...(shipping?.phone ? { phone: shipping.phone } : {}),
    addressLine,
  };
}

export default function toCheckoutReceipt(
  session: Stripe.Checkout.Session,
): CheckoutReceipt {
  const lineItems = session.line_items?.data ?? [];
  const productCount =
    positiveInteger(session.metadata?.sals3_line_count) ??
    Math.max(lineItems.length - 1, 0);
  const shippingLine = lineItems[productCount];

  const items = lineItems.slice(0, productCount).map((line, index) => ({
    id: line.id || `line-${index + 1}`,
    title: line.description ?? 'Item',
    quantity: line.quantity ?? 1,
    ...(imageOf(line.price) === undefined
      ? {}
      : { imageUrl: imageOf(line.price)! }),
    lineTotal:
      formatAmount(line.amount_total, line.currency ?? session.currency) ??
      'Amount unavailable',
  }));

  const packages =
    session.metadata?.sals3_checkout_version === 'cj_freight_v2'
      ? deliveryPackagesV2(session.metadata.sals3_shipping_delivery)
      : deliveryPackagesOf(session.metadata?.sals3_shipping_options);
  const service = serviceOf(shippingLine?.description);
  const shippingAmount = formatAmount(
    positiveInteger(session.metadata?.sals3_shipping_total_minor) ??
      shippingLine?.amount_total,
    session.currency,
  );

  return {
    items,
    ...(service === undefined && packages.length === 0
      ? {}
      : {
          delivery: {
            ...(service === undefined ? {} : { service }),
            ...(shippingAmount === undefined ? {} : { amount: shippingAmount }),
            packages,
          },
        }),
    ...(shipToOf(session) === undefined ? {} : { shipTo: shipToOf(session)! }),
    ...(session.customer_details?.email
      ? { customerEmail: session.customer_details.email }
      : {}),
  };
}
