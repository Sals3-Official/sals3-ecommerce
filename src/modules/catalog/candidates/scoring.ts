import { CATALOG_POLICY_VERSION, SCORE_WEIGHTS } from './policy';
import {
  scoreCommercialViability,
  scoreCompleteness,
  scoreInventoryAndFulfillment,
  scoreMedia,
  scorePlatformDemand,
  scoreReviewEvidence,
} from './scoring-components';
import type { ScoreResult, ScoreSignals } from './types';

/**
 * Applies spec section 8.6's weights to each 0-100 component score. Weights
 * live in `policy.ts` so they stay one versioned, auditable object.
 */
export default function scoreCandidate(signals: ScoreSignals): ScoreResult {
  const componentScores = {
    completeness: scoreCompleteness(signals.completeness),
    inventoryAndFulfillment: scoreInventoryAndFulfillment(
      signals.inventoryAndFulfillment,
    ),
    commercialViability: scoreCommercialViability(signals.commercialViability),
    reviewEvidence: scoreReviewEvidence(signals.reviewEvidence),
    media: scoreMedia(signals.media),
    platformDemand: scorePlatformDemand(signals.platformDemand),
  };

  const qualityScore = Object.entries(componentScores).reduce(
    (total, [key, value]) => {
      const weight = SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS];
      return total + (value * weight) / 100;
    },
    0,
  );

  return {
    qualityScore: Math.round(qualityScore),
    componentScores,
    policyVersion: CATALOG_POLICY_VERSION,
  };
}
