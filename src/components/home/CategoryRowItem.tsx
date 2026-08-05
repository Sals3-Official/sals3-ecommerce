import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';
import CATEGORY_ICON_PATHS from '@/components/home/category-icons';

type CategoryRowItemProps = {
  category: Category;
};

/**
 * One category tile. Server-rendered — the icon geometry is inline SVG
 * from the bundle, so there is no image request and no load event to guard
 * with a skeleton (build spec §11.4: the brand colour stays off navigation
 * affordances like this one; §11.7: transitions carry an explicit duration).
 */
export default function CategoryRowItem({ category }: CategoryRowItemProps) {
  const iconPaths = CATEGORY_ICON_PATHS[category.id];

  return (
    <Link
      href={`/c/${category.id}`}
      className="group flex w-[78px] shrink-0 flex-col items-center gap-2 rounded-xl px-0.5 pt-2 pb-1.5 transition duration-200 ease-out hover:bg-surface hover:no-underline active:scale-95 md:w-auto"
    >
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-ink-muted transition duration-200 ease-out group-hover:bg-surface-sunken-strong group-hover:text-ink">
        {iconPaths === undefined ? (
          // No icon mapped for this live category id yet. The real `code`
          // from the feed is an honest stand-in — better than a generic
          // glyph that tells the buyer nothing.
          <span className="font-mono text-[15px]">{category.code}</span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[26px] w-[26px]"
            aria-hidden="true"
          >
            {iconPaths}
          </svg>
        )}
      </span>
      {/* Wraps to 2 lines rather than truncating — real CJ category names
          clip at 80px on one line. */}
      <span className="max-w-[90px] text-center text-[11.5px] leading-tight text-ink-muted text-pretty">
        {category.name}
      </span>
    </Link>
  );
}
