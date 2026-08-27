import Link from 'next/link';
import { GridIcon, ListIcon } from '@/components/icons/Icon';
import { searchHref, type SearchQuery } from '@/lib/search/query';

function toggleClass(active: boolean): string {
  return `flex h-9 w-9 items-center justify-center rounded-lg border ${
    active
      ? 'border-brand-600 bg-brand-600/10 text-brand-900'
      : 'border-border-strong bg-white text-ink-muted'
  } hover:no-underline`;
}

export default function SearchViewToggle({ query }: { query: SearchQuery }) {
  return (
    <div
      className="hidden items-center gap-1 lg:flex"
      role="group"
      aria-label="Result layout"
    >
      <Link
        href={searchHref(query, { view: 'grid' })}
        aria-label="Grid view"
        aria-current={query.view === 'grid' ? 'true' : undefined}
        className={toggleClass(query.view === 'grid')}
      >
        <GridIcon width={16} height={16} />
      </Link>
      <Link
        href={searchHref(query, { view: 'list' })}
        aria-label="List view"
        aria-current={query.view === 'list' ? 'true' : undefined}
        className={toggleClass(query.view === 'list')}
      >
        <ListIcon width={16} height={16} />
      </Link>
    </div>
  );
}
