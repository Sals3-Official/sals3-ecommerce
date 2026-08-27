import { describe, expect, it } from 'vitest';
import { toIndicativePrice } from './indicative-price';
import type { IndicativeRate } from './rates';

const AUD: IndicativeRate = {
  currency: 'AUD',
  rate: 1.3922,
  asOf: '2026-08-27',
};

describe('toIndicativePrice', () => {
  it('converts and states the symbol explicitly', () => {
    // US$22.99 at 1.3922 → 3200.67 minor units → A$32.01. The symbol is `A$`,
    // never a bare `$`: a lone dollar sign beside a US$ price invites the
    // reader to assume the two are the same currency, which is the ambiguity
    // this display exists to remove.
    const result = toIndicativePrice(2299, AUD);

    expect(result?.formatted).toBe('A$32.01');
  });

  it('formats pesos and Fijian dollars with their own symbols', () => {
    expect(
      toIndicativePrice(2299, {
        currency: 'PHP',
        rate: 61.65,
        asOf: '2026-08-27',
      })?.formatted,
    ).toBe('₱1,417.33');

    expect(
      toIndicativePrice(2299, {
        currency: 'FJD',
        rate: 2.2148,
        asOf: '2026-08-27',
      })?.formatted,
    ).toBe('FJ$50.92');
  });

  it('never returns a number without the sentence that qualifies it', () => {
    // The label is returned from the same call as the figure so a caller
    // cannot render one without the other — ADR-003 §3's "clearly labelled",
    // which is doing legal work here and not only UX work.
    const result = toIndicativePrice(2299, AUD);

    expect(result?.note).toContain('charged in US dollars');
    expect(result?.note).toContain("your bank's rate will differ");
    expect(result?.note).toContain('27 Aug 2026');
  });

  it('returns null with no rate, so the page shows no local price at all', () => {
    // Not a dash, not a zero, not "unavailable". The USD price is complete on
    // its own and the local figure is an extra that is either right or absent.
    expect(toIndicativePrice(2299, null)).toBeNull();
  });

  it('refuses a negative amount', () => {
    expect(toIndicativePrice(-100, AUD)).toBeNull();
  });

  it('converts zero without inventing a price', () => {
    expect(toIndicativePrice(0, AUD)?.formatted).toBe('A$0.00');
  });
});
