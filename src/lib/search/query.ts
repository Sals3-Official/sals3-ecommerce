import {
  isSortKey,
  isViewKey,
  type SortKey,
  type ViewKey,
} from '@/lib/catalog/query';
import { isPriceBandId, type PriceBandId } from '@/lib/catalog/price-bands';
import { isDepartmentId } from '@/lib/departments';

/**
 * `/search` list state, in the URL and nowhere else.
 *
 * Deliberately a sibling of `lib/catalog/query.ts` rather than a generalisation
 * of it. The two surfaces answer different questions — one browses a department
 * named in the path, the other searches the catalogue with the department as a
 * *filter* — and folding them into one type would give each page a field it has
 * no meaning for. What they genuinely share (price bands, sort and view keys,
 * the range parser) is imported rather than copied.
 *
 * Every value except `q` is allow-listed. `q` is the one free-text field, so it
 * is trimmed and truncated instead: it is never interpolated into a URL, a
 * redirect or a query builder, only re-rendered by React, which escapes it, and
 * sent as a parameter the producer bounds again.
 */

export const SEARCH_PATH = '/search';

/** Matches the producer's own cap, so a term cannot be truncated twice. */
const MAX_TERM_LENGTH = 80;

export const SEARCH_PAGE_SIZE = 20;

export type SearchQuery = {
  q: string;
  /** A department slug, or `null` for the whole catalogue. */
  category: string | null;
  band: PriceBandId;
  priceMin: string;
  priceMax: string;
  sort: SortKey;
  view: ViewKey;
  page: number;
};

export const DEFAULT_SEARCH_QUERY: SearchQuery = {
  q: '',
  category: null,
  band: 'any',
  priceMin: '',
  priceMax: '',
  sort: 'best',
  view: 'grid',
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** A repeated parameter is ambiguous, so it is discarded rather than guessed. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const MAX_TYPED_PRICE_LENGTH = 12;

export function parseSearchQuery(params: RawSearchParams): SearchQuery {
  const category = single(params.category);
  const band = single(params.band);
  const sort = single(params.sort);
  const view = single(params.view);
  const rawPage = Number.parseInt(single(params.page) ?? '', 10);

  return {
    q: (single(params.q) ?? '').trim().slice(0, MAX_TERM_LENGTH),
    // Checked against the taxonomy, not merely shape-checked: an unknown
    // department must not reach the producer as a filter it will honour.
    category:
      category !== undefined && isDepartmentId(category) ? category : null,
    band:
      band !== undefined && isPriceBandId(band)
        ? band
        : DEFAULT_SEARCH_QUERY.band,
    priceMin: (single(params.priceMin) ?? '')
      .trim()
      .slice(0, MAX_TYPED_PRICE_LENGTH),
    priceMax: (single(params.priceMax) ?? '')
      .trim()
      .slice(0, MAX_TYPED_PRICE_LENGTH),
    sort:
      sort !== undefined && isSortKey(sort) ? sort : DEFAULT_SEARCH_QUERY.sort,
    view:
      view !== undefined && isViewKey(view) ? view : DEFAULT_SEARCH_QUERY.view,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

/** Builds `?…`, dropping every value that equals its default. */
export function buildSearchQueryString(query: SearchQuery): string {
  const params = new URLSearchParams();

  if (query.q !== '') params.set('q', query.q);
  if (query.category !== null) params.set('category', query.category);
  if (query.band !== DEFAULT_SEARCH_QUERY.band) params.set('band', query.band);
  if (query.priceMin !== '') params.set('priceMin', query.priceMin);
  if (query.priceMax !== '') params.set('priceMax', query.priceMax);
  if (query.sort !== DEFAULT_SEARCH_QUERY.sort) params.set('sort', query.sort);
  if (query.view !== DEFAULT_SEARCH_QUERY.view) params.set('view', query.view);
  if (query.page > 1) params.set('page', String(query.page));

  const search = params.toString();

  return search === '' ? '' : `?${search}`;
}

/**
 * A link to the same search with some values changed. Changing anything but the
 * page resets to page 1 — the keyword always survives, which is the whole point
 * of filtering a search rather than starting a new one.
 */
export function searchHref(
  query: SearchQuery,
  changes: Partial<SearchQuery>,
): string {
  const next: SearchQuery = {
    ...query,
    ...changes,
    ...(changes.page === undefined ? { page: 1 } : {}),
  };

  return `${SEARCH_PATH}${buildSearchQueryString(next)}`;
}

/** True when anything beyond the keyword narrows the results. */
export function hasActiveFilters(query: SearchQuery): boolean {
  return (
    query.category !== null ||
    query.band !== DEFAULT_SEARCH_QUERY.band ||
    query.priceMin !== '' ||
    query.priceMax !== ''
  );
}
