import type { Category } from '@/lib/home-placeholder-data';
import CategoryCarousel from '@/components/home/CategoryCarousel';
import CategoryTile from '@/components/home/CategoryTile';

/**
 * "Shop by category" — the department carousel that sits directly under the
 * promo banner.
 *
 * Every department is shown, not a top-N slice: the list is the 21 main
 * categories of the taxonomy, fed live from the storefront feed by the caller
 * (`src/app/page.tsx`), stocked departments first. Paging replaced the old
 * cap-plus-link because a buyer scanning for their department should not have
 * to leave the home page to find it.
 *
 * ## Why the tiles are chunked into pages here
 *
 * A single two-row track that flows in columns would be less code, but it
 * fills top-to-bottom: the first visual row would read "Animals, Arts,
 * Cameras…" while "Apparel, Baby, Business…" sat underneath it. For an
 * alphabetical list that breaks scanning. Chunking into fixed pages keeps the
 * fill row-major, so a row reads across in order.
 *
 * `PAGE_SIZE` is 12 because 12 is the one count that divides evenly into both
 * layouts — 6×2 from `md` up, 3×4 below — which is what lets every empty cell
 * of the last page be filled explicitly. Without that the page's own
 * border-coloured background would show through the leftover cells as grey
 * slabs.
 */
const PAGE_SIZE = 12;

function pagesOf(categories: Category[]): Category[][] {
  const pages: Category[][] = [];

  for (let index = 0; index < categories.length; index += PAGE_SIZE) {
    pages.push(categories.slice(index, index + PAGE_SIZE));
  }

  return pages;
}

function countLine(itemCount: number): string {
  return itemCount === 1 ? '1 category' : `${itemCount} categories`;
}

type CategorySectionProps = {
  categories: Category[];
};

export default function CategorySection({ categories }: CategorySectionProps) {
  const pages = pagesOf(categories);

  return (
    <section className="mt-6.5" aria-labelledby="categories-heading">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2
          id="categories-heading"
          className="text-lg font-bold whitespace-nowrap sm:text-xl"
        >
          Shop by category
        </h2>
        {categories.length === 0 ? null : (
          <span className="text-[13px] whitespace-nowrap text-ink-subtle">
            {countLine(categories.length)}
          </span>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="m-0 rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-ink-muted">
          No categories are listed yet. A category appears here once it has
          published products.
        </p>
      ) : (
        <CategoryCarousel label="Categories" pageCount={pages.length}>
          {pages.map((page, pageIndex) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- a page is its position; the categories inside it carry the identity.
              key={pageIndex}
              className="grid w-full shrink-0 snap-start grid-cols-3 grid-rows-4 gap-px bg-border md:grid-cols-6 md:grid-rows-2"
            >
              {page.map((category) => (
                <CategoryTile key={category.id} category={category} />
              ))}
              {Array.from({ length: PAGE_SIZE - page.length }, (_, index) => (
                <span
                  key={`filler-${index}`}
                  aria-hidden="true"
                  className="bg-white"
                />
              ))}
            </div>
          ))}
        </CategoryCarousel>
      )}
    </section>
  );
}
