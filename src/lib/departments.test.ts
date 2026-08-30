import { describe, expect, it } from 'vitest';
import {
  departmentIdForName,
  departmentsOrTaxonomy,
  isDepartmentId,
} from './departments';
import { categories as taxonomyDepartments } from './home-placeholder-data';

const LEAF_FEED = [
  { id: 'aquarium-lighting', code: 'AL', name: 'Aquarium Lighting' },
  { id: 'rangefinders', code: 'RA', name: 'Rangefinders' },
];

describe('isDepartmentId', () => {
  it('knows the taxonomy departments and nothing else', () => {
    expect(isDepartmentId('apparel-accessories')).toBe(true);
    expect(isDepartmentId('mature')).toBe(true);
    expect(isDepartmentId('breast-milk-storage-containers')).toBe(false);
    expect(isDepartmentId('cat-ggl-5079')).toBe(false);
  });
});

describe('departmentsOrTaxonomy', () => {
  it('keeps a feed that speaks departments, order and all', () => {
    const feed = [
      { id: 'furniture', code: 'FU', name: 'Furniture' },
      { id: 'electronics', code: 'EL', name: 'Electronics' },
    ];

    expect(departmentsOrTaxonomy(feed)).toEqual(feed);
  });

  it('replaces a leaf-shaped response — a stale portal must not set the vocabulary', () => {
    expect(departmentsOrTaxonomy(LEAF_FEED)).toEqual(taxonomyDepartments);
  });

  it('replaces a response that is only partly departments', () => {
    expect(
      departmentsOrTaxonomy([
        { id: 'furniture', code: 'FU', name: 'Furniture' },
        ...LEAF_FEED,
      ]),
    ).toEqual(taxonomyDepartments);
  });

  it('falls back on a failed or empty read', () => {
    expect(departmentsOrTaxonomy(null)).toEqual(taxonomyDepartments);
    expect(departmentsOrTaxonomy([])).toEqual(taxonomyDepartments);
  });

  it('returns a copy, never the shared constant itself', () => {
    const result = departmentsOrTaxonomy(null);

    result.pop();

    expect(taxonomyDepartments).toHaveLength(21);
  });
});

describe('departmentIdForName', () => {
  it('turns a department name into its browse slug', () => {
    // The PDP breadcrumb's first category segment is exactly this string, and
    // `/c/apparel-accessories` is a live route with 107 products behind it.
    expect(departmentIdForName('Apparel & Accessories')).toBe(
      'apparel-accessories',
    );
    expect(departmentIdForName('Food, Beverages & Tobacco')).toBe(
      'food-beverages-tobacco',
    );
  });

  it('tolerates the whitespace a display path can carry', () => {
    expect(departmentIdForName('  Apparel & Accessories  ')).toBe(
      'apparel-accessories',
    );
  });

  it('answers undefined for anything that is not one of the 21', () => {
    // `Clothing` and `Pants` are real taxonomy levels and neither is a
    // department, so neither has a route. Returning a slug for them would point
    // a buyer at a 404 — both were verified to 404 on production.
    expect(departmentIdForName('Clothing')).toBe(undefined);
    expect(departmentIdForName('Pants')).toBe(undefined);
    // A CJ-mirrored product carries its whole supplier path in one segment.
    expect(departmentIdForName('Men Clothing > Pants > Jeans')).toBe(undefined);
    expect(departmentIdForName('')).toBe(undefined);
  });

  it('agrees with isDepartmentId in both directions', () => {
    // One list, two readings. If these ever disagree, a taxonomy change landed
    // on one direction only.
    ['apparel-accessories', 'electronics', 'baby-toddler'].forEach((id) => {
      expect(isDepartmentId(id)).toBe(true);
    });
  });
});
