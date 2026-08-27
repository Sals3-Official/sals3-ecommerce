import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';
import CATEGORY_ICON_PATHS from '@/components/home/category-icons';
import categoryImageSrc, {
  CATEGORY_IMAGE_PX,
} from '@/components/home/category-images';

type CategoryTileProps = {
  category: Category;
};

/**
 * The media square's three tiers, in order: the department's photograph, its
 * inline line icon, its code initials.
 *
 * The photo is a fixed-size local file and the icon is inline SVG from the
 * bundle, so neither can shift the layout while loading. Empty `alt` on the
 * photo is deliberate — the tile prints the department name directly below, and
 * a described image would make every tile announce itself twice.
 */
function categoryMedia(category: Category): ReactNode {
  const imageSrc = categoryImageSrc(category.id);

  if (imageSrc !== undefined) {
    return (
      <Image
        src={imageSrc}
        alt=""
        width={CATEGORY_IMAGE_PX}
        height={CATEGORY_IMAGE_PX}
        sizes="72px"
        className="h-full w-full object-cover"
      />
    );
  }

  const iconPaths = CATEGORY_ICON_PATHS[category.id];

  if (iconPaths === undefined) {
    // Neither photo nor icon. The feed's own `code` is an honest stand-in,
    // better than a generic glyph that tells the buyer nothing.
    return (
      <span className="font-mono text-[15px] text-ink-subtle md:text-[17px]">
        {category.code}
      </span>
    );
  }

  return (
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
  );
}

/**
 * One tile in the "Shop by category" carousel. Snapping lives on the page
 * around it, not here — the track pages a whole page at a time. Server-rendered (build spec §11.4:
 * the brand colour stays off navigation affordances like this one; §11.7:
 * transitions carry an explicit duration).
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
  const hasPhoto = categoryImageSrc(category.id) !== undefined;

  return (
    <Link
      href={`/c/${category.id}`}
      title={category.name}
      className="group flex flex-col items-center gap-2 bg-white px-2 pt-3.5 pb-3 transition duration-200 ease-out hover:bg-surface hover:no-underline focus-visible:-outline-offset-2 md:gap-2.5 md:px-3.5 md:pt-4.5 md:pb-4"
    >
      {/* White behind a photograph, sunken grey behind an icon or initials:
          these photos are shot on white, and a grey plate around them reads as
          a border the photo does not have. */}
      <span
        className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl text-ink-muted md:h-18 md:w-18 ${
          hasPhoto ? 'bg-white' : 'bg-surface-sunken'
        }`}
      >
        {categoryMedia(category)}
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
