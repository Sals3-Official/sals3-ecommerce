import Link from 'next/link';
import SponsoredCarousel from '@/components/ads/SponsoredCarousel';
import ProductGrid from '@/components/home/ProductGrid';
import { withAdSlots } from '@/lib/catalog/ad-slots';
import type { FilterChip } from '@/lib/catalog/chips';
import type { CategoryProduct } from '@/lib/catalog/filter-products';
import type { ViewKey } from '@/lib/catalog/query';
import ProductListRow from './ProductListRow';

type CategoryProductResultsProps = {
  view: ViewKey;
  products: CategoryProduct[];
  /** The catalogue could not be read. Never rendered as "nothing published". */
  isUnavailable: boolean;
  isEmptyCategory: boolean;
  isFilteredEmpty: boolean;
  categoryName: string;
  totalCount: number;
  chips: FilterChip[];
  /**
   * Built by the page, as is every `clearHref` on `chips` —
   * they come out of `lib/catalog/chips.ts`, which builds query state and
   * deliberately builds paths and nothing else.
   */
  clearAllHref: string;
  /**
   * Identity of this exact listing, from `categoryAdSeed`. It decides where the
   * sponsored card lands, so the placement is stable for a URL and different
   * between listings — see `lib/catalog/ad-slots.ts`.
   */
  adSeed: string;
};

/**
 * An outage says so. The one thing this panel must not do is borrow the empty
 * department's wording: "nothing published here yet" is a statement about the
 * catalogue, and this is the case where the catalogue is exactly what could not
 * be read.
 */
function UnavailablePanel({ categoryName }: { categoryName: string }) {
  return (
    <div className="mt-3.5 rounded-xl border border-border bg-white px-6 py-11 text-center">
      <h2 className="m-0 text-[19px] font-bold text-ink">
        {categoryName} can&apos;t be loaded right now
      </h2>
      <p className="mx-auto mt-2 mb-0 max-w-md text-sm leading-relaxed text-ink-muted">
        The catalogue did not answer, so this page cannot say what is in this
        category. Nothing is wrong with your filters — try again in a moment.
      </p>
      <Link
        href="/categories"
        className="mt-4.5 inline-flex min-h-11 items-center rounded-lg border border-brand-blue-500 px-5.5 text-sm font-bold text-brand-blue-900 hover:no-underline"
      >
        All categories
      </Link>
    </div>
  );
}

function EmptyCategoryPanel({ categoryName }: { categoryName: string }) {
  return (
    <div className="mt-3.5 rounded-xl border border-border bg-white px-6 py-11 text-center">
      <h2 className="m-0 text-[19px] font-bold text-ink">
        Nothing published in {categoryName} yet
      </h2>
      <p className="mx-auto mt-2 mb-0 max-w-md text-sm leading-relaxed text-ink-muted">
        The category exists in the catalogue, but no seller has published a
        product into it. It appears here the moment one does.
      </p>
      <Link
        href="/categories"
        className="bg-brand-gradient mt-4.5 inline-flex min-h-11 items-center rounded-lg px-5.5 text-sm font-bold text-white hover:no-underline"
      >
        Browse other categories
      </Link>
    </div>
  );
}

function FilteredEmptyPanel({
  totalCount,
  chips,
  clearAllHref,
}: Pick<CategoryProductResultsProps, 'totalCount' | 'chips' | 'clearAllHref'>) {
  return (
    <div className="mt-3.5 rounded-xl border border-border bg-white p-6 sm:p-8">
      <h2 className="m-0 text-lg font-bold text-ink text-pretty">
        No product here matches all of those filters
      </h2>
      <p className="mt-2 mb-0 text-sm leading-relaxed text-ink-muted">
        The category still holds {totalCount}{' '}
        {totalCount === 1 ? 'product' : 'products'} — this combination just
        excludes every one of them. Drop a filter below rather than starting
        again.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.clearHref}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong bg-white px-3.5 text-[13px] text-ink hover:no-underline"
          >
            Remove: {chip.label}
            <span aria-hidden="true" className="text-ink-faint">
              ✕
            </span>
          </Link>
        ))}
        <Link
          href={clearAllHref}
          className="flex min-h-9 items-center rounded-lg border border-brand-blue-500 px-3.5 text-[13px] font-bold text-brand-blue-900 hover:no-underline"
        >
          Clear every filter
        </Link>
      </div>
    </div>
  );
}

export default function CategoryProductResults({
  view,
  products,
  isUnavailable,
  isEmptyCategory,
  isFilteredEmpty,
  categoryName,
  totalCount,
  chips,
  clearAllHref,
  adSeed,
}: CategoryProductResultsProps) {
  if (isUnavailable) return <UnavailablePanel categoryName={categoryName} />;

  if (isEmptyCategory)
    return <EmptyCategoryPanel categoryName={categoryName} />;

  if (isFilteredEmpty) {
    return (
      <FilteredEmptyPanel
        totalCount={totalCount}
        chips={chips}
        clearAllHref={clearAllHref}
      />
    );
  }

  const items = withAdSlots(products, adSeed);

  if (view === 'list') {
    return (
      <div className="mt-3.5 flex flex-col gap-2.5">
        {items.map((item) =>
          item.kind === 'product' ? (
            <ProductListRow key={item.product.id} product={item.product} />
          ) : (
            <SponsoredCarousel key={item.slotKey} variant="row" />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="mt-3.5">
      <ProductGrid items={items} />
    </div>
  );
}
