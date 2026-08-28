import 'server-only';

import { cache } from 'react';
import {
  fetchBuyerOrder,
  fetchBuyerOrders,
} from '@/services/storefront/orders';
import type { BuyerOrder } from './contracts';
import toBuyerOrder from './from-api';

/**
 * The one seam between the buyer orders UI and its data.
 *
 * Reads the portal's buyer orders API (`GET /api/storefront/orders*`, shipped
 * 2026-08-19) through `services/storefront/orders.ts` and maps the payload in
 * `from-api.ts`. The fixture module this file used to serve while no API
 * existed remains for tests only — it is not a fallback here, because a failed
 * fetch must read as a failure (the route's error boundary), never as somebody
 * else's orders.
 *
 * ## The ownership rule
 *
 * Both functions take the **verified session uid and email** and nothing from
 * the request; they travel to the portal as `X-Buyer-Uid` and `X-Buyer-Email`,
 * and the portal filters on them inside the query. A detail read of an order
 * the session does not own returns `null`, indistinguishable from an unknown
 * number — the same posture `/checkout/success` takes with a Stripe id.
 *
 * The uid is the one that matters. Email scopes only the orders placed before
 * `buyer_uid` existed, because an order's email is the contact address typed
 * into the checkout form — a mailbox, not a person. Passing it alone is what
 * hid a buyer's own paid order from them on 2026-08-28.
 *
 * ## Why `cache`
 *
 * `/orders/[orderNumber]` reads the order twice in one render — once in
 * `generateMetadata` and once in the page. React's per-request cache collapses
 * that into one portal call.
 */

export const listBuyerOrders = cache(
  async (email: string, uid?: string): Promise<BuyerOrder[]> => {
    if (email === '') return [];

    const payloads = await fetchBuyerOrders(email, {
      ...(uid === undefined || uid === '' ? {} : { verifiedUid: uid }),
    });

    return payloads
      .map(toBuyerOrder)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  },
);

export const readBuyerOrder = cache(
  async (
    email: string,
    orderNumber: string,
    uid?: string,
  ): Promise<BuyerOrder | null> => {
    if (email === '') return null;

    const payload = await fetchBuyerOrder(
      email,
      orderNumber.trim().toUpperCase(),
      { ...(uid === undefined || uid === '' ? {} : { verifiedUid: uid }) },
    );

    return payload === null ? null : toBuyerOrder(payload);
  },
);
