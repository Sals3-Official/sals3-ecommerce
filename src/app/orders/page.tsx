import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import OrdersFlashToast from '@/components/orders/OrdersFlashToast';
import OrdersHonestyNote from '@/components/orders/OrdersHonestyNote';
import OrdersLaneTabs from '@/components/orders/OrdersLaneTabs';
import OrdersPageHeader from '@/components/orders/OrdersPageHeader';
import OrdersPageNotice from '@/components/orders/OrdersPageNotice';
import OrdersPager from '@/components/orders/OrdersPager';
import OrdersResults from '@/components/orders/OrdersResults';
import OrdersToolbar from '@/components/orders/OrdersToolbar';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';
import { filterOrders, laneCounts, paginate } from '@/lib/orders/filter';
import { BUYER_LANES, BUYER_STATUSES } from '@/lib/orders/lanes';
import { noticeFor } from '@/lib/orders/notice';
import {
  ORDER_RANGE_KEYS,
  parseOrdersQuery,
  rangeLabel,
  type RawSearchParams,
} from '@/lib/orders/query';
import { listBuyerOrders } from '@/lib/orders/read';
import {
  REVIEW_POSTED_PARAM,
  parsePostedCount,
} from '@/lib/orders/review-form';
import { SITE_NAME } from '@/lib/site';

/**
 * `/orders` — the buyer's own order list.
 *
 * ## Signed out
 *
 * A redirect, not a panel. `/checkout/success` already establishes the pattern:
 * a guarded buyer surface sends a signed-out visitor to sign-in carrying an
 * allow-listed key, so the visitor lands back here afterwards and no path in
 * the URL is ever honoured. The prototype drew an in-page "Log in to see your
 * orders" panel, which would only ever be reachable if the redirect were
 * removed — building both would leave one of them dead and untested.
 *
 * ## `noindex`
 *
 * Personal, per-account, and behind a session, the same as cart, checkout and
 * the Stripe return page. `robots.ts` allows `/` broadly because the catalogue
 * should be crawled; the exclusion belongs on the route that knows it is
 * private, not in a list somewhere else that can drift.
 *
 * ## Everything on this page is a Server Component
 *
 * except the toolbar, the copy button, the review trigger and the flash toast.
 * Lanes, filter chips and paging are links, the data is read on the server, and
 * the money strings arrive already formatted — so the list ships almost no
 * JavaScript and cannot disagree with the receipt.
 *
 * The review dialog itself is not in that bundle either: `RateReviewButton`
 * imports it dynamically, so a page of twelve orders downloads the form once,
 * on the first press, and never on a list where nothing is reviewable.
 */

export function generateMetadata(): Metadata {
  return {
    title: `My orders — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

type OrdersPageProps = {
  searchParams?: Promise<RawSearchParams>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await getBuyerSession();

  if (session === null) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'orders'));
  }

  const raw = (await searchParams) ?? {};
  const query = parseOrdersQuery(raw);
  const posted = parsePostedCount(raw[REVIEW_POSTED_PARAM]);
  const now = new Date();

  const all = await listBuyerOrders(session.email ?? '', session.uid);
  const matched = filterOrders(all, query, now);
  const counts = laneCounts(all, query, now);
  const page = paginate(matched, query.page);
  const notice = noticeFor(page.orders);

  const laneLabel =
    BUYER_LANES.find((lane) => lane.key === query.lane)?.label ?? 'All';
  const statusLabel =
    BUYER_STATUSES.find((status) => status.key === query.status)?.label ??
    'Any status';
  const rangeOptions = ORDER_RANGE_KEYS.map((key) => ({
    key,
    label: rangeLabel(key, now),
  }));
  const currentRangeLabel = rangeLabel(query.range, now);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7 pb-16">
        <OrdersPageHeader />
        <OrdersLaneTabs query={query} counts={counts} />
        <OrdersToolbar
          query={query}
          rangeOptions={rangeOptions}
          filterSummary={`${currentRangeLabel} · ${statusLabel}`}
        />

        <p className="mt-3 flex items-center justify-between gap-4 text-[13px] text-ink-muted">
          <span>
            {page.total === 1 ? '1 order' : `${page.total} orders`} in{' '}
            {laneLabel.toLowerCase()}
          </span>
          <span>Newest first</span>
        </p>

        {notice === null ? null : (
          <OrdersPageNotice title={notice.title} body={notice.body} />
        )}

        <OrdersResults
          orders={page.orders}
          query={query}
          laneLabel={laneLabel}
          rangeLabel={currentRangeLabel}
          statusLabel={statusLabel}
        />

        <OrdersPager
          query={query}
          page={page.page}
          pageCount={page.pageCount}
        />

        {page.total === 0 ? null : <OrdersHonestyNote />}
      </main>
      <OrdersFlashToast posted={posted} />
      <SiteFooter />
    </div>
  );
}
