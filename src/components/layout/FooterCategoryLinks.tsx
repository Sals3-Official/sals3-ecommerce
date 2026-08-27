import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';
import { ChevronRightIcon } from '@/components/icons/Icon';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';

type FooterCategoryLinksProps = {
  categories: Category[];
  market: MarketSegment;
};

export default function FooterCategoryLinks({
  categories,
  market,
}: FooterCategoryLinksProps) {
  return (
    <div className="grid grid-cols-1 gap-8 border-t border-white/10 py-8 sm:grid-cols-[minmax(260px,1.15fr)_minmax(0,2.85fr)] sm:gap-8">
      <div>
        <div className="mb-2.5 text-xs font-bold tracking-wider text-footer-label uppercase">
          Shop by category
        </div>
        <p className="max-w-[300px] text-sm leading-relaxed text-footer-ink-muted text-pretty">
          Browse the full catalogue from the category page, where every filter
          shows a count.
        </p>
        <Link
          href={marketHref(market, '/categories')}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-footer-accent hover:text-white hover:no-underline"
        >
          See all {categories.length} categories
          <ChevronRightIcon width={16} height={16} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={marketHref(market, `/c/${category.id}`)}
            className="py-1.5 text-sm leading-snug text-footer-link hover:text-white hover:no-underline"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
