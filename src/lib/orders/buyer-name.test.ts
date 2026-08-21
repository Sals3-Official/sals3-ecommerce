import { describe, expect, it } from 'vitest';
import maskBuyerName from './buyer-name';

/**
 * This is the form's *preview* of the published name, not the stored value —
 * the portal derives that from the same source with its own `maskDisplayName`.
 * These cases mirror the portal's tests deliberately: the two are allowed to
 * live apart, but they are not allowed to disagree.
 */
describe('maskBuyerName', () => {
  it.each([
    ['Hezekiah Aranador', 'Hezekiah A.'],
    ['  Marites   Dela Cruz  ', 'Marites C.'],
    ['jonathan reyes', 'jonathan R.'],
  ])('reduces %s to %s', (input, expected) => {
    expect(maskBuyerName(input)).toBe(expected);
  });

  /** No invented initial: "Cher C." would publish a letter nobody gave us. */
  it('returns a single-token name whole', () => {
    expect(maskBuyerName('Cher')).toBe('Cher');
  });

  it.each(['', '   '])('answers null for %j so the form says so', (input) => {
    expect(maskBuyerName(input)).toBeNull();
  });

  it('upper-cases the initial however it was typed', () => {
    expect(maskBuyerName('ana bautista')).toBe('ana B.');
  });

  /** No case distinction in these scripts, so the character must survive. */
  it('keeps a non-Latin initial as written', () => {
    expect(maskBuyerName('Мария Иванова')).toBe('Мария И.');
  });

  it('drops a surname token with no letters in it', () => {
    expect(maskBuyerName('Ana 🙂')).toBe('Ana');
  });

  it('truncates by code point, never mid-character', () => {
    const masked = maskBuyerName('👩‍🔬'.repeat(60));

    expect(Array.from(masked ?? '').length).toBeLessThanOrEqual(60);
  });
});
