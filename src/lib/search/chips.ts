import { formatMoney, usd } from '@/lib/money';
import { activePriceRange } from '@/lib/catalog/filter-products';
import { priceBandById } from '@/lib/catalog/price-bands';
import type { FilterChip } from '@/lib/catalog/chips';
import { categories } from '@/lib/home-placeholder-data';
import { searchHref, type SearchQuery } from './query';

/**
 * One chip per active filter, each carrying the href that clears just that one.
 *
 * The keyword itself is deliberately **not** a chip. A chip is something a
 * buyer removes to widen the results, and removing the term does not widen a
 * search — it ends it. The term stays in the search box, where it can be
 * edited, and the page's own heading says what was searched for.
 */
export function buildSearchChips(query: SearchQuery): FilterChip[] {
  const chips: FilterChip[] = [];
  const range = activePriceRange(query.band, query.priceMin, query.priceMax);

  if (query.category !== null) {
    const department = categories.find((entry) => entry.id === query.category);

    if (department !== undefined) {
      chips.push({
        label: department.name,
        clearHref: searchHref(query, { category: null }),
      });
    }
  }

  if (range.typed) {
    const lo = range.minMinor > 0 ? formatMoney(usd(range.minMinor)) : null;
    const hi =
      range.maxMinor === Infinity ? null : formatMoney(usd(range.maxMinor));
    const label = (() => {
      if (lo !== null && hi !== null) return `${lo} – ${hi}`;
      if (lo !== null) return `${lo} and up`;
      return `Up to ${hi}`;
    })();

    chips.push({
      label,
      clearHref: searchHref(query, { priceMin: '', priceMax: '' }),
    });
  } else if (query.band !== 'any') {
    chips.push({
      label: priceBandById(query.band).label,
      clearHref: searchHref(query, { band: 'any' }),
    });
  }

  return chips;
}

/** Clears every filter but keeps the keyword — the search is not the filter. */
export function clearSearchFiltersHref(query: SearchQuery): string {
  return searchHref(query, {
    category: null,
    band: 'any',
    priceMin: '',
    priceMax: '',
  });
}
