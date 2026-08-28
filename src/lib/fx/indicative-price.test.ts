import { describe, expect, it } from 'vitest';
import { toIndicativePrice } from './indicative-price';
import type { IndicativeRate } from './rates';

const AUD: IndicativeRate = {
  currency: 'AUD',
  rate: 1.3922,
  asOf: '2026-08-27',
};

/**
 * The live Market Rules funding buffer, so the arithmetic asserted below is the
 * arithmetic production performs rather than a round number chosen for the test.
 */
const BUFFER = 1.5;

describe('toIndicativePrice', () => {
  it('converts, applies the buffer, and states the symbol explicitly', () => {
    // US$22.99 at 1.3922 → 3200.67 minor, +1.5% → 3248.68 → A$32.49. The symbol
    // is `A$`, never a bare `$`: a lone dollar sign beside a US$ price invites
    // the reader to assume the two are the same currency, which is the
    // ambiguity this display exists to remove.
    const result = toIndicativePrice(2299, AUD, BUFFER);

    expect(result?.formatted).toBe('A$32.49');
  });

  it('formats pesos and Fijian dollars with their own symbols', () => {
    expect(
      toIndicativePrice(
        2299,
        { currency: 'PHP', rate: 61.65, asOf: '2026-08-27' },
        BUFFER,
      )?.formatted,
    ).toBe('₱1,438.59');

    expect(
      toIndicativePrice(
        2299,
        { currency: 'FJD', rate: 2.2148, asOf: '2026-08-27' },
        BUFFER,
      )?.formatted,
    ).toBe('FJ$51.68');
  });

  it('lands above the bare mid-market conversion, which is the point', () => {
    // The buffer exists because a published mid rate is not one anybody
    // transacts at. If these ever came out equal, the buffer would be getting
    // dropped somewhere between here and the Portal and nothing else would say.
    const buffered = toIndicativePrice(2299, AUD, BUFFER)?.formatted;
    const mid = toIndicativePrice(2299, AUD, 0)?.formatted;

    expect(mid).toBe('A$32.01');
    expect(buffered).not.toBe(mid);
  });

  it('carries a negative buffer through rather than ignoring it', () => {
    // ADR-015 §4 calls the stored field a signed buffer.
    expect(toIndicativePrice(2299, AUD, -2)?.formatted).toBe('A$31.37');
  });

  it('never returns a number without the sentence that qualifies it', () => {
    // The label is returned from the same call as the figure so a caller
    // cannot render one without the other — ADR-003 §3's "clearly labelled",
    // which is doing legal work here and not only UX work.
    const result = toIndicativePrice(2299, AUD, BUFFER);

    expect(result?.note).toContain('charged in US dollars');
    expect(result?.note).toContain("your bank's rate will differ");
    expect(result?.note).toContain('27 Aug 2026');
  });

  it('does not claim the figure is the published rate once a buffer is on it', () => {
    // The old sentence said "Converted at the rate published on …", which stops
    // being true the moment an allowance is added to it. A disclosure that
    // describes a calculation the code no longer performs is worse than none.
    const result = toIndicativePrice(2299, AUD, BUFFER);

    expect(result?.note).not.toContain('Converted at the rate published');
    expect(result?.note).toContain('allowance for conversion costs');
  });

  it('returns null with no rate, so the page shows no local price at all', () => {
    // Not a dash, not a zero, not "unavailable". The USD price is complete on
    // its own and the local figure is an extra that is either right or absent.
    expect(toIndicativePrice(2299, null, BUFFER)).toBeNull();
  });

  it('returns null with no buffer rather than falling back to mid-market', () => {
    // A mid conversion is knowingly below what the card will charge, and
    // nothing on the page distinguishes "approximate because converted" from
    // "approximate because the setting was unreachable".
    expect(toIndicativePrice(2299, AUD, null)).toBeNull();
  });

  it('refuses a negative amount', () => {
    expect(toIndicativePrice(-100, AUD, BUFFER)).toBeNull();
  });

  it('converts zero without inventing a price', () => {
    expect(toIndicativePrice(0, AUD, BUFFER)?.formatted).toBe('A$0.00');
  });
});
