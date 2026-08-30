import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryBreadcrumbSchema from '@/components/schema/CategoryBreadcrumbSchema';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import ActiveFilterChips from '@/components/catalog/ActiveFilterChips';
import CategoryBreadcrumb from '@/components/catalog/CategoryBreadcrumb';
import CategoryFilterPanel from '@/components/catalog/CategoryFilterPanel';
import CategoryHonestyNote from '@/components/catalog/CategoryHonestyNote';
import CategoryProductResults from '@/components/catalog/CategoryProductResults';
import CategoryResultsToolbar from '@/components/catalog/CategoryResultsToolbar';
import MobileFilterSheet from '@/components/catalog/MobileFilterSheet';
import ProductPagination from '@/components/home/ProductPagination';
import { isDepartmentId } from '@/lib/departments';
import { categories } from '@/lib/home-placeholder-data';
import { categoryAdSeed } from '@/lib/catalog/ad-slots';
import { buildFilterChips, clearAllHref } from '@/lib/catalog/chips';
import {
  activePriceRange,
  toCategoryProducts,
  type CategoryProduct,
} from '@/lib/catalog/filter-products';
import { PRICE_BANDS, type PriceBandId } from '@/lib/catalog/price-bands';
import {
  CATEGORY_PRODUCTS_PAGE_SIZE,
  categoryHref,
  hasActiveFilters,
  parseCategoryQuery,
  type CategoryQuery,
  type RawSearchParams,
} from '@/lib/catalog/query';
import { SITE_NAME, getSiteUrl } from '@/lib/site';
import {
  fetchCategoryProducts,
  type CategoryProductsSort,
} from '@/services/products';

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<RawSearchParams>;
};

/**
 * The canonical is self-referential, and now there is one of it.
 *
 * Between 2026-08-27 and 2026-08-28 this listing had one address per market and
 * a canonical each, because `/au/c/electronics` and `/ph/c/electronics` were
 * localized versions of one listing rather than duplicates of it. One storefront
 * means one address, so the reasoning collapses back to the ordinary case.
 *
 * Still `undefined` when `NEXT_PUBLIC_SITE_URL` is unset — `getSiteUrl()`
 * returns `undefined` rather than guessing a domain, and this omits the field
 * rather than inventing one.
 */
/**
 * ## A level below a department is `noindex, follow` for now
 *
 * This resolves the heading from the 21-department list, which is the only
 * taxonomy this repository holds. A `<slug>-<id>` level renders and browses
 * correctly — that is what the breadcrumb links — but naming it here would need
 * a producer round trip inside `generateMetadata`, on top of the two the page
 * already makes, and inventing a title from the URL segment would mean guessing
 * the capitalisation of a name the taxonomy spells exactly.
 *
 * So those pages are crawlable-through and not indexed, which is strictly better
 * than the 404 they answered before and is deliberately short of where they
 * should end up. Closing it means passing the resolved `category.name` from one
 * cached read to both this and the page.
 */
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((entry) => entry.id === slug);

  if (category === undefined) {
    return { robots: { index: false, follow: true } };
  }

  const title = `${category.name} — ${SITE_NAME}`;
  const description = `Browse every ${category.name} product published in the ${SITE_NAME} catalogue, with one clear US dollar price per item.`;
  const siteUrl = getSiteUrl();
  const canonical = siteUrl ? `${siteUrl}/c/${category.id}` : undefined;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: SITE_NAME,
      ...(canonical ? { url: canonical } : {}),
    },
    ...(canonical ? { alternates: { canonical } } : {}),
  };
}

const SORT_TO_API: Record<CategoryQuery['sort'], CategoryProductsSort> = {
  best: 'newest',
  'price-asc': 'price-asc',
  'price-desc': 'price-desc',
};

type BrowseScope = {
  name: string;
  slug: string;
  /** The scope's ancestry, present only for a level below a department. */
  trail?: { name: string; slug?: string }[];
};

type DepartmentPage = {
  products: CategoryProduct[];
  total: number;
  totalPages: number;
  /** True when the portal could not be reached — distinct from "nothing published". */
  unavailable: boolean;
  /**
   * What the producer resolved the slug to.
   *
   * The storefront holds the 21 department names and no taxonomy past them, so
   * for `/c/paper-products-956` this is the only source of a heading — the
   * alternative was de-slugifying the URL and guessing at capitalisation.
   */
  scope?: BrowseScope;
  /**
   * The producer answered 404 for a slug only it could judge. Kept apart from
   * `unavailable` because they are opposite pages: this is "no such category",
   * that is "we could not read the catalogue".
   */
  missing: boolean;
};

const EMPTY_PAGE: DepartmentPage = {
  products: [],
  total: 0,
  totalPages: 1,
  unavailable: false,
  missing: false,
};

/**
 * One page of this department, filtered and sorted by the portal.
 *
 * ## A producer 404 means two different things, and the slug says which
 *
 * For one of the 21 departments, this page's own list already said the address
 * is real, so a producer 404 means the portal serving this storefront does not
 * have the endpoint — deployment skew. Treating that as `notFound()` would put
 * "No such category" on every real department page for as long as the two
 * repositories were out of step, which is the most misleading thing this page
 * could say. So it stays an outage.
 *
 * For any other slug — a `<slug>-<id>` level — the producer's seeded taxonomy is
 * the *only* authority: this storefront cannot tell a real id from an invented
 * one. There a 404 is the answer, and rendering an empty category instead would
 * tell a buyer that an address they made up exists and happens to be empty.
 *
 * A thrown fetch is the same class of failure and takes the same path:
 * `unavailable` keeps it apart from an empty department, so the page never
 * reports "nothing published" about a catalogue it could not read.
 */
async function getDepartmentPage(
  slug: string,
  query: CategoryQuery,
): Promise<DepartmentPage> {
  const range = activePriceRange(query.band, query.priceMin, query.priceMax);

  try {
    const response = await fetchCategoryProducts(slug, {
      sort: SORT_TO_API[query.sort],
      page: query.page,
      limit: CATEGORY_PRODUCTS_PAGE_SIZE,
      ...(range.minMinor > 0 ? { minPriceMinor: range.minMinor } : {}),
      ...(range.maxMinor === Infinity ? {} : { maxPriceMinor: range.maxMinor }),
    });

    if (response === undefined) {
      return isDepartmentId(slug)
        ? { ...EMPTY_PAGE, unavailable: true }
        : { ...EMPTY_PAGE, missing: true };
    }

    return {
      products: toCategoryProducts(response.products),
      total: response.total,
      totalPages: response.totalPages,
      unavailable: false,
      missing: false,
      ...(response.category === undefined ? {} : { scope: response.category }),
    };
  } catch {
    return { ...EMPTY_PAGE, unavailable: true };
  }
}

/**
 * The unfiltered size of each price band, for the counts beside the radios.
 *
 * One extra read of the same department with no price window, so the counts
 * describe the department rather than the current filter — a count that shrank
 * to match the filter would tell a buyer that narrowing further is pointless.
 * It is deliberately *not* a per-band query: five more round trips to label
 * five radios is not worth it, so the bands are counted from one page of the
 * department and the count is honest only up to that page's size.
 */
async function getDepartmentFacts(slug: string): Promise<{
  counts: Record<PriceBandId, number>;
  total: number;
}> {
  const counts = {} as Record<PriceBandId, number>;

  PRICE_BANDS.forEach((band) => {
    counts[band.id] = 0;
  });

  try {
    const response = await fetchCategoryProducts(slug, {
      page: 1,
      limit: CATEGORY_PRODUCTS_PAGE_SIZE,
    });

    if (response === undefined) return { counts, total: 0 };

    PRICE_BANDS.forEach((band) => {
      counts[band.id] = response.products.filter(
        (product) =>
          product.priceMinor >= band.minMinor &&
          product.priceMinor <= band.maxMinor,
      ).length;
    });

    return { counts, total: response.total };
  } catch {
    // Decorative; a failure here must not cost the page.
    return { counts, total: 0 };
  }
}

function buildResultLine(
  resultCount: number,
  totalCount: number,
  categoryName: string,
): string {
  if (totalCount === 0) return '';

  const noun = totalCount === 1 ? 'product' : 'products';

  if (resultCount === totalCount) {
    return `${totalCount} ${noun} in ${categoryName}`;
  }

  const verb = resultCount === 1 ? 'matches' : 'match';

  return `${resultCount} of ${totalCount} ${noun} ${verb}`;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;

  const query: CategoryQuery = parseCategoryQuery((await searchParams) ?? {});

  const [result, facts] = await Promise.all([
    getDepartmentPage(slug, query),
    getDepartmentFacts(slug),
  ]);

  if (result.missing) {
    notFound();
  }

  /**
   * The heading, from the producer where it said one and from this page's own
   * department list otherwise.
   *
   * The local list is the fallback rather than the source: it holds 21 names and
   * the taxonomy has 5,595 rows, so it can only ever answer for a department. It
   * still answers first-class for those, which keeps the page rendering a real
   * heading during the window where the producer has not started sending
   * `category` yet.
   */
  const department = categories.find((entry) => entry.id === slug);
  const scopeName = result.scope?.name ?? department?.name;

  if (scopeName === undefined) {
    // Neither side can name it, so there is nothing honest to head the page
    // with. A producer that answered without a category, for a slug that is not
    // a department, is a state no real address produces.
    notFound();
  }

  const range = activePriceRange(query.band, query.priceMin, query.priceMax);
  const filtering = hasActiveFilters(query);
  const currentPage = Math.min(query.page, result.totalPages);
  const pageProducts: CategoryProduct[] = result.products;
  const departmentTotal = Math.max(facts.total, result.total);

  // Three different sentences, and the page must not substitute one for
  // another: an unreadable catalogue is not an empty department, and an empty
  // department is not a filter that excluded everything.
  const isEmptyCategory =
    !result.unavailable && result.total === 0 && !filtering;
  const isFilteredEmpty =
    !result.unavailable && result.total === 0 && filtering;
  const chips = buildFilterChips(slug, query);
  const clearHref = clearAllHref(slug, query);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <CategoryBreadcrumbSchema categoryName={scopeName} categorySlug={slug} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-4 pb-16">
        {/*
          The ancestry for a level below a department, so a buyer can climb out of
          it. A department has none to show — its parents are Home and All
          categories, which this breadcrumb already renders.
        */}
        <CategoryBreadcrumb
          categoryName={scopeName}
          ancestors={result.scope?.trail?.slice(0, -1) ?? []}
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="hidden lg:sticky lg:top-4 lg:flex lg:flex-col">
            <CategoryFilterPanel
              currentSlug={slug}
              query={query}
              counts={facts.counts}
              rangeIsTyped={range.typed}
              idPrefix="sidebar"
            />
          </aside>

          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-bold tracking-tight text-ink">
              {scopeName}
            </h1>
            <p className="mt-1.5 mb-0 text-[13px] text-ink-muted">
              Every published product filed under this category, in US dollars.
            </p>

            <div className="mt-3.5">
              <MobileFilterSheet
                activeCount={chips.length}
                applyLabel={
                  result.total === 1
                    ? 'Show 1 product'
                    : `Show ${result.total} products`
                }
                clearAllHref={clearHref}
              >
                <CategoryFilterPanel
                  currentSlug={slug}
                  query={query}
                  counts={facts.counts}
                  rangeIsTyped={range.typed}
                  idPrefix="sheet"
                />
              </MobileFilterSheet>
            </div>

            <CategoryResultsToolbar
              slug={slug}
              query={query}
              resultLine={buildResultLine(
                result.total,
                departmentTotal,
                scopeName,
              )}
            />

            {filtering ? (
              <ActiveFilterChips chips={chips} clearAllHref={clearHref} />
            ) : null}

            <CategoryProductResults
              view={query.view}
              products={pageProducts}
              isUnavailable={result.unavailable}
              isEmptyCategory={isEmptyCategory}
              isFilteredEmpty={isFilteredEmpty}
              categoryName={scopeName}
              totalCount={departmentTotal}
              chips={chips}
              clearAllHref={clearHref}
              adSeed={categoryAdSeed(slug, query)}
            />

            {!result.unavailable && !isEmptyCategory && !isFilteredEmpty ? (
              <>
                <ProductPagination
                  currentPage={currentPage}
                  totalPages={result.totalPages}
                  getPageHref={(target) =>
                    categoryHref(slug, query, { page: target })
                  }
                />
                <CategoryHonestyNote />
              </>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
