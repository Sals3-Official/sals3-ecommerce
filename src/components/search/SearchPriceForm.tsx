'use client';

import { useRouter } from 'next/navigation';
import { useCallback, type FormEvent } from 'react';
import PriceFacetFields, {
  type PriceFacetQuery,
} from '@/components/catalog/PriceFacetFields';
import type { PriceBandId } from '@/lib/catalog/price-bands';
import { searchHref, type SearchQuery } from '@/lib/search/query';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';

/**
 * The price control on `/search`, reusing `/c/[slug]`'s own fields.
 *
 * A real `<form method="get">` so the filter still narrows with JavaScript off,
 * with the keyword and every other active value carried as hidden inputs — a
 * no-JS submit must not silently drop the search it is filtering.
 */
type SearchPriceFormProps = {
  query: SearchQuery;
  counts: Record<PriceBandId, number>;
  rangeIsTyped: boolean;
  idPrefix: string;
  market: MarketSegment;
};

export default function SearchPriceForm({
  query,
  counts,
  rangeIsTyped,
  idPrefix,
  market,
}: SearchPriceFormProps) {
  const router = useRouter();

  const go = useCallback(
    (changes: Partial<PriceFacetQuery>) => {
      router.push(marketHref(market, searchHref(query, changes)));
    },
    [router, market, query],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    // The radios already navigate on change; this only fires from the no-JS
    // submit button, whose native GET is correct as-is.
    event.preventDefault();
  }

  return (
    <form method="get" action={marketHref(market, '/search')} onSubmit={submit}>
      <input type="hidden" name="q" value={query.q} />
      {query.category === null ? null : (
        <input type="hidden" name="category" value={query.category} />
      )}
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="view" value={query.view} />

      <PriceFacetFields
        query={query}
        counts={counts}
        rangeIsTyped={rangeIsTyped}
        idPrefix={idPrefix}
        go={go}
      />

      <noscript>
        <button
          type="submit"
          className="mt-3 min-h-11 w-full rounded-lg border border-brand-600 px-4 text-[13px] font-bold text-brand-600"
        >
          Apply price
        </button>
      </noscript>
    </form>
  );
}
