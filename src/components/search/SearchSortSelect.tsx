'use client';

import { useRouter } from 'next/navigation';
import { isSortKey } from '@/lib/catalog/query';
import { searchHref, type SearchQuery } from '@/lib/search/query';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';

const SORT_OPTIONS = [
  { value: 'best', label: 'Best match' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
] as const;

export default function SearchSortSelect({
  query,
  market,
}: {
  query: SearchQuery;
  market: MarketSegment;
}) {
  const router = useRouter();

  return (
    <label
      htmlFor="search-sort"
      className="flex items-center gap-2 text-[13px] text-ink-muted"
    >
      <span className="hidden sm:inline">Sort by</span>
      <span className="sr-only sm:hidden">Sort results by</span>
      <select
        id="search-sort"
        value={query.sort}
        onChange={(event) => {
          const { value } = event.target;
          if (isSortKey(value))
            router.push(marketHref(market, searchHref(query, { sort: value })));
        }}
        className="rounded-lg border border-border-strong bg-white px-2.5 py-2 text-[13px] text-ink outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
