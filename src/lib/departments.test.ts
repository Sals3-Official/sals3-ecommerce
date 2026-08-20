import { describe, expect, it } from 'vitest';
import { departmentsOrTaxonomy, isDepartmentId } from './departments';
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
