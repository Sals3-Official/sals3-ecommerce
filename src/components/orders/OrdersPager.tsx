import Link from 'next/link';
import { ordersHref, type OrdersQuery } from '@/lib/orders/query';

/**
 * Previous / next, and nothing else.
 *
 * Numbered pages are a promise that page 4 means something stable. An order
 * list is newest-first and grows from the top, so a bookmarked page number
 * quietly drifts to different orders. Two links and a position line say what is
 * true without implying more.
 *
 * Renders nothing at all when there is one page, rather than a disabled pair
 * that suggests there is somewhere else to go.
 */

const LINK =
  'inline-flex min-h-10 items-center rounded-lg border border-border-strong bg-white px-4 text-[13px] font-bold text-ink-muted hover:bg-surface-sunken hover:no-underline';

type OrdersPagerProps = {
  query: OrdersQuery;
  page: number;
  pageCount: number;
};

export default function OrdersPager({
  query,
  page,
  pageCount,
}: OrdersPagerProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Order list pages"
      className="mt-5 flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Link href={ordersHref(query, { page: page - 1 })} className={LINK}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-[13px] text-ink-muted">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={ordersHref(query, { page: page + 1 })} className={LINK}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
