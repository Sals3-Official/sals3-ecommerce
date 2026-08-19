'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SearchIcon } from '@/components/icons/Icon';
import { BUYER_STATUSES, isBuyerStatusKey } from '@/lib/orders/lanes';
import {
  isOrderRangeKey,
  ordersHref,
  type OrderRangeKey,
  type OrdersQuery,
} from '@/lib/orders/query';

/**
 * Search, date range and status — the three controls that narrow the list.
 *
 * ## Why this is the only navigational client component
 *
 * Everything else on `/orders` is a link, because everything else is a
 * destination. These three are not: a select that needs a separate "Apply"
 * press is a control most people will set and then wonder why nothing happened.
 * So this is a real `<form method="get">` — it submits on Enter with JavaScript
 * off — with a change handler that routes instead, so the URL it produces drops
 * defaults rather than carrying `?q=&range=all&status=any` around.
 *
 * ## Why the range labels arrive as props
 *
 * One of them is a year. Computing it here would read the *browser's* clock
 * during hydration and the server's during render, and a mismatch on a page
 * that is otherwise entirely server-rendered is not worth a label. The server
 * formats them; this component only shows them.
 *
 * ## Mobile
 *
 * Below `md` the three controls collapse behind one 44px button that names the
 * two filters currently applied, so a buyer can see what is narrowing the list
 * without opening anything. The panel is the same markup, revealed — not a
 * second, smaller filter set.
 */

type RangeOption = { key: OrderRangeKey; label: string };

type OrdersToolbarProps = {
  query: OrdersQuery;
  rangeOptions: readonly RangeOption[];
  /** Already-formatted summary for the mobile button, e.g. `All time · Any status`. */
  filterSummary: string;
};

export default function OrdersToolbar({
  query,
  rangeOptions,
  filterSummary,
}: OrdersToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(query.q);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(ordersHref(query, { q: term.trim() }));
  }

  function changeRange(value: string) {
    if (isOrderRangeKey(value))
      router.push(ordersHref(query, { range: value }));
  }

  function changeStatus(value: string) {
    if (isBuyerStatusKey(value))
      router.push(ordersHref(query, { status: value }));
  }

  return (
    <form method="get" action="/orders" onSubmit={submit} className="mt-4">
      <input type="hidden" name="lane" value={query.lane} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="orders-filters"
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border-strong bg-white px-4 text-sm font-bold text-ink-muted md:hidden"
      >
        <span>Filters · {filterSummary}</span>
        <span aria-hidden>{open ? '–' : '+'}</span>
      </button>

      <div
        id="orders-filters"
        className={`${open ? 'grid' : 'hidden'} mt-2.5 gap-2.5 md:mt-0 md:grid md:grid-cols-[minmax(0,1fr)_190px_190px]`}
      >
        <label
          htmlFor="orders-search"
          className="flex items-center gap-2.5 rounded-lg border border-border-strong bg-white px-3.5 py-2.5"
        >
          <SearchIcon width={16} height={16} className="text-ink-faint" />
          <span className="sr-only">Search your orders</span>
          <input
            id="orders-search"
            type="search"
            name="q"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            maxLength={120}
            placeholder="Search by order number or product name"
            className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </label>

        <label htmlFor="orders-range" className="contents">
          <span className="sr-only">Date range</span>
          <select
            id="orders-range"
            name="range"
            value={query.range}
            onChange={(event) => changeRange(event.target.value)}
            className="min-h-11 rounded-lg border border-border-strong bg-white px-3 text-[13px] text-ink-muted md:min-h-0 md:py-2.5"
          >
            {rangeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="orders-status" className="contents">
          <span className="sr-only">Order status</span>
          <select
            id="orders-status"
            name="status"
            value={query.status}
            onChange={(event) => changeStatus(event.target.value)}
            className="min-h-11 rounded-lg border border-border-strong bg-white px-3 text-[13px] text-ink-muted md:min-h-0 md:py-2.5"
          >
            {BUYER_STATUSES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <noscript>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-brand-600 px-4 text-[13px] font-bold text-brand-600"
          >
            Apply filters
          </button>
        </noscript>
      </div>
    </form>
  );
}
