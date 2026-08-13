import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  isSupportedCurrency,
  money,
  multiplyMoney,
  percentOff,
  sumMoney,
  usd,
} from './money';

describe('formatMoney', () => {
  /**
   * `US$`, not a bare `$`: Australia and the Philippines are both approved buyer
   * destinations, so an unqualified dollar sign is ambiguous to a buyer in
   * either.
   */
  it('qualifies the dollar sign', () => {
    expect(formatMoney(usd(199900))).toBe('US$1,999');
  });

  it('keeps whole amounts whole and shows cents only when they exist', () => {
    expect(formatMoney(usd(85000))).toBe('US$850');
    expect(formatMoney(usd(199850))).toBe('US$1,998.50');
  });
});

describe('multiplyMoney', () => {
  /**
   * The previous implementation rebuilt every result as PHP regardless of input.
   * Dormant while one currency existed; a silent mislabel the moment the
   * currency comes from a payload.
   */
  it('preserves the input currency', () => {
    expect(multiplyMoney(money(1000, 'USD'), 3)).toEqual({
      amountMinor: 3000,
      currency: 'USD',
    });
  });

  it('rounds to whole minor units', () => {
    expect(multiplyMoney(usd(333), 3.0001).amountMinor).toBe(999);
  });
});

describe('sumMoney', () => {
  it('sums same-currency amounts', () => {
    expect(sumMoney([usd(100), usd(250)])).toEqual({
      amountMinor: 350,
      currency: 'USD',
    });
  });

  it('returns a zero in the requested currency for an empty list', () => {
    expect(sumMoney([])).toEqual({ amountMinor: 0, currency: 'USD' });
  });

  /**
   * There is no correct total for a mixed-currency cart, and returning one would
   * invent an exchange rate. This is a programming error, not user input, so it
   * throws rather than degrading.
   */
  it('throws rather than picking a currency for a mixed list', () => {
    const mixed = [
      { amountMinor: 100, currency: 'USD' as const },
      { amountMinor: 100, currency: 'AUD' as unknown as 'USD' },
    ];

    expect(() => sumMoney(mixed)).toThrow(/more than one currency/i);
  });
});

describe('percentOff', () => {
  it('reports the discount as a negative percentage', () => {
    expect(percentOff(200000, 150000)).toBe('-25%');
  });
});

describe('isSupportedCurrency', () => {
  it.each([
    ['USD', true],
    ['AUD', false],
    ['PHP', false],
    ['usd', false],
  ])('%j -> %s', (code, expected) => {
    expect(isSupportedCurrency(code)).toBe(expected);
  });
});
