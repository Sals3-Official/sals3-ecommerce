import clamp from './number-utils';
import confidenceAdjustedReviewScore from './review-evidence';
import type { ScoreSignals } from './types';

function shareOfTrue(flags: boolean[]): number {
  const trueCount = flags.filter(Boolean).length;
  return (trueCount / flags.length) * 100;
}

export function scoreCompleteness(
  signals: ScoreSignals['completeness'],
): number {
  return shareOfTrue([
    signals.hasName,
    signals.hasDescriptionSource,
    signals.hasCategoryData,
    signals.hasRequiredAttributes,
    signals.hasValidVariants,
    signals.hasDimensions,
  ]);
}

export function scoreInventoryAndFulfillment(
  signals: ScoreSignals['inventoryAndFulfillment'],
): number {
  return shareOfTrue([
    signals.hasStockSignal,
    signals.hasWarehouseSignal,
    signals.hasFreightOption,
    signals.hasDeliveryEvidence,
    signals.factsAreFresh,
  ]);
}

/**
 * `landedCost <= sellingPrice < minimumViablePrice` scales linearly; at or
 * above the minimum viable price the offer is fully commercially sound.
 */
export function scoreCommercialViability(
  signals: ScoreSignals['commercialViability'],
): number {
  const { landedCost, minimumViablePrice, sellingPrice } = signals;
  if (sellingPrice <= landedCost) return 0;
  if (sellingPrice >= minimumViablePrice) return 100;
  const range = minimumViablePrice - landedCost;
  if (range <= 0) return 100;
  return clamp(((sellingPrice - landedCost) / range) * 100, 0, 100);
}

export function scoreReviewEvidence(
  signals: ScoreSignals['reviewEvidence'],
): number {
  return confidenceAdjustedReviewScore(signals);
}

const MIN_USABLE_IMAGES_FOR_FULL_MEDIA_SCORE = 5;
const MIN_USABLE_IMAGES_FOR_ANY_MEDIA_SCORE = 3;

export function scoreMedia(signals: ScoreSignals['media']): number {
  if (signals.usableImageCount < MIN_USABLE_IMAGES_FOR_ANY_MEDIA_SCORE)
    return 0;
  const imageCoverage = clamp(
    (signals.usableImageCount / MIN_USABLE_IMAGES_FOR_FULL_MEDIA_SCORE) * 100,
    0,
    100,
  );
  const penalties =
    (signals.hasDuplicateImages ? 20 : 0) +
    (signals.hasWatermarkOrLogoSignal ? 20 : 0) +
    (signals.hasCategoryMismatchSignal ? 20 : 0);
  return clamp(imageCoverage - penalties, 0, 100);
}

/**
 * Weak, non-authoritative signal (spec section 8.6: `listedNum`, age, and
 * activity; never treated as sold count). Missing data is neutral, not
 * penalized.
 */
export function scorePlatformDemand(
  signals: ScoreSignals['platformDemand'],
): number {
  if (signals.listedNum === null) return 50;
  const logScale = Math.log10(signals.listedNum + 1) * 25;
  return clamp(logScale, 0, 100);
}
