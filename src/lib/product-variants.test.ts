import { describe, expect, it } from 'vitest';
import { usd } from './money';
import type { ProductOptionAxis, ProductVariant } from './product-detail';
import {
  defaultVariantFor,
  firstUnchosenAxis,
  initialSelection,
  isValueSelectable,
  optionSummary,
  resolveVariant,
} from './product-variants';

function variant(
  id: string,
  options: { name: string; value: string }[],
  availability: ProductVariant['availability'] = 'AVAILABLE',
): ProductVariant {
  return {
    id,
    sku: `SKU-${id}`,
    price: usd(1999),
    availability,
    options,
  };
}

const VARIANTS: ProductVariant[] = [
  variant('black-m', [
    { name: 'Colour', value: 'Black' },
    { name: 'Size', value: 'M' },
  ]),
  variant('black-l', [
    { name: 'Colour', value: 'Black' },
    { name: 'Size', value: 'L' },
  ]),
  variant('white-l', [
    { name: 'Colour', value: 'White' },
    { name: 'Size', value: 'L' },
  ]),
];

const AXES: ProductOptionAxis[] = [
  { name: 'Colour', values: ['Black', 'White'] },
  { name: 'Size', values: ['M', 'L'] },
];

describe('resolveVariant', () => {
  it('resolves an exact match on every axis', () => {
    expect(
      resolveVariant(VARIANTS, AXES, { Colour: 'White', Size: 'L' })?.id,
    ).toBe('white-l');
  });

  /**
   * A partial match must not resolve. With two axes chosen out of three, "the
   * first variant that fits" would price and add a variant the buyer never
   * picked.
   */
  it('resolves nothing while any axis is unchosen', () => {
    expect(resolveVariant(VARIANTS, AXES, { Colour: 'Black' })).toBeUndefined();
  });

  it('resolves nothing for a combination that does not exist', () => {
    expect(
      resolveVariant(VARIANTS, AXES, { Colour: 'White', Size: 'M' }),
    ).toBeUndefined();
  });
});

describe('initialSelection', () => {
  /**
   * With one variant there is nothing to choose, and leaving it unchosen would
   * disable Add to Cart on a product with exactly one combination.
   */
  it('preselects a single variant', () => {
    const only = [variant('only', [{ name: 'Colour', value: 'Black' }])];

    expect(
      initialSelection(only, [{ name: 'Colour', values: ['Black'] }]),
    ).toEqual({ Colour: 'Black' });
  });

  it('chooses nothing when there is a real choice to make', () => {
    expect(initialSelection(VARIANTS, AXES)).toEqual({});
  });
});

describe('isValueSelectable', () => {
  it('respects the other axes already chosen', () => {
    // White only exists in L, so with M chosen it is not reachable.
    expect(isValueSelectable(VARIANTS, { Size: 'M' }, 'Colour', 'White')).toBe(
      false,
    );
    expect(isValueSelectable(VARIANTS, { Size: 'L' }, 'Colour', 'White')).toBe(
      true,
    );
  });

  it('treats every existing value as reachable when nothing is chosen', () => {
    expect(isValueSelectable(VARIANTS, {}, 'Size', 'M')).toBe(true);
    expect(isValueSelectable(VARIANTS, {}, 'Colour', 'White')).toBe(true);
  });

  it('rejects a value no variant carries', () => {
    expect(isValueSelectable(VARIANTS, {}, 'Size', 'XXL')).toBe(false);
  });
});

describe('optionSummary', () => {
  it('joins the values in the order the portal returned them', () => {
    expect(optionSummary(VARIANTS[0]!)).toBe('Black · M');
  });

  it('returns nothing for a variant with no axes', () => {
    expect(optionSummary(variant('plain', []))).toBeUndefined();
  });
});

describe('defaultVariantFor', () => {
  it('chooses the available variant matching the base price', () => {
    const variants = [
      { ...variant('expensive', []), price: usd(780) },
      { ...variant('base', []), price: usd(451) },
    ];

    expect(defaultVariantFor(variants, usd(451))?.id).toBe('base');
  });

  it('falls back to the first available variant', () => {
    const variants = [
      {
        ...variant('unavailable-match', [], 'UNAVAILABLE'),
        price: usd(451),
      },
      { ...variant('available', []), price: usd(780) },
    ];

    expect(defaultVariantFor(variants, usd(451))?.id).toBe('available');
  });
});

describe('firstUnchosenAxis', () => {
  it('names the axis a buyer still has to pick', () => {
    expect(firstUnchosenAxis(AXES, { Colour: 'Black' })?.name).toBe('Size');
    expect(firstUnchosenAxis(AXES, { Colour: 'Black', Size: 'L' })).toBe(
      undefined,
    );
  });
});
