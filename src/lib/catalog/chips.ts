import { formatMoney, usd } from '@/lib/money';
import { activePriceRange } from './filter-products';
import { priceBandById } from './price-bands';
import { categoryHref, type CategoryQuery } from './query';

export type FilterChip = { label: string; clearHref: string };

/**
 * One chip per active filter, each carrying the href that clears just that
 * filter — real `next/link` anchors, no client state needed to render them.
 */
export function buildFilterChips(
  slug: string,
  query: CategoryQuery,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const range = activePriceRange(query.band, query.priceMin, query.priceMax);

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
      clearHref: categoryHref(slug, query, { priceMin: '', priceMax: '' }),
    });
  } else if (query.band !== 'any') {
    chips.push({
      label: priceBandById(query.band).label,
      clearHref: categoryHref(slug, query, { band: 'any' }),
    });
  }

  return chips;
}

export function clearAllHref(slug: string, query: CategoryQuery): string {
  return categoryHref(slug, query, {
    band: 'any',
    priceMin: '',
    priceMax: '',
  });
}
