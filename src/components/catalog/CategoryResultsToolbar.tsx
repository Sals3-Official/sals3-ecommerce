import type { CategoryQuery } from '@/lib/catalog/query';
import SortSelect from './SortSelect';
import ViewToggleLinks from './ViewToggleLinks';

type CategoryResultsToolbarProps = {
  slug: string;
  query: CategoryQuery;
  resultLine: string;
};

export default function CategoryResultsToolbar({
  slug,
  query,
  resultLine,
}: CategoryResultsToolbarProps) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-3.5 py-2.5">
      <p className="m-0 text-[13px] text-ink" aria-live="polite">
        {resultLine}
      </p>
      <div className="flex items-center gap-3">
        <SortSelect slug={slug} query={query} />
        <ViewToggleLinks slug={slug} query={query} />
      </div>
    </div>
  );
}
