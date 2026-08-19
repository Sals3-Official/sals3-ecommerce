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
 * Both functions take the **verified session email** and nothing from the
 * request; it travels to the portal in the `X-Buyer-Email` header, and the
 * portal filters on it inside the query. A detail read of an order the
 * session does not own returns `null`, indistinguishable from an unknown
 * number — the same posture `/checkout/success` takes with a Stripe id.
 *
 * ## Why `cache`
 *
 * `/orders/[orderNumber]` reads the order twice in one render — once in
 * `generateMetadata` and once in the page. React's per-request cache collapses
 * that into one portal call.
 */

export const listBuyerOrders = cache(
  async (email: string): Promise<BuyerOrder[]> => {
    if (email === '') return [];

    const payloads = await fetchBuyerOrders(email);

    return payloads
      .map(toBuyerOrder)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  },
);

export const readBuyerOrder = cache(
  async (email: string, orderNumber: string): Promise<BuyerOrder | null> => {
    if (email === '') return null;

    const payload = await fetchBuyerOrder(
      email,
      orderNumber.trim().toUpperCase(),
    );

    return payload === null ? null : toBuyerOrder(payload);
  },
);
