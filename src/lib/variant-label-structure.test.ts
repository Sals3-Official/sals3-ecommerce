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

  it('refuses an incomplete cross-product rather than guessing the gaps', () => {
    // Black-1XL and Red-2XL imply 2 x 2 = 4 combinations but only 2 exist. The
    // missing Black-2XL and Red-1XL are unknowable, so this is not an encoding.
    expect(
      deriveVariantLabelStructure([
        variant('a', 'Black-1XL'),
        variant('b', 'Red-2XL'),
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
