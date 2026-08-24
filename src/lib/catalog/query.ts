import { isPriceBandId, type PriceBandId } from './price-bands';

/**
 * `/c/[slug]` list state, in the URL and nowhere else — the same discipline
 * `lib/orders/query.ts` uses for `/orders`. Every value is allow-listed, not
 * sanitised; a repeated single-value parameter (`?band=any&band=x`) is
 * discarded rather than resolved to its first element.
 */

export const CATEGORY_PRODUCTS_PAGE_SIZE = 20;

export const SORT_KEYS = ['best', 'price-asc', 'price-desc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

export const VIEW_KEYS = ['grid', 'list'] as const;
export type ViewKey = (typeof VIEW_KEYS)[number];

export function isViewKey(value: string): value is ViewKey {
  return (VIEW_KEYS as readonly string[]).includes(value);
}

export type CategoryQuery = {
  band: PriceBandId;
  priceMin: string;
  priceMax: string;
  sort: SortKey;
  view: ViewKey;
  page: number;
  allCats: boolean;
};

export const DEFAULT_CATEGORY_QUERY: CategoryQuery = {
  band: 'any',
  priceMin: '',
  priceMax: '',
  sort: 'best',
  view: 'grid',
  page: 1,
  allCats: false,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** A repeated single-value parameter is ambiguous, so it is discarded. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Bounded so a pasted price of any length cannot become page content. */
const MAX_TYPED_PRICE_LENGTH = 12;

export function parseCategoryQuery(params: RawSearchParams): CategoryQuery {
  const band = single(params.band);
  const sort = single(params.sort);
  const view = single(params.view);
  const rawPage = Number.parseInt(single(params.page) ?? '', 10);

  return {
    band:
      band !== undefined && isPriceBandId(band)
        ? band
        : DEFAULT_CATEGORY_QUERY.band,
    priceMin: (single(params.priceMin) ?? '')
      .trim()
      .slice(0, MAX_TYPED_PRICE_LENGTH),
    priceMax: (single(params.priceMax) ?? '')
      .trim()
      .slice(0, MAX_TYPED_PRICE_LENGTH),
    sort:
      sort !== undefined && isSortKey(sort)
        ? sort
        : DEFAULT_CATEGORY_QUERY.sort,
    view:
      view !== undefined && isViewKey(view)
        ? view
        : DEFAULT_CATEGORY_QUERY.view,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    allCats: single(params.allCats) === '1',
  };
}

export function categoryPath(slug: string): string {
  return `/c/${slug}`;
}

/**
 * Builds `?…` from a query, dropping every value that equals its default —
 * the same semantics `buildOrdersQueryString` uses, so `/c/home-garden` stays
 * the address for the default view rather than growing a permanent query.
 */
export function buildCategoryQueryString(query: CategoryQuery): string {
  const params = new URLSearchParams();

  if (query.band !== DEFAULT_CATEGORY_QUERY.band)
    params.set('band', query.band);
  if (query.priceMin !== '') params.set('priceMin', query.priceMin);
  if (query.priceMax !== '') params.set('priceMax', query.priceMax);
  if (query.sort !== DEFAULT_CATEGORY_QUERY.sort)
    params.set('sort', query.sort);
  if (query.view !== DEFAULT_CATEGORY_QUERY.view)
    params.set('view', query.view);
  if (query.page > 1) params.set('page', String(query.page));
  if (query.allCats) params.set('allCats', '1');

  const search = params.toString();

  return search === '' ? '' : `?${search}`;
}

/**
 * A link to the same category with some values changed. Changing anything
 * but the page resets to page 1 — a narrower or wider result set at the same
 * page number is usually a page that no longer exists.
 */
export function categoryHref(
  slug: string,
  query: CategoryQuery,
  changes: Partial<CategoryQuery>,
): string {
  const next: CategoryQuery = {
    ...query,
    ...changes,
    ...(changes.page === undefined ? { page: 1 } : {}),
  };

  return `${categoryPath(slug)}${buildCategoryQueryString(next)}`;
}

/** True when anything narrows the list — decides empty vs filtered-empty. */
export function hasActiveFilters(query: CategoryQuery): boolean {
  return (
    query.band !== DEFAULT_CATEGORY_QUERY.band ||
    query.priceMin !== '' ||
    query.priceMax !== ''
  );
}
