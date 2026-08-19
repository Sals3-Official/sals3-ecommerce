import Link from 'next/link';
import {
  DEFAULT_ORDERS_QUERY,
  ORDERS_PATH,
  ordersHref,
  type OrdersQuery,
} from '@/lib/orders/query';

/**
 * Nothing matched — and it says which filters are responsible.
 *
 * "No results" tells a buyer that their orders are gone. This panel names each
 * active filter in words, offers each one back as a chip that removes only
 * itself, and says plainly that the orders are still there. The distinction
 * matters most in the case that produces it: someone searching for an order
 * they are worried about.
 *
 * The chips are links, like every other navigation on this page, so removing a
 * filter is a URL the buyer can hold rather than a client state they can lose.
 */

type ActiveFilter = {
  id: string;
  /** `Search “solar lamp”` — used in the sentence. */
  phrase: string;
  /** `Search: solar lamp` — used on the chip. */
  chip: string;
  href: string;
};

type OrdersFilteredPanelProps = {
  query: OrdersQuery;
  laneLabel: string;
  rangeLabel: string;
  statusLabel: string;
};

/** Spelled out so the heading reads as a sentence, not a tally. */
const COUNT_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four' };

function joinPhrases(phrases: string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? '';
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;

  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}

export default function OrdersFilteredPanel({
  query,
  laneLabel,
  rangeLabel,
  statusLabel,
}: OrdersFilteredPanelProps) {
  const filters: ActiveFilter[] = [
    ...(query.q === ''
      ? []
      : [
          {
            id: 'q',
            phrase: `search “${query.q}”`,
            chip: `Search: ${query.q}`,
            href: ordersHref(query, { q: '' }),
          },
        ]),
    ...(query.lane === DEFAULT_ORDERS_QUERY.lane
      ? []
      : [
          {
            id: 'lane',
            phrase: `lane ${laneLabel}`,
            chip: `Lane: ${laneLabel}`,
            href: ordersHref(query, { lane: DEFAULT_ORDERS_QUERY.lane }),
          },
        ]),
    ...(query.status === DEFAULT_ORDERS_QUERY.status
      ? []
      : [
          {
            id: 'status',
            phrase: `status ${statusLabel}`,
            chip: `Status: ${statusLabel}`,
            href: ordersHref(query, { status: DEFAULT_ORDERS_QUERY.status }),
          },
        ]),
    ...(query.range === DEFAULT_ORDERS_QUERY.range
      ? []
      : [
          {
            id: 'range',
            phrase: `range ${rangeLabel}`,
            chip: `Range: ${rangeLabel}`,
            href: ordersHref(query, { range: DEFAULT_ORDERS_QUERY.range }),
          },
        ]),
  ];

  const count = filters.length;
  const heading =
    count === 1
      ? 'No order matches that filter'
      : `No order matches those ${COUNT_WORDS[count] ?? String(count)} filters`;

  return (
    <section className="mt-4 rounded-xl border border-border bg-white px-8 py-9">
      <h2 className="font-display text-[19px] font-semibold text-ink">
        {heading}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {joinPhrases(filters.map((filter) => filter.phrase))} exclude every
        order on your account. Your orders are still here — widen{' '}
        {count === 1 ? 'it' : 'one of them'}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={filter.href}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border-strong bg-white px-3.5 text-[13px] text-ink-muted hover:bg-surface-sunken hover:no-underline"
          >
            {filter.chip}
            <span aria-hidden className="text-ink-muted">
              ✕
            </span>
            <span className="sr-only">— remove this filter</span>
          </Link>
        ))}
        <Link
          href={ORDERS_PATH}
          className="inline-flex min-h-9 items-center rounded-lg border border-brand-600 px-3.5 text-[13px] font-bold text-brand-600 hover:bg-brand-600/10 hover:no-underline"
        >
          {count === 1 ? 'Clear it' : `Clear all ${count}`}
        </Link>
      </div>
    </section>
  );
}
