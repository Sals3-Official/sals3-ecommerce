import { describe, expect, it } from 'vitest';
import { formatReviewDate, starsLine } from './product-detail';

describe('starsLine', () => {
  it('rounds a rating into filled and empty stars', () => {
    expect(starsLine(4.7)).toBe('★★★★★');
    expect(starsLine(3.2)).toBe('★★★☆☆');
    expect(starsLine(0)).toBe('☆☆☆☆☆');
  });

  it('clamps out-of-range ratings', () => {
    expect(starsLine(-2)).toBe('☆☆☆☆☆');
    expect(starsLine(9)).toBe('★★★★★');
  });
});

describe('formatReviewDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatReviewDate('2025-04-30T09:41:02.053Z')).toBe('Apr 30, 2025');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatReviewDate('not-a-date')).toBe('');
  });
});
