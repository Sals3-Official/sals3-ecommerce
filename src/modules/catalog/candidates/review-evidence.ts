import clamp from './number-utils';

/**
 * Confidence-adjusted CJ review evidence (spec section 8.7): "Use a
 * confidence-adjusted score so one five-star review does not outrank
 * substantial evidence... cap contribution from small or stale samples."
 * This is CJ supplier-platform evidence, never a Sals3 buyer rating (spec
 * section 20.2).
 */

/** Sample size at which review evidence is treated as fully confident. */
const FULL_CONFIDENCE_SAMPLE_SIZE = 30;

/** Neutral prior a thin sample blends toward (0-100 scale, midpoint). */
const NEUTRAL_PRIOR = 50;

const MAX_REVIEW_SCALE = 5;

export default function confidenceAdjustedReviewScore(signals: {
  reviewCount: number;
  averageScore: number;
}): number {
  if (signals.reviewCount <= 0) {
    return NEUTRAL_PRIOR;
  }

  const normalizedAverage = clamp(
    (signals.averageScore / MAX_REVIEW_SCALE) * 100,
    0,
    100,
  );
  const confidence = clamp(
    signals.reviewCount / FULL_CONFIDENCE_SAMPLE_SIZE,
    0,
    1,
  );

  return NEUTRAL_PRIOR + confidence * (normalizedAverage - NEUTRAL_PRIOR);
}
