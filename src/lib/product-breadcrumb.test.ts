import { describe, expect, it } from 'vitest';
import { breadcrumbTrail } from './product-breadcrumb';
import type { ProductDetail } from './product-detail';

function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'mens-corduroy-jacket',
    title: "Men's Casual Retro Corduroy Jacket Coat",
    category: 'cj-1ae8d0c2',
    price: { amountMinor: 451, currency: 'USD' },
    imageAlt: "Men's Casual Retro Corduroy Jacket Coat",
    tone: 'ocean',
    images: [],
    ...overrides,
  };
}

describe('breadcrumbTrail', () => {
  it('links only what has a route when the first segment is no department', () => {
    const trail = breadcrumbTrail(
      detail({ categoryPath: "Apparel > Outerwear > Men's Jackets" }),
    );

    expect(trail.map((entry) => entry.name)).toEqual([
      'Home',
      'All categories',
      'Apparel',
      'Outerwear',
      "Men's Jackets",
      "Men's Casual Retro Corduroy Jacket Coat",
    ]);
    // `Apparel` alone is not one of the 21 departments — the department is
    // `Apparel & Accessories` — so it resolves to nothing and stays text. The
    // allow-list decides, which is what keeps a near-miss off a 404.
    expect(trail.filter((entry) => entry.href !== undefined)).toEqual([
      { name: 'Home', href: '/' },
      { name: 'All categories', href: '/categories' },
    ]);
  });

  /**
   * The real jeans PDP, read off production: `Apparel & Accessories / Clothing /
   * Pants` rendered as three dead spans while `/c/apparel-accessories` was live
   * with 107 products behind it.
   */
  it('links the L1 department, and leaves the levels below it as text', () => {
    const trail = breadcrumbTrail(
      detail({
        title: "Men's Rhinestone Star Jeans",
        categoryPath: 'Apparel & Accessories > Clothing > Pants',
      }),
    );

    expect(trail).toEqual([
      { name: 'Home', href: '/' },
      { name: 'All categories', href: '/categories' },
      { name: 'Apparel & Accessories', href: '/c/apparel-accessories' },
      // Both verified to answer 404 on production: only departments are routable.
      { name: 'Clothing' },
      { name: 'Pants' },
      { name: "Men's Rhinestone Star Jeans" },
    ]);
  });

  it('never links a deeper segment, even one named like a department', () => {
    // Only position 0 can be an L1. A deeper `Electronics` is a different
    // category, and linking it would send a buyer where the product is not.
    const trail = breadcrumbTrail(
      detail({ categoryPath: 'Business & Industrial > Electronics > Cable' }),
    );

    expect(trail.filter((entry) => entry.href !== undefined)).toEqual([
      { name: 'Home', href: '/' },
      { name: 'All categories', href: '/categories' },
      { name: 'Business & Industrial', href: '/c/business-industrial' },
    ]);
  });

  it('leaves a CJ-mirrored path unlinked, whole supplier path and all', () => {
    // One segment carrying the supplier's own path. It matches no department, so
    // the allow-list refuses it without anything else having to notice.
    const trail = breadcrumbTrail(
      detail({ categoryPath: 'Men Clothing > Pants > Jeans > Wide Leg' }),
    );

    expect(trail.filter((entry) => entry.href?.startsWith('/c/'))).toHaveLength(
      0,
    );
  });

  it('drops empty segments rather than rendering a blank crumb', () => {
    const trail = breadcrumbTrail(
      detail({ categoryPath: ' Apparel >  > Outerwear > ' }),
    );

    expect(trail.map((entry) => entry.name)).toEqual([
      'Home',
      'All categories',
      'Apparel',
      'Outerwear',
      "Men's Casual Retro Corduroy Jacket Coat",
    ]);
  });

  it('falls back to the category name when no path arrives', () => {
    const trail = breadcrumbTrail(detail({ categoryName: "Men's Jackets" }));

    expect(trail.map((entry) => entry.name)).toEqual([
      'Home',
      'All categories',
      "Men's Jackets",
      "Men's Casual Retro Corduroy Jacket Coat",
    ]);
  });

  it('falls back to the raw category code when there is nothing better', () => {
    // Ugly, but true: a CJ-mirrored code is what the payload has. Inventing a
    // prettier label would be inventing a category name.
    // Found rather than indexed: this asserted position 1 and broke the day
    // `All categories` was inserted ahead of it, which is a fact about the
    // assertion and not about the fallback.
    const trail = breadcrumbTrail(detail());
    const middle = trail.slice(2, -1);

    expect(middle).toEqual([{ name: 'cj-1ae8d0c2' }]);
  });

  it('treats a path of only separators as absent', () => {
    const trail = breadcrumbTrail(
      detail({ categoryPath: ' > > ', categoryName: 'Fashion' }),
    );

    expect(trail.map((entry) => entry.name)).toEqual([
      'Home',
      'All categories',
      'Fashion',
      "Men's Casual Retro Corduroy Jacket Coat",
    ]);
  });
});
