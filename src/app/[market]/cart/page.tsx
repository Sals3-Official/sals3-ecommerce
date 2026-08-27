import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import DestinationNotice from '@/components/layout/DestinationNotice';
import CartPageClient from '@/components/cart/CartPageClient';
import { resolveDestination } from '@/lib/destination/resolve';
import {
  DEFAULT_MARKET,
  isMarketSegment,
  marketCanCheckOut,
  marketDestination,
  marketToDestinationCode,
  type MarketSegment,
} from '@/lib/destination/markets';
import marketToIndicativeCurrency from '@/lib/fx/market-currency';
import { fetchIndicativeRate } from '@/lib/fx/rates';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Cart — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

/**
 * The cart is the last screen before the sign-in wall, so it is the last place
 * a buyer can be told that checkout will not take their destination while it
 * still costs them nothing to hear it. `DestinationNotice` renders nothing for
 * the two destinations checkout accepts, so this is only a banner for the
 * buyers it is about.
 *
 * It sits above the cart rather than beside the `Proceed to Checkout` button
 * because it is also true of an empty cart, and `CartPageClient` returns early
 * in that case.
 *
 * The destination is resolved here rather than passed down from `SiteHeader`:
 * see `HeaderDestination` for why the header owns its own call, and why a
 * second `resolveDestination()` on this page costs no second read.
 *
 * ## Two destinations can be wrong, and the shopfront's own comes first
 *
 * Since the markets split there are two ways this page can be un-orderable, and
 * they are not the same fact. The buyer may be shipping somewhere checkout
 * refuses — the original case, and still what the cookie answers. Or the
 * *shopfront itself* may be one orders cannot be placed from: `/fj` is a real
 * storefront while checkout refuses a Fijian address.
 *
 * The market's own gap wins when there is one, because it is true of everybody
 * reading `/fj/cart` regardless of what they chose — including a visitor from
 * Sydney, for whom the cookie would otherwise report no problem at all.
 * Otherwise the buyer's own destination is the one that matters, exactly as
 * before.
 */
export default async function CartPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market: rawMarket } = await params;
  // The layout above 404s an unrecognised segment; this only narrows the type.
  const market: MarketSegment = isMarketSegment(rawMarket)
    ? rawMarket
    : DEFAULT_MARKET;
  /*
    The cart total is computed in the browser from localStorage, so the
    approximate figure beside it has to be too. The **rate** is not: it is
    fetched here, once, and passed down as a prop. A client-side fetch would put
    a third-party request on every cart view, lose the six-hour server cache,
    and paint the number in after hydration beside a price that was already
    correct — which is the exact shape of "the approximate one looked like the
    real one" this display is built to avoid.
  */
  /*
    The market is passed to `resolveDestination` for the same reason the header
    passes it, and leaving it out here was a real defect found in the browser on
    2026-08-28: `/ph/cart` showed "Ship to: Philippines" in the header and, two
    inches below, a banner saying orders could not be placed to the buyer's
    destination — because the header had the market and this call did not, so it
    fell through to Global. One page, two answers, neither of them wrong on its
    own. Every `resolveDestination` call inside a market must name it.
  */
  const [{ destination }, indicativeRate] = await Promise.all([
    resolveDestination(marketToDestinationCode(market)),
    fetchIndicativeRate(marketToIndicativeCurrency(market)),
  ]);
  const noticeDestination = marketCanCheckOut(market)
    ? destination
    : marketDestination(market);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader market={market} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <DestinationNotice destination={noticeDestination} />
        <CartPageClient market={market} indicativeRate={indicativeRate} />
      </main>
      <SiteFooter market={market} />
    </div>
  );
}
