import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import DestinationNotice from '@/components/layout/DestinationNotice';
import CartPageClient from '@/components/cart/CartPageClient';
import { resolveDestination } from '@/lib/destination/resolve';
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
 */
export default async function CartPage() {
  const { destination } = await resolveDestination();

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <DestinationNotice destination={destination} />
        <CartPageClient />
      </main>
      <SiteFooter />
    </div>
  );
}
