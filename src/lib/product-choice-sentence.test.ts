import { describe, expect, it } from 'vitest';
import chooseSentence from './product-choice-sentence';

describe('chooseSentence', () => {
  /**
   * The whole reason this is not a fixed string: the sentence and the chips
   * above it must use the same word, and that word comes from the seller.
   */
  it('names the axis in the seller’s own word for it', () => {
    expect(chooseSentence('Colour')).toBe('Choose a colour to continue.');
    expect(chooseSentence('Size')).toBe('Choose a size to continue.');
  });

  it('uses “an” before a vowel', () => {
    expect(chooseSentence('Age Group')).toBe(
      'Choose an age group to continue.',
    );
  });

  /**
   * Products with no named axes are the common shape in this catalogue — the
   * portal writes `product_options` for some and not others — so the fallback
   * is a real path, not a defensive one.
   */
  it('falls back to the generic noun with no axis to name', () => {
    expect(chooseSentence()).toBe('Choose an option to continue.');
    expect(chooseSentence('')).toBe('Choose an option to continue.');
    expect(chooseSentence('   ')).toBe('Choose an option to continue.');
  });

  it('tolerates a seller’s stray whitespace and casing', () => {
    expect(chooseSentence('  LENGTH  ')).toBe('Choose a length to continue.');
  });
});
