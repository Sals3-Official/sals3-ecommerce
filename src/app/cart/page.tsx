import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import DestinationNotice from '@/components/layout/DestinationNotice';
import CartPageClient from '@/components/cart/CartPageClient';
import { resolveDestination } from '@/lib/destination/resolve';
import destinationToIndicativeCurrency from '@/lib/fx/destination-currency';
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
 * the destinations checkout accepts, so this is only a banner for the
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
 * ## One destination again
 *
 * Between 2026-08-27 and 2026-08-28 there were two ways this page could be
 * un-orderable and they were different facts — the buyer's chosen destination,
 * and the shopfront's own, because `/fj` was a real storefront checkout refused.
 * With one storefront there is one fact: what the buyer chose. That is also the
 * value the header shows two rows above, and there is no longer a URL that can
 * disagree with it.
 */
export default async function CartPage() {
  /*
    The cart total is computed in the browser from localStorage, so the
    approximate figure beside it has to be too. The **rate** is not: it is
    fetched here, once, and passed down as a prop. A client-side fetch would put
    a third-party request on every cart view, lose the six-hour server cache,
    and paint the number in after hydration beside a price that was already
    correct — which is the exact shape of "the approximate one looked like the
    real one" this display is built to avoid.
  */
  const destination = await resolveDestination();
  /*
    No currency for this destination means no approximate figure at all, rather
    than one converted through a rate nobody named — New Zealand, the United
    States, Canada and Global have no provider in `rates.ts`.
  */
  const currency = destinationToIndicativeCurrency(destination.code);
  const indicativeRate =
    currency === undefined ? null : await fetchIndicativeRate(currency);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <DestinationNotice destination={destination} />
        <CartPageClient indicativeRate={indicativeRate} />
      </main>
      <SiteFooter />
    </div>
  );
}
