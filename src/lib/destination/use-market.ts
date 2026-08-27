'use client';

import { useParams } from 'next/navigation';
import { DEFAULT_MARKET, isMarketSegment, type MarketSegment } from './markets';

/**
 * The market segment of the route the browser is currently on.
 *
 * ## When to reach for this instead of a prop
 *
 * A prop, by default. Every page under `src/app/[market]/` already knows its
 * own market and can hand it down, and a prop is the version that survives a
 * component being reused somewhere the URL shape is different.
 *
 * This exists for the two cases a prop cannot reach:
 *
 * 1. **Boundaries Next renders with no params of their own.** `not-found.tsx`
 *    and `error.tsx` take fixed signatures — neither receives `params` — so a
 *    link inside one has no other way to learn its market.
 * 2. **Threading that would touch more files than it is worth.** A client leaf
 *    four levels below the page is not worth four intermediate `market` props
 *    whose only purpose is to reach it.
 *
 * ## Why the fallback is not a thrown error
 *
 * `useParams()` answers `null` outside the app router — in a jsdom unit test,
 * and in any tree rendered without a route — and returns no `market` at all on
 * the account routes (`/login`, `/checkout`, `/orders`) that deliberately stay
 * unscoped. Neither is a bug worth taking a page down for, so both resolve to
 * `DEFAULT_MARKET`: the same answer `/` gives a visitor who has expressed no
 * preference.
 *
 * That fallback is only safe because it is a *link target*, never a
 * destination the buyer is told they are shopping to. Nothing here decides
 * what is priced or where an order can go — `resolveDestination()` owns that,
 * server-side, and the market layout owns rejecting an unknown segment.
 */
export default function useMarket(): MarketSegment {
  const params = useParams<{ market?: string | string[] }>();
  const value = params?.market;

  // A catch-all route could in principle hand back an array; a single segment
  // is the only shape this app produces, and anything else is not a market.
  return typeof value === 'string' && isMarketSegment(value)
    ? value
    : DEFAULT_MARKET;
}
