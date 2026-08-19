import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/icons/Icon';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import CopyOrderNumber from '@/components/orders/CopyOrderNumber';
import OrderActions from '@/components/orders/OrderActions';
import OrderHistoryFeed from '@/components/orders/OrderHistoryFeed';
import OrderPackageBlock from '@/components/orders/OrderPackageBlock';
import OrderPaymentSummary from '@/components/orders/OrderPaymentSummary';
import OrderShipTo from '@/components/orders/OrderShipTo';
import OrderStatusPill from '@/components/orders/OrderStatusPill';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';
import { ORDERS_PATH } from '@/lib/orders/query';
import { readBuyerOrder } from '@/lib/orders/read';
import { SITE_NAME } from '@/lib/site';

/**
 * `/orders/[orderNumber]` — one order, in full.
 *
 * ## Why the number and not the uuid
 *
 * `S3-20260812-9F3C1A7B2E` is the reference the buyer already holds from
 * checkout and quotes to support. A uuid in the address bar would be a second
 * identifier for the same thing, which nobody could use.
 *
 * ## Holding the number is not authorisation
 *
 * `readBuyerOrder` takes the verified session email first and the number
 * second, and resolves only within the list that session owns. An order
 * belonging to somebody else therefore takes the same path as one that does not
 * exist — `notFound()`, with wording that does not say "not yours". Whether an
 * order number exists is not something an unauthorised reader should be able to
 * learn by trying (rules 20, 21 and 34), and it is the same posture
 * `/checkout/success` takes with a Stripe session id.
 *
 * ## The two feeds
 *
 * The left column carries the packages and their carrier/supplier events; the
 * right rail carries Sals3's own lifecycle record. They are deliberately not
 * merged — see `OrderHistoryFeed`.
 */

/** Long enough for the real format, short enough that nothing else fits. */
const MAX_ORDER_NUMBER_LENGTH = 40;

type OrderDetailPageProps = {
  params: Promise<{ orderNumber: string }>;
};

async function readOwnOrder(orderNumber: string) {
  const session = await getBuyerSession();

  if (session === null) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'orders'));
  }

  return readBuyerOrder(
    session.email ?? '',
    decodeURIComponent(orderNumber).slice(0, MAX_ORDER_NUMBER_LENGTH),
  );
}

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  const order = await readOwnOrder(orderNumber);

  return {
    // The number is only in the title once it is known to be the reader's own.
    title:
      order === null
        ? `Order — ${SITE_NAME}`
        : `Order ${order.number} — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderNumber } = await params;
  const order = await readOwnOrder(orderNumber);

  if (order === null) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7 pb-16">
        <Link
          href={ORDERS_PATH}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-600"
        >
          <ChevronLeftIcon width={16} height={16} />
          All orders
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.06em] uppercase text-brand-600">
              Order record
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[26px] font-semibold tracking-[0.01em] text-ink">
                {order.number}
              </h1>
              <CopyOrderNumber value={order.number} />
            </div>
            <p className="mt-1.5 text-sm text-ink-muted">{order.metaLine}</p>
          </div>
          <OrderStatusPill tone={order.tone}>
            {order.statusLabel}
          </OrderStatusPill>
        </div>

        <div className="mt-5 grid items-start gap-4.5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            <section
              aria-labelledby="order-status"
              className={`rounded-xl border border-border border-l-[3px] bg-white px-4.5 py-4 ${
                order.hasException ? 'border-l-red-600' : 'border-l-brand-600'
              }`}
            >
              <h2 id="order-status" className="text-[15px] font-bold text-ink">
                {order.statusLabel}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {order.statusDetail}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {order.nextStep}
              </p>
            </section>

            {order.packages.map((pkg) => (
              <section
                key={pkg.id}
                className="overflow-hidden rounded-xl border border-border bg-white"
              >
                <OrderPackageBlock package={pkg} showEvents />
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-3.5">
            <OrderPaymentSummary order={order} />
            <OrderShipTo shipTo={order.shipTo} />
            <OrderHistoryFeed timeline={order.timeline} />
            <section
              aria-label="Order actions"
              className="rounded-xl border border-border bg-white px-4.5 py-4"
            >
              <OrderActions actions={order.actions} stacked />
              <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
                {order.footNote}
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
