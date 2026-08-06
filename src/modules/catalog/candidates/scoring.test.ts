import { describe, expect, it } from 'vitest';
import { SCORE_THRESHOLDS } from './policy';
import scoreCandidate from './scoring';
import type { ScoreSignals } from './types';

const FULL_MARKS: ScoreSignals = {
  completeness: {
    hasName: true,
    hasDescriptionSource: true,
    hasCategoryData: true,
    hasRequiredAttributes: true,
    hasValidVariants: true,
    hasDimensions: true,
  },
  inventoryAndFulfillment: {
    hasStockSignal: true,
    hasWarehouseSignal: true,
    hasFreightOption: true,
    hasDeliveryEvidence: true,
    factsAreFresh: true,
  },
  commercialViability: {
    landedCost: 10,
    minimumViablePrice: 15,
    sellingPrice: 20,
  },
  reviewEvidence: { reviewCount: 100, averageScore: 5 },
  media: {
    usableImageCount: 7,
    hasDuplicateImages: false,
    hasWatermarkOrLogoSignal: false,
    hasCategoryMismatchSignal: false,
  },
  platformDemand: { listedNum: 5000, ageInDays: 400 },
};

describe('scoreCandidate', () => {
  it('scores a fully complete, viable candidate at or above the PASS threshold', () => {
    const result = scoreCandidate(FULL_MARKS);
    expect(result.qualityScore).toBeGreaterThanOrEqual(SCORE_THRESHOLDS.pass);
    expect(result.policyVersion).toBe('catalog-policy-v1');
  });

  it('scores a mid-quality candidate inside the PASS_WITH_ATTENTION band', () => {
    const midQuality: ScoreSignals = {
      ...FULL_MARKS,
      completeness: {
        hasName: true,
        hasDescriptionSource: false,
        hasCategoryData: false,
        hasRequiredAttributes: false,
        hasValidVariants: true,
        hasDimensions: false,
      },
      media: { ...FULL_MARKS.media, usableImageCount: 3 },
      reviewEvidence: { reviewCount: 1, averageScore: 3 },
    };
    const result = scoreCandidate(midQuality);
    expect(result.qualityScore).toBeGreaterThanOrEqual(
      SCORE_THRESHOLDS.passWithAttention,
    );
    expect(result.qualityScore).toBeLessThan(SCORE_THRESHOLDS.pass);
  });

  it('scores a low-quality candidate below the review threshold', () => {
    const lowQuality: ScoreSignals = {
      completeness: {
        hasName: true,
        hasDescriptionSource: false,
        hasCategoryData: false,
        hasRequiredAttributes: false,
        hasValidVariants: true,
        hasDimensions: false,
      },
      inventoryAndFulfillment: {
        hasStockSignal: true,
        hasWarehouseSignal: false,
        hasFreightOption: false,
        hasDeliveryEvidence: false,
        factsAreFresh: false,
      },
      commercialViability: {
        landedCost: 10,
        minimumViablePrice: 15,
        sellingPrice: 10,
      },
      reviewEvidence: { reviewCount: 0, averageScore: 0 },
      media: {
        usableImageCount: 0,
        hasDuplicateImages: false,
        hasWatermarkOrLogoSignal: false,
        hasCategoryMismatchSignal: false,
      },
      platformDemand: { listedNum: null, ageInDays: null },
    };
    const result = scoreCandidate(lowQuality);
    expect(result.qualityScore).toBeLessThan(
      SCORE_THRESHOLDS.passWithAttention,
    );
  });

  it('component scores each stay within 0-100', () => {
    const result = scoreCandidate(FULL_MARKS);
    Object.values(result.componentScores).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });
});
