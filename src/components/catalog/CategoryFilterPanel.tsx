import Link from 'next/link';
import { categories } from '@/lib/home-placeholder-data';
import type { PriceBandId } from '@/lib/catalog/price-bands';
import { categoryHref, type CategoryQuery } from '@/lib/catalog/query';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';
import BlockedFacetsNote from './BlockedFacetsNote';
import CategoryFilterForm from './CategoryFilterForm';

/**
 * The filter content shared by the desktop sidebar and the mobile sheet — one
 * definition rendered by each wrapper, so the two surfaces cannot drift.
 */

const VISIBLE_CATEGORY_COUNT = 8;

type CategoryFilterPanelProps = {
  currentSlug: string;
  query: CategoryQuery;
  counts: Record<PriceBandId, number>;
  rangeIsTyped: boolean;
  /**
   * Distinguishes the sidebar copy from the mobile sheet copy. Both render this
   * same panel, so their field ids must not collide.
   */
  idPrefix: string;
  market: MarketSegment;
};

export default function CategoryFilterPanel({
  currentSlug,
  query,
  counts,
  rangeIsTyped,
  idPrefix,
  market,
}: CategoryFilterPanelProps) {
  const visibleCategories = query.allCats
    ? categories
    : categories.slice(0, VISIBLE_CATEGORY_COUNT);

  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <h2 className="m-0 border-b border-border px-4 py-3 text-[13px] font-bold text-ink">
          Category
        </h2>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-1.5">
          {visibleCategories.map((category) => (
            <li key={category.id}>
              <Link
                href={marketHref(market, `/c/${category.id}`)}
                className={`flex min-h-9 items-center rounded-lg px-2.5 text-[13px] leading-tight hover:no-underline ${
                  category.id === currentSlug
                    ? 'bg-brand-600/10 font-bold text-brand-900'
                    : 'text-ink-muted hover:bg-surface'
                }`}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={marketHref(
            market,
            categoryHref(currentSlug, query, { allCats: !query.allCats }),
          )}
          className="block border-t border-border px-4 py-2.5 text-[13px] font-bold text-brand-600 hover:no-underline"
        >
          {query.allCats
            ? 'Show fewer categories'
            : `All ${categories.length} categories`}
        </Link>
      </section>

      <CategoryFilterForm
        slug={currentSlug}
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
