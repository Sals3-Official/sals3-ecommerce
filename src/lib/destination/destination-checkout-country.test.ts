import { describe, expect, it } from 'vitest';
import destinationToCheckoutCountry from './destination-checkout-country';

describe('destinationToCheckoutCountry', () => {
  it.each([
    ['AU', 'AU'],
    ['PH', 'PH'],
    ['FJ', 'FJ'],
  ])('maps %s to itself', (code, expected) => {
    expect(destinationToCheckoutCountry(code)).toBe(expected);
  });

  it.each([['NZ'], ['US'], ['CA'], ['GLOBAL']])(
    'has no threshold key for %s',
    (code) => {
      expect(destinationToCheckoutCountry(code)).toBeUndefined();
    },
  );
});
