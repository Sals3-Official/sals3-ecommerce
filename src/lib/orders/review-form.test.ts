import { describe, expect, it } from 'vitest';
import {
  MAX_REVIEW_ITEMS,
  parsePostedCount,
  postedReviewsToast,
  verdictTone,
} from './review-form';

/**
 * `?posted=…` is client-supplied and reaches a page that renders a sentence
 * from it. It is allow-listed to an integer inside the submit cap, the same
 * posture `parseOrdersQuery` takes with every other parameter on that page.
 */
describe('parsePostedCount', () => {
  it('reads a count inside the submit cap', () => {
    expect(parsePostedCount('1')).toBe(1);
    expect(parsePostedCount(String(MAX_REVIEW_ITEMS))).toBe(MAX_REVIEW_ITEMS);
  });

  it('takes the first value of a repeated parameter', () => {
    expect(parsePostedCount(['2', '9'])).toBe(2);
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
    ['zero', '0'],
    ['negative', '-3'],
    ['fractional', '1.5'],
    ['over the cap', String(MAX_REVIEW_ITEMS + 1)],
    ['not a number', 'lots'],
    ['markup', '<script>alert(1)</script>'],
  ])('refuses %s and shows no toast', (_label, raw) => {
    expect(parsePostedCount(raw)).toBe(0);
  });
});

describe('postedReviewsToast', () => {
  it('does not say "1 reviews"', () => {
    expect(postedReviewsToast(1)).toBe('Review posted. Thank you.');
    expect(postedReviewsToast(3)).toBe('3 reviews posted. Thank you.');
  });
});

/** A low rating is the one answer a buyer might have chosen by mistake. */
describe('verdictTone', () => {
  it('marks one and two stars, and leaves the rest plain', () => {
    expect(verdictTone(0)).toBe('text-ink-subtle');
    expect(verdictTone(1)).toBe('text-red-600');
    expect(verdictTone(2)).toBe('text-red-600');
    expect(verdictTone(3)).toBe('text-ink');
    expect(verdictTone(5)).toBe('text-ink');
  });
});
