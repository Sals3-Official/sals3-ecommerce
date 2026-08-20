import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';
import CategoryTile from '@/components/home/CategoryTile';

/**
 * "Shop by category" — the grid that sits directly under the promo banner.
 *
 * Build spec section 15.1: "8 to 10 category icons. It shows the true top
 * categories, not a fixed list." The list is therefore fed live from the
 * storefront feed by the caller (`src/app/page.tsx`) and only capped here —
 * deliberately not a hardcoded array. If the feed returns fewer than 8,
 * that is the catalogue's real state, not something to pad with invented
 * categories.
 *
 * The feed sends **main (L1) taxonomy categories**, rolled up from the
 * published leaves by the portal. So a tile reads "Apparel & Accessories",
 * not "Dance Dresses, Skirts & Costumes", and the count line counts main
 * categories with stock behind them.
 */
const MAX_CATEGORIES = 10;

const DESKTOP_COLUMNS = 5;
const MOBILE_COLUMNS = 3;

/**
 * Blank cells that finish the last row. The grid shell is border-coloured
 * and shows through the 1px gaps, so an unfinished row would otherwise
 * render as a grey slab next to the last tile. Both breakpoints get their
 * own set — 10 tiles divide evenly by 5 but leave a 2-cell hole at 3 — and
 * the set that does not apply is `display:none`, so it takes no grid track.
 */
function fillerCount(itemCount: number, columns: number): number {
  const remainder = itemCount % columns;

  return remainder === 0 ? 0 : columns - remainder;
}

function countLine(itemCount: number): string {
  return itemCount === 1 ? '1 category' : `${itemCount} categories`;
}

type CategorySectionProps = {
  categories: Category[];
};

export default function CategorySection({ categories }: CategorySectionProps) {
  const visibleCategories = categories.slice(0, MAX_CATEGORIES);
  const desktopFillers = fillerCount(visibleCategories.length, DESKTOP_COLUMNS);
  const mobileFillers = fillerCount(visibleCategories.length, MOBILE_COLUMNS);

  return (
    <section className="mt-6.5" aria-labelledby="categories-heading">
      {/* Everything in this row is `nowrap`, so at 390px the count line drops
          and the link shortens rather than pushing the page into a horizontal
          scroll. */}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2
            id="categories-heading"
            className="text-lg font-bold whitespace-nowrap sm:text-xl"
          >
            Shop by category
          </h2>
          {visibleCategories.length === 0 ? null : (
            <span className="hidden text-[13px] whitespace-nowrap text-ink-subtle sm:inline">
              {countLine(visibleCategories.length)}
            </span>
          )}
        </div>
        {/* Real destination, unlike the tiles: `/categories` lists every
            department, so the grid can stay capped at 10 without hiding the
            rest of the catalogue. */}
        <Link href="/categories" className="text-sm whitespace-nowrap">
          See all<span className="hidden sm:inline"> categories</span>
        </Link>
      </div>

      {visibleCategories.length === 0 ? (
        <p className="m-0 rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-ink-muted">
          No categories are listed yet. A category appears here once it has
          published products.
        </p>
      ) : (
        <nav
          aria-label="Categories"
          className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5"
        >
          {visibleCategories.map((category) => (
            <CategoryTile key={category.id} category={category} />
          ))}
          {Array.from({ length: desktopFillers }, (_, index) => (
            <span
              key={`desktop-filler-${index}`}
              aria-hidden="true"
              className="hidden bg-white md:block"
            />
          ))}
          {Array.from({ length: mobileFillers }, (_, index) => (
            <span
              key={`mobile-filler-${index}`}
              aria-hidden="true"
              className="bg-white md:hidden"
            />
          ))}
        </nav>
      )}
    </section>
  );
}
