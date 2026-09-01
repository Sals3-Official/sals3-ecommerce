import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { SkeletonBar, SkeletonBlock } from '@/components/ui/Skeleton';

/**
 * Shown while the cart page's destination and FX reads resolve.
 *
 * The cart's contents come from the browser, not the Portal, so what this
 * actually covers is the indicative-rate and funding-buffer pair the page awaits
 * before rendering. Both are cached for an hour and both carry a 1.5s timeout,
 * so this is the shortest-lived fallback on the site — worth having because the
 * cart sits directly in front of checkout, where a page that looks frozen costs
 * an order rather than a click.
 *
 * No line count is implied: two rows would be a guess about someone's basket.
 * The rows here are a shape, and the announcement says only that it is loading.
 */
export default function CartLoading() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <div aria-busy className="animate-s3pulse">
          <SkeletonBar width="140px" height={21} />
          <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-3">
              {['a', 'b'].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-3.5 rounded-xl border border-border bg-white p-4"
                >
                  <SkeletonBlock
                    className="h-20 w-20 shrink-0 rounded-lg"
                    soft
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <SkeletonBar width="62%" height={10} />
                    <SkeletonBar width="34%" height={8} soft />
                  </div>
                  <SkeletonBar width="74px" height={13} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
              <SkeletonBar width="52%" height={12} />
              <div className="my-4 h-px bg-border" />
              <div className="flex flex-col gap-2.5">
                <SkeletonBar width="100%" height={9} soft />
                <SkeletonBar width="78%" height={9} soft />
              </div>
              <SkeletonBlock className="mt-4 h-[42px] w-full rounded-lg" />
            </div>
          </div>
        </div>
        <p aria-live="polite" className="mt-3.5 text-[13px] text-ink-muted">
          Loading your cart…
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
