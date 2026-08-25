import { describe, expect, it } from 'vitest';
import { PSF_SLIDES } from '@/lib/ads/sponsored-slides';
import { usd } from '@/lib/money';
import {
  AD_MAX_GAP,
  AD_MIN_GAP,
  categoryAdSeed,
  withAdSlots,
  type ListingItem,
} from './ad-slots';
import type { CategoryProduct } from './filter-products';
import { DEFAULT_CATEGORY_QUERY, type CategoryQuery } from './query';

function makeProducts(count: number): CategoryProduct[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p-${index + 1}`,
    title: `Product ${index + 1}`,
    price: usd(1000 + index),
    tone: 'ocean' as const,
    availability: 'UNKNOWN' as const,
  }));
}

function adIndexes(items: ListingItem[]): number[] {
  return items.flatMap((item, index) => (item.kind === 'ad' ? [index] : []));
}

function query(changes: Partial<CategoryQuery> = {}): CategoryQuery {
  return { ...DEFAULT_CATEGORY_QUERY, ...changes };
}

describe('withAdSlots', () => {
  it('keeps every product, in order, and adds the sponsored card', () => {
    const products = makeProducts(20);
    const items = withAdSlots(products, 'electronics|best|any||1');

    expect(items.filter((item) => item.kind === 'product')).toHaveLength(20);
    expect(
      items
        .filter((item) => item.kind === 'product')
        .map((item) => item.product.id),
    ).toEqual(products.map((product) => product.id));
    expect(adIndexes(items)).toHaveLength(1);
  });

  it('places the card inside the proposal cadence on a full page', () => {
    const products = makeProducts(20);

    // Every seed, not one lucky one: the draw must stay in the 8–10 window.
    for (let seed = 0; seed < 200; seed += 1) {
      const items = withAdSlots(products, `seed-${seed}`);
      const [position] = adIndexes(items);

      expect(position).toBeGreaterThanOrEqual(AD_MIN_GAP);
      expect(position).toBeLessThanOrEqual(AD_MAX_GAP);
    }
  });

  it('is stable for one listing and varies across listings', () => {
    const products = makeProducts(20);
    const seedA = categoryAdSeed('electronics', query());
    const seedB = categoryAdSeed('home-garden', query());

    expect(adIndexes(withAdSlots(products, seedA))).toEqual(
      adIndexes(withAdSlots(products, seedA)),
    );

    const spread = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(
        (seed) => adIndexes(withAdSlots(products, seed))[0],
      ),
    );

    expect(spread.size).toBeGreaterThan(1);
    expect(adIndexes(withAdSlots(products, seedB))).toBeDefined();
  });

  it('still shows the card on a department far shorter than the cadence', () => {
    // The live catalogue's real shape today — a one-product department. An
    // unclamped 8–10 gap would mean the placement never fired anywhere.
    const items = withAdSlots(
      makeProducts(1),
      'animals-pet-supplies|best|any||1',
    );

    expect(items).toHaveLength(2);
    expect(items[1]).toEqual({ kind: 'ad', slotKey: 'ad-slot-0' });
  });

  it('adds nothing to an empty listing', () => {
    expect(withAdSlots([], 'electronics|best|any||1')).toEqual([]);
  });

  it('never draws more cards than the creative pool holds', () => {
    // 100 products is ten cadence windows; the pool has one creative, so one
    // card. A repeated identical "Sponsored" card is not more inventory.
    expect(adIndexes(withAdSlots(makeProducts(100), 'long'))).toHaveLength(1);
  });

  it('keys the slot by the slot, so the campaign can change under it', () => {
    const items = withAdSlots(makeProducts(20), 'electronics|best|any||1');
    const ad = items.find((item) => item.kind === 'ad')!;

    expect(ad.slotKey).toBe('ad-slot-0');
  });

  it('has a campaign behind the slot it reserves', () => {
    // `HAS_CREATIVES` gates the slot: an empty campaign must leave the feed
    // alone rather than reserving an empty cell in it.
    expect(PSF_SLIDES.length).toBeGreaterThan(0);
  });
});

describe('categoryAdSeed', () => {
  it('changes whenever the result set changes', () => {
    const base = categoryAdSeed('electronics', query());

    expect(categoryAdSeed('home-garden', query())).not.toBe(base);
    expect(categoryAdSeed('electronics', query({ page: 2 }))).not.toBe(base);
    expect(
      categoryAdSeed('electronics', query({ sort: 'price-asc' })),
    ).not.toBe(base);
    expect(categoryAdSeed('electronics', query({ band: 'u15' }))).not.toBe(
      base,
    );
    expect(categoryAdSeed('electronics', query({ priceMin: '10' }))).not.toBe(
      base,
    );
  });

  it('ignores state that does not change the result set', () => {
    expect(categoryAdSeed('electronics', query({ view: 'list' }))).toBe(
      categoryAdSeed('electronics', query({ view: 'grid' })),
    );
  });
});
