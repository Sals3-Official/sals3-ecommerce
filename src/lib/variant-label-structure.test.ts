import { describe, expect, it } from 'vitest';
import { usd } from './money';
import type { ProductVariant } from './product-detail';
import { deriveVariantLabelStructure } from './variant-label-structure';

function variant(id: string, label?: string): ProductVariant {
  return {
    id,
    sku: `S3V-${id}`,
    price: usd(451),
    availability: 'AVAILABLE',
    ...(label === undefined ? {} : { label }),
  };
}

/**
 * The real corduroy jacket, read off the live add-product screen on 2026-08-14:
 * two colours by five sizes, ten variants, no gaps.
 */
const REAL_LABELS = [
  'Black-S',
  'Black-M',
  'Black-L',
  'Black-XL',
  'Black-XXL',
  'Army Green-S',
  'Army Green-M',
  'Army Green-L',
  'Army Green-XL',
  'Army Green-XXL',
];

describe('deriveVariantLabelStructure', () => {
  it('recovers the real 2 x 5 grid from production labels', () => {
    const result = deriveVariantLabelStructure(
      REAL_LABELS.map((label, index) => variant(`v${index}`, label)),
    );

    // Note the colour containing a space: splitting on CJ's hyphen keeps
    // "Army Green" whole, which a space-delimited split would have broken.
    expect(result?.positions).toEqual([
      ['Black', 'Army Green'],
      ['S', 'M', 'L', 'XL', 'XXL'],
    ]);
    expect(result?.byCombination.get('Army Green-XL')).toBe('v8');
  });

  it('names nothing — positions are indexes, not meanings', () => {
    const result = deriveVariantLabelStructure(
      REAL_LABELS.map((label, index) => variant(`v${index}`, label)),
    );

    // The guarantee that keeps this inside the never-split rule: the output
    // carries values and positions only. Nothing here says "Colour" or "Size",
    // because nothing in the supplier payload does.
    expect(JSON.stringify(result?.positions)).not.toMatch(/colour|color|size/i);
  });

  it('refuses a sparse grid that would cost more chips than showing labels whole', () => {
    // Black-1XL and Red-2XL imply 2 x 2 = 4 combinations and only 2 exist, so as
    // rows this is four chips to reach two products. Sparse grids are offered
    // now, but only where they compress — this one does the opposite.
    expect(
      deriveVariantLabelStructure([
        variant('a', 'Black-1XL'),
        variant('b', 'Red-2XL'),
      ]),
    ).toBe(undefined);
  });

  /**
   * The real `Three-proof Casual Sports Mountaineering Tactical Pants`, read off
   * the live storefront payload on 2026-08-31: 52 variants over 8
   * colour-and-gender values by 8 sizes, so 12 of the 64 combinations are absent.
   * Before this the buyer met all 52 labels as one flat wall of chips.
   */
  const SPARSE_LABELS = [
    ...['Black Men', 'Gray Male', 'Khaki Male', 'Light Brown Male'].flatMap(
      (group) =>
        ['L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'].map(
          (size) => `${group}-${size}`,
        ),
    ),
    ...[
      'Black Female',
      'Female, Gray',
      'Khaki Women',
      'Light Brown Women',
    ].flatMap((group) =>
      ['M', 'L', 'XL', '2XL', '3XL', '4XL'].map((size) => `${group}-${size}`),
    ),
  ];

  it('offers the real sparse 8 x 8 grid, turning 52 chips into 16', () => {
    const result = deriveVariantLabelStructure(
      SPARSE_LABELS.map((label, index) => variant(`v${index}`, label)),
    );

    expect(SPARSE_LABELS).toHaveLength(52);
    expect(result?.positions.map((values) => values.length)).toEqual([8, 8]);
    expect(
      result?.positions.reduce((total, values) => total + values.length, 0),
    ).toBe(16);
  });

  it('leaves the twelve absent combinations absent, for the caller to draw disabled', () => {
    const result = deriveVariantLabelStructure(
      SPARSE_LABELS.map((label, index) => variant(`v${index}`, label)),
    );

    // Real, so a swap onto it navigates.
    expect(result?.byCombination.get('Khaki Women-4XL')).toBe('v45');
    // Absent. `ProductOptionList` renders a miss as a disabled `Unavailable`
    // chip, which is the whole reason a hole needs no guessing.
    expect(result?.byCombination.get('Khaki Women-6XL')).toBe(undefined);
    expect(result?.byCombination.get('Black Men-M')).toBe(undefined);
    // `size` counts purchasable variants, never the cross-product.
    expect(result?.byCombination.size).toBe(52);
  });

  it('still offers a complete grid whose chip count equals its variant count', () => {
    // 2 x 2 = 4 variants, 4 chips. Completeness is checked first, or this
    // regresses.
    const result = deriveVariantLabelStructure(
      ['Black-S', 'Black-M', 'Red-S', 'Red-M'].map((label, index) =>
        variant(`v${index}`, label),
      ),
    );

    expect(result?.positions.map((values) => values.length)).toEqual([2, 2]);
  });

  it('refuses a diagonal, where every extra chip is a dead end', () => {
    expect(
      deriveVariantLabelStructure([
        variant('a', 'A-1'),
        variant('b', 'B-2'),
        variant('c', 'C-3'),
      ]),
    ).toBe(undefined);
  });

  it('refuses a ragged token count', () => {
    expect(
      deriveVariantLabelStructure([
        variant('a', 'Black-S'),
        variant('b', 'Black-S-Cotton'),
        variant('c', 'Red-S'),
        variant('d', 'Red-M'),
      ]),
    ).toBe(undefined);
  });

  it('refuses when any label is missing', () => {
    expect(
      deriveVariantLabelStructure([
        variant('a', 'Black-S'),
        variant('b'),
        variant('c', 'Red-S'),
        variant('d', 'Red-M'),
      ]),
    ).toBe(undefined);
  });

  it('refuses a single-token label', () => {
    expect(
      deriveVariantLabelStructure([
        variant('a', 'default'),
        variant('b', 'other'),
      ]),
    ).toBe(undefined);
  });

  it('refuses a position that does not vary', () => {
    // "Black" is a constant sitting inside the label, not an axis. Presenting it
    // as a one-value chip row would invent a choice the buyer does not have.
    expect(
      deriveVariantLabelStructure([
        variant('a', 'Black-S'),
        variant('b', 'Black-M'),
      ]),
    ).toBe(undefined);
  });

  it('refuses duplicate labels, which would mis-price a selection', () => {
    expect(
      deriveVariantLabelStructure([
        variant('a', 'Black-S'),
        variant('b', 'Black-S'),
        variant('c', 'Red-S'),
        variant('d', 'Red-M'),
      ]),
    ).toBe(undefined);
  });

  it('refuses fewer than two variants', () => {
    expect(deriveVariantLabelStructure([variant('a', 'Black-S')])).toBe(
      undefined,
    );
  });
});
