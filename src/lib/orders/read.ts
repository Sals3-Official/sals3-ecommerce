import 'server-only';

import { cache } from 'react';
import type { BuyerOrder } from './contracts';
import buildFixtureOrders from './fixtures';

/**
 * The one seam between the buyer orders UI and its data.
 *
 * ## Why it reads a fixture today
 *
 * The portal publishes no buyer orders read API. `storefront/client.ts` covers
 * products, categories, freight quotes, checkout intents and `orders/accept`,
 * and nothing there lists a buyer's orders or reads one back by number. Rather
 * than block the screens, both functions return `fixtures.ts` and this file is
 * where `GET /api/storefront/orders` lands the day it exists — the components
 * above it never learn which it was.
 *
 * ## The ownership rule survives the swap
 *
 * Both functions take the **verified session email** and nothing from the
 * request. A detail page resolves an order number only within the list the
 * session owns, so an order belonging to somebody else is indistinguishable
 * from one that does not exist — the same posture, and the same wording, that
 * `/checkout/success` uses. Holding an order number is not authorisation
 * (rules 20 and 21).
 *
 * ## Why `cache`
 *
 * `/orders/[orderNumber]` reads the list twice in one render: once in
 * `generateMetadata` and once in the page. React's per-request cache collapses
 * that into one read now and one fetch later.
 */

async function loadOrders(email: string): Promise<BuyerOrder[]> {
  // The email is not a filter yet — there is nothing to filter against — but it
  // is required so that no call site can be written today that would have to
  // grow an authorisation argument tomorrow.
  if (email === '') return [];

  return buildFixtureOrders();
}

export const listBuyerOrders = cache(
  async (email: string): Promise<BuyerOrder[]> => loadOrders(email),
);

export const readBuyerOrder = cache(
  async (email: string, orderNumber: string): Promise<BuyerOrder | null> => {
    const orders = await loadOrders(email);

    return (
      orders.find(
        (order) => order.number.toUpperCase() === orderNumber.toUpperCase(),
      ) ?? null
    );
  },
);
