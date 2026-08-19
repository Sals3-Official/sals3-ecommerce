import 'server-only';

import { z } from 'zod';
import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_ORDERS_PATH,
} from './client';

/**
 * The portal's buyer orders read API, typed at the boundary.
 *
 * `GET /api/storefront/orders` and `/orders/{orderNumber}` are server-to-server
 * calls: the shared bearer token authenticates the storefront, and the
 * `X-Buyer-Email` header carries the **session-verified** email that scopes the
 * read. Nothing in this module may ever put a request-supplied address in that
 * header — the caller (`lib/orders/read.ts`) only passes what the verified
 * session cookie said.
 *
 * Every payload is zod-parsed before it becomes data, exactly like the product
 * feed: a drifting portal field fails loudly here rather than rendering as a
 * blank on an order a buyer is worried about.
 */

export const PARCEL_LIFECYCLE_STATE_VALUES = [
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

const orderLineSchema = z.object({
  id: z.string(),
  title: z.string(),
  variantLabel: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitAmountMinor: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
  acceptedAt: z.string(),
});

const trackingEventSchema = z.object({
  id: z.string(),
  source: z.enum(['CARRIER', 'SUPPLIER', 'OPERATIONS']),
  label: z.string(),
  occurredAt: z.string(),
  isException: z.boolean(),
});

const packageSchema = z.object({
  packageId: z.string(),
  carrier: z.string(),
  trackingNumber: z.string().nullable(),
  parcelState: z.enum(PARCEL_LIFECYCLE_STATE_VALUES).nullable(),
  fulfillmentStatus: z.string(),
  shippingAmountMinor: z.number().int().nonnegative(),
  arrivalDays: z.string().nullable(),
  lines: z.array(orderLineSchema),
  events: z.array(trackingEventSchema),
});

const shipToSchema = z.object({
  name: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  region: z.string(),
  postalCode: z.string(),
  country: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
});

export const buyerOrderPayloadSchema = z.object({
  orderNumber: z.string(),
  placedAt: z.string(),
  paymentStatus: z.enum(['PAID', 'REFUNDED', 'DISPUTED']),
  currency: z.string(),
  amountTotalMinor: z.number().int().nonnegative(),
  stripeCheckoutSessionId: z.string(),
  packages: z.array(packageSchema),
  shipTo: shipToSchema,
});

const ordersListSchema = z.object({
  orders: z.array(buyerOrderPayloadSchema),
});

const orderDetailSchema = z.object({ order: buyerOrderPayloadSchema });

export type BuyerOrderPayload = z.infer<typeof buyerOrderPayloadSchema>;
export type BuyerOrderPackagePayload = z.infer<typeof packageSchema>;
export type BuyerOrderLinePayload = z.infer<typeof orderLineSchema>;
export type BuyerTrackingEventPayload = z.infer<typeof trackingEventSchema>;

function buyerHeaders(verifiedEmail: string): Record<string, string> {
  return { 'X-Buyer-Email': verifiedEmail };
}

export async function fetchBuyerOrders(
  verifiedEmail: string,
  options: { fetcher?: typeof fetch } = {},
): Promise<BuyerOrderPayload[]> {
  const payload = await requestStorefrontJson(
    {
      url: getStorefrontApiUrl(STOREFRONT_ORDERS_PATH).toString(),
      schema: ordersListSchema,
      subject: 'orders',
    },
    {
      ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
      headers: buyerHeaders(verifiedEmail),
    },
  );

  return payload?.orders ?? [];
}

export async function fetchBuyerOrder(
  verifiedEmail: string,
  orderNumber: string,
  options: { fetcher?: typeof fetch } = {},
): Promise<BuyerOrderPayload | null> {
  const payload = await requestStorefrontJson(
    {
      url: getStorefrontApiUrl(
        `${STOREFRONT_ORDERS_PATH}/${encodeURIComponent(orderNumber)}`,
      ).toString(),
      schema: orderDetailSchema,
      subject: 'order detail',
      // The portal answers 404 for unknown AND not-yours alike; both read as
      // "no such order" here, which is the behaviour the page wants.
      notFoundStatuses: [404],
    },
    {
      ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
      headers: buyerHeaders(verifiedEmail),
    },
  );

  return payload?.order ?? null;
}
