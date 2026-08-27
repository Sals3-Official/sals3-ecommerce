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
  type MarketSegment,
} from '@/lib/destination/markets';
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
  const { destination } = await resolveDestination();
  const noticeDestination = marketCanCheckOut(market)
    ? destination
    : marketDestination(market);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader market={market} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <DestinationNotice destination={noticeDestination} />
        <CartPageClient market={market} />
      </main>
      <SiteFooter market={market} />
    </div>
  );
}
