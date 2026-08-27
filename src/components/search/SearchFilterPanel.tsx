import Link from 'next/link';
import BlockedFacetsNote from '@/components/catalog/BlockedFacetsNote';
import { categories } from '@/lib/home-placeholder-data';
import type { PriceBandId } from '@/lib/catalog/price-bands';
import { searchHref, type SearchQuery } from '@/lib/search/query';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';
import SearchPriceForm from './SearchPriceForm';

/**
 * The `/search` sidebar.
 *
 * The difference from `/c/[slug]`'s panel is the Category section, and it is
 * the whole reason this is a separate component rather than a prop on that one:
 * there, a department is a destination and each row navigates away; here it is
 * a filter that must preserve the keyword, so each row is a search link and
 * "All departments" clears it. Sharing one component would have meant a
 * `mode` flag deciding what a click means, which is the kind of prop that reads
 * fine and then gets the wrong branch.
 *
 * Everything below Category is genuinely shared — the same price fields and the
 * same honest note about what cannot be filtered.
 */
type SearchFilterPanelProps = {
  query: SearchQuery;
  counts: Record<PriceBandId, number>;
  rangeIsTyped: boolean;
  idPrefix: string;
  market: MarketSegment;
};

export default function SearchFilterPanel({
  query,
  counts,
  rangeIsTyped,
  idPrefix,
  market,
}: SearchFilterPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <h2 className="m-0 border-b border-border px-4 py-3 text-[13px] font-bold text-ink">
          Department
        </h2>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-1.5">
          <li>
            <Link
              href={marketHref(market, searchHref(query, { category: null }))}
              aria-current={query.category === null ? 'true' : undefined}
              className={`flex min-h-9 items-center rounded-lg px-2.5 text-[13px] leading-tight hover:no-underline ${
                query.category === null
                  ? 'bg-brand-600/10 font-bold text-brand-900'
                  : 'text-ink-muted hover:bg-surface'
              }`}
            >
              All departments
            </Link>
          </li>
          {categories.map((department) => {
            const active = query.category === department.id;

            return (
              <li key={department.id}>
                <Link
                  href={marketHref(
                    market,
                    searchHref(query, { category: department.id }),
                  )}
                  aria-current={active ? 'true' : undefined}
                  className={`flex min-h-9 items-center rounded-lg px-2.5 text-[13px] leading-tight hover:no-underline ${
                    active
                      ? 'bg-brand-600/10 font-bold text-brand-900'
                      : 'text-ink-muted hover:bg-surface'
                  }`}
                >
                  {department.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <SearchPriceForm
        query={query}
        counts={counts}
        rangeIsTyped={rangeIsTyped}
        idPrefix={idPrefix}
        market={market}
      />

      <BlockedFacetsNote />
    </div>
  );
}
