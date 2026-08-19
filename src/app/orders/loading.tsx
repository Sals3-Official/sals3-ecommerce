import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import OrdersPageHeader from '@/components/orders/OrdersPageHeader';
import OrdersSkeleton from '@/components/orders/OrdersSkeleton';

/**
 * Shown while the orders read resolves.
 *
 * The header block is real rather than skeletonised: it is static text that
 * needs no data, and rendering it immediately means the page identifies itself
 * before it can say what is in it. Only the part that is genuinely unknown
 * pulses.
 */

export default function OrdersLoading() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7 pb-16">
        <OrdersPageHeader />
        <OrdersSkeleton />
      </main>
      <SiteFooter />
    </div>
  );
}
