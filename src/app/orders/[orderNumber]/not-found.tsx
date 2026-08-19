import Link from 'next/link';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { ORDERS_PATH } from '@/lib/orders/query';

/**
 * An order number that this account cannot read.
 *
 * The wording covers two different situations on purpose — a number that does
 * not exist, and one that belongs to a different account — because telling
 * them apart is exactly what a stranger trying numbers would want. "We could
 * not find it on this account" is true of both and reveals neither.
 */

export default function OrderNotFound() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7 pb-16">
        <section className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-white px-8 py-9">
          <p className="text-xs font-semibold tracking-[0.06em] uppercase text-brand-600">
            Order record
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-semibold text-ink">
            We could not find that order on this account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Orders are tied to the email that paid for them, so an order number
            alone does not open one. Check that you are signed in with the
            address you used at checkout.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href={ORDERS_PATH}
              className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-6 text-sm font-bold text-white hover:opacity-90 hover:no-underline"
            >
              All orders
            </Link>
            <Link
              href="/help"
              className="inline-flex min-h-11 items-center rounded-lg border border-brand-600 px-6 text-sm font-bold text-brand-600 hover:bg-brand-600/10 hover:no-underline"
            >
              Contact support
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
