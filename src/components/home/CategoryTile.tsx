import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';
import CATEGORY_ICON_PATHS from '@/components/home/category-icons';

type CategoryTileProps = {
  category: Category;
};

/**
 * One tile in the "Shop by category" grid. Server-rendered — the icon
 * geometry is inline SVG from the bundle, so there is no image request and
 * no load event to guard (build spec §11.4: the brand colour stays off
 * navigation affordances like this one; §11.7: transitions carry an
 * explicit duration).
 *
 * The tile paints its own white background: the grid shell behind it is
 * border-coloured and shows through the 1px gaps as hairlines, so a tile
 * that forgot its background would read as a hole in the card.
 *
 * The focus ring is pulled inside the tile (`-outline-offset-2`): the grid
 * shell clips to a rounded rectangle, so the global +2px offset ring in
 * globals.css would be cut off on every edge and corner tile.
 */
export default function CategoryTile({ category }: CategoryTileProps) {
  const iconPaths = CATEGORY_ICON_PATHS[category.id];

  return (
    <Link
      href={`/c/${category.id}`}
      title={category.name}
      className="group flex flex-col items-center gap-2 bg-white px-2 pt-3.5 pb-3 transition duration-200 ease-out hover:bg-surface hover:no-underline focus-visible:-outline-offset-2 md:gap-2.5 md:px-3.5 md:pt-4.5 md:pb-4"
    >
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken text-ink-muted md:h-18 md:w-18">
        {iconPaths === undefined ? (
          // No icon mapped for this main category — `mature` and
          // `religious-ceremonial` by choice, anything new until an icon is
          // drawn for it. The feed's own `code` is an honest stand-in,
          // better than a generic glyph that tells the buyer nothing.
          <span className="font-mono text-[15px] text-ink-subtle md:text-[17px]">
            {category.code}
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 md:h-[34px] md:w-[34px]"
            aria-hidden="true"
          >
            {iconPaths}
          </svg>
        )}
      </span>
      {/* Wraps to 2 lines then clamps rather than truncating on line 1 —
          "Food, Beverages & Tobacco" needs both.
          The min-height reserves the second line so a 1-line and a 2-line
          tile in the same row keep their icons on one baseline. */}
      <span className="line-clamp-2 min-h-8 text-center text-[12px] leading-[1.3] font-medium text-ink text-pretty break-words md:min-h-9 md:text-[13px] md:leading-[1.35]">
        {category.name}
      </span>
    </Link>
  );
}
