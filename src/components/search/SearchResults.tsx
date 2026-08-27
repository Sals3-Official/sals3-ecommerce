import Link from 'next/link';
import ProductGrid from '@/components/home/ProductGrid';
import ProductListRow from '@/components/catalog/ProductListRow';
import type { FilterChip } from '@/lib/catalog/chips';
import type { CategoryProduct } from '@/lib/catalog/filter-products';
import type { ViewKey } from '@/lib/catalog/query';

type SearchResultsProps = {
  view: ViewKey;
  products: CategoryProduct[];
  term: string;
  /** No keyword yet — the page is waiting, not reporting a result. */
  isIdle: boolean;
  isUnavailable: boolean;
  isEmpty: boolean;
  filtering: boolean;
  chips: FilterChip[];
  /** Market-prefixed by the page, as is every chip's own `clearHref`. */
  clearFiltersHref: string;
};

function Panel({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3.5 rounded-xl border border-border bg-white px-6 py-11 text-center">
      <h2 className="m-0 text-[19px] font-bold text-ink text-pretty">
        {heading}
      </h2>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
  );
}

/**
 * Four states, and the difference between them is the whole job.
 *
 * "Nothing matched" and "nothing matched *with these filters*" are different
 * sentences, and only the second one may offer to clear filters — offering it
 * when none are set sends a buyer to click a control that does nothing. An
 * unreadable catalogue gets its own wording again, because "no results for
 * lamp" is a claim about the catalogue that a failed read cannot support.
 */
export default function SearchResults({
  view,
  products,
  term,
  isIdle,
  isUnavailable,
  isEmpty,
  filtering,
  chips,
  clearFiltersHref,
}: SearchResultsProps) {
  if (isIdle) {
    return (
      <Panel heading="Search the catalogue">
        Type what you are looking for in the box above. Search matches product
        titles.
      </Panel>
    );
  }

  if (isUnavailable) {
    return (
      <Panel heading="Search can't run right now">
        The catalogue did not answer, so this page cannot say what matches
        &ldquo;{term}&rdquo;. Nothing is wrong with your search — try again in a
        moment.
      </Panel>
    );
  }

  if (isEmpty && filtering) {
    return (
      <div className="mt-3.5 rounded-xl border border-border bg-white p-6 sm:p-8">
        <h2 className="m-0 text-lg font-bold text-ink text-pretty">
          No match for &ldquo;{term}&rdquo; with these filters
        </h2>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-ink-muted">
          The keyword itself may still have results — this combination of
          filters excludes them. Drop one below rather than starting again.
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
            href={clearFiltersHref}
            className="flex min-h-9 items-center rounded-lg border border-brand-blue-500 px-3.5 text-[13px] font-bold text-brand-blue-900 hover:no-underline"
          >
            Keep the search, clear the filters
          </Link>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Panel heading={`No products match “${term}”`}>
        Search looks at product titles only, so a word that appears in a
        description will not find anything. Try a shorter or more general term.
      </Panel>
    );
  }

  if (view === 'list') {
    return (
      <div className="mt-3.5 flex flex-col gap-2.5">
        {products.map((product) => (
          <ProductListRow key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3.5">
      <ProductGrid
        items={products.map((product) => ({ kind: 'product', product }))}
      />
    </div>
  );
}
