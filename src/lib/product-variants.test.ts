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
  variantById,
  variantCountInWords,
  variantsAboveFloor,
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

describe('variantById', () => {
  it('matches a real id', () => {
    expect(variantById(VARIANTS, 'black-m')?.id).toBe('black-m');
  });

  it('returns undefined for anything it does not recognise', () => {
    // The payload is the allow-list, so a stale, malformed, or hostile value can
    // only miss. Callers fall back rather than throwing — a bad `?variant=` on a
    // crawlable URL must not become a 500.
    [
      undefined,
      '',
      'nope',
      '../../etc/passwd',
      '<script>alert(1)</script>',
    ].forEach((value) => {
      expect(variantById(VARIANTS, value)).toBe(undefined);
    });
  });
});

describe('variantCountInWords', () => {
  it('spells out the counts a product page actually shows', () => {
    expect(variantCountInWords(1)).toBe('One');
    expect(variantCountInWords(2)).toBe('Two');
    expect(variantCountInWords(10)).toBe('Ten');
    expect(variantCountInWords(20)).toBe('Twenty');
  });

  it('falls back to digits past twenty', () => {
    // Words stop reading as prose long before the contract's 200-variant cap. A
    // bare count is not a currency-formatted token, so it does not reintroduce
    // the second-money-string exposure the words rule exists to avoid.
    expect(variantCountInWords(21)).toBe('21');
    expect(variantCountInWords(200)).toBe('200');
  });
});

describe('variantsAboveFloor', () => {
  function priced(id: string, amountMinor: number): ProductVariant {
    return {
      id,
      sku: `S3V-${id}`,
      price: { amountMinor, currency: 'USD' },
      availability: 'AVAILABLE',
    };
  }

  it('counts the options that cost more than the figure on screen', () => {
    const variants = [
      priced('a', 451),
      priced('b', 530),
      priced('c', 780),
      priced('d', 2000),
      priced('e', 2000),
    ];

    expect(variantsAboveFloor(variants, usd(451))).toEqual({
      total: 5,
      dearer: 4,
    });
  });

  it('reports none dearer when every option is the same price', () => {
    expect(
      variantsAboveFloor([priced('a', 2000), priced('b', 2000)], usd(2000)),
    ).toEqual({ total: 2, dearer: 0 });
  });

  /** One option is not a spread, and "From" is not rendered for it either. */
  it('says nothing about a single variant', () => {
    expect(variantsAboveFloor([priced('a', 451)], usd(451))).toBeUndefined();
  });

  /**
   * A currency mix is not a distribution one floor describes. Returning a count
   * across two currencies would compare minor units of different money.
   */
  it('says nothing when the variants mix currencies', () => {
    const mixed: ProductVariant[] = [
      priced('a', 451),
      {
        id: 'b',
        sku: 'S3V-b',
        price: { amountMinor: 700, currency: 'AUD' },
        availability: 'AVAILABLE',
      },
    ];

    expect(variantsAboveFloor(mixed, usd(451))).toBeUndefined();
  });

  /**
   * No money value is returned, deliberately: the panel keeps exactly one
   * currency-formatted string in its price block, because a second one is what
   * a price extractor can pick up instead of the real offer price.
   */
  it('returns counts only, never a price', () => {
    const result = variantsAboveFloor(
      [priced('a', 451), priced('b', 2000)],
      usd(451),
    );

    expect(Object.keys(result ?? {}).sort()).toEqual(['dearer', 'total']);
  });
});
