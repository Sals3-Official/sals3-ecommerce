import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import DestinationNotice from '@/components/layout/DestinationNotice';
import CartPageClient from '@/components/cart/CartPageClient';
import { resolveDestination } from '@/lib/destination/resolve';
import destinationToIndicativeCurrency from '@/lib/fx/destination-currency';
import destinationToCheckoutCountry from '@/lib/destination/destination-checkout-country';
import { fetchIndicativeRate } from '@/lib/fx/rates';
import fetchFxBuffer from '@/lib/fx/buffer';
import fetchFreeShippingThresholds, {
  EMPTY_FREE_SHIPPING_THRESHOLDS,
} from '@/lib/fx/free-shipping-thresholds';
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
  /*
    Same guess, narrowed to the three countries `free-shipping.ts` has a
    configured threshold for. `undefined` for the same reasons `currency` can
    be `undefined`: Global, New Zealand, the United States and Canada have no
    entry either place.
  */
  const checkoutCountry = destinationToCheckoutCountry(destination.code);
  /*
    In parallel: the buffer, the rate and the thresholds are three independent
    reads that all sit on the render path. Sequencing any of them would add
    its latency to the slowest of the other two for no gain.
  */
  const [indicativeRate, fxBufferPercent, freeShippingThresholds] =
    await Promise.all([
      currency === undefined ? null : fetchIndicativeRate(currency),
      currency === undefined ? null : fetchFxBuffer(),
      checkoutCountry === undefined
        ? EMPTY_FREE_SHIPPING_THRESHOLDS
        : fetchFreeShippingThresholds(),
    ]);
  const freeShippingThresholdAmountMinor =
    checkoutCountry === undefined
      ? undefined
      : freeShippingThresholds[checkoutCountry];
  /*
    Coupled to the threshold on purpose: a destination with no resolved amount
    gets no name attached to it either, so `FreeShippingNotice` cannot show a
    country with nothing to say about it.
  */
  const freeShippingDestinationLabel =
    freeShippingThresholdAmountMinor === undefined
      ? undefined
      : (destination.proseLabel ?? destination.label);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <DestinationNotice destination={destination} />
        <CartPageClient
          indicativeRate={indicativeRate}
          fxBufferPercent={fxBufferPercent}
          freeShippingThresholdAmountMinor={freeShippingThresholdAmountMinor}
          freeShippingDestinationLabel={freeShippingDestinationLabel}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
