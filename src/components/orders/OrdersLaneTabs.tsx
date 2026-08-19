import Link from 'next/link';
import { BUYER_LANES, type BuyerLaneKey } from '@/lib/orders/lanes';
import { ordersHref, type OrdersQuery } from '@/lib/orders/query';

/**
 * The lanes, as links.
 *
 * ## Why anchors and not buttons
 *
 * The lane is URL state, so a tab is a destination. Making them `next/link`
 * anchors means Back works, a lane is shareable, middle-click opens a tab, and
 * the whole list stays a Server Component with no client bundle at all.
 *
 * ## Why only four lanes count
 *
 * A count is a claim that something is waiting. `All` measures nothing by
 * definition, and an unpaid checkout is not work the buyer owes anyone — the
 * portal holds the same rule through `LANES[].showsCount`. Counts are computed
 * against everything except the lane filter, so switching tabs does not make
 * the other tabs' numbers move.
 *
 * Desktop is an underlined strip; mobile is a scrolling row of pills, which is
 * the same navigation rather than a reduced one.
 */

type OrdersLaneTabsProps = {
  query: OrdersQuery;
  counts: Record<BuyerLaneKey, number>;
};

export default function OrdersLaneTabs({ query, counts }: OrdersLaneTabsProps) {
  return (
    <nav aria-label="Order lanes" className="mt-5">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border pb-2 sm:gap-1 sm:pb-0">
        {BUYER_LANES.map((lane) => {
          const active = lane.key === query.lane;
          const count = counts[lane.key] ?? 0;

          return (
            <li key={lane.key} className="flex-none">
              <Link
                href={ordersHref(query, { lane: lane.key })}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center rounded-full border px-3.5 py-2 text-sm whitespace-nowrap hover:no-underline sm:rounded-none sm:border-0 sm:border-b-2 sm:px-3.5 sm:py-2.5 ${
                  active
                    ? 'border-brand-900 bg-brand-900 font-bold text-white sm:bg-transparent sm:text-brand-900'
                    : 'border-border-strong bg-white font-medium text-ink-muted sm:border-transparent sm:bg-transparent'
                }`}
              >
                {lane.label}
                {lane.showsCount ? (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] font-bold ${
                      active
                        ? 'bg-white/20 text-white sm:bg-brand-600/12 sm:text-brand-900'
                        : 'bg-surface-sunken-strong text-ink-muted'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
