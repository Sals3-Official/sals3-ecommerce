import { describe, expect, it } from 'vitest';
import confidenceAdjustedReviewScore from './review-evidence';

describe('confidenceAdjustedReviewScore', () => {
  it('returns the neutral prior when there is no review evidence at all', () => {
    expect(
      confidenceAdjustedReviewScore({ reviewCount: 0, averageScore: 0 }),
    ).toBe(50);
  });

  it('caps a single 5-star review well below the raw average score', () => {
    const oneReview = confidenceAdjustedReviewScore({
      reviewCount: 1,
      averageScore: 5,
    });
    expect(oneReview).toBeLessThan(100);
    expect(oneReview).toBeCloseTo(51.67, 1);
  });

  it('lets a large sample at the same average approach the raw score', () => {
    const fiftyReviews = confidenceAdjustedReviewScore({
      reviewCount: 50,
      averageScore: 5,
    });
    expect(fiftyReviews).toBeCloseTo(100, 0);
  });

  it('keeps one review from receiving full review-confidence points relative to volume', () => {
    const oneReview = confidenceAdjustedReviewScore({
      reviewCount: 1,
      averageScore: 5,
    });
    const fiftyReviews = confidenceAdjustedReviewScore({
      reviewCount: 50,
      averageScore: 5,
    });
    expect(oneReview).toBeLessThan(fiftyReviews);
  });

  it('never exceeds the 0-100 range for out-of-range inputs', () => {
    expect(
      confidenceAdjustedReviewScore({ reviewCount: 100, averageScore: 5 }),
    ).toBeLessThanOrEqual(100);
    expect(
      confidenceAdjustedReviewScore({ reviewCount: 100, averageScore: 0 }),
    ).toBeGreaterThanOrEqual(0);
  });
});
