import Link from 'next/link';
import { GridIcon, ListIcon } from '@/components/icons/Icon';
import { categoryHref, type CategoryQuery } from '@/lib/catalog/query';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';

type ViewToggleLinksProps = {
  slug: string;
  query: CategoryQuery;
  market: MarketSegment;
};

function toggleClass(active: boolean): string {
  return `flex h-9 w-9 items-center justify-center rounded-lg border ${
    active
      ? 'border-brand-600 bg-brand-600/10 text-brand-900'
      : 'border-border-strong bg-white text-ink-muted'
  }`;
}

/** Grid/list are plain links, not client state — a bookmarked
 * `?view=list` shows the same layout on the next visit. */
export default function ViewToggleLinks({
  slug,
  query,
  market,
}: ViewToggleLinksProps) {
  return (
    <div
      className="hidden items-center gap-1 lg:flex"
      role="group"
      aria-label="Result layout"
    >
      <Link
        href={marketHref(market, categoryHref(slug, query, { view: 'grid' }))}
        aria-label="Grid view"
        aria-current={query.view === 'grid' ? 'true' : undefined}
        className={`${toggleClass(query.view === 'grid')} hover:no-underline`}
      >
        <GridIcon width={16} height={16} />
      </Link>
      <Link
        href={marketHref(market, categoryHref(slug, query, { view: 'list' }))}
        aria-label="List view"
        aria-current={query.view === 'list' ? 'true' : undefined}
        className={`${toggleClass(query.view === 'list')} hover:no-underline`}
      >
        <ListIcon width={16} height={16} />
      </Link>
    </div>
  );
}
