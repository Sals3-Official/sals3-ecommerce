import type { ComplianceRuleset } from './types';

/**
 * Versioned pilot policy (spec section 8.6: "store weights, thresholds,
 * formulas, and effective dates in policyVersion... these are pilot controls,
 * not claims that an 80-point product is objectively good"). These values are
 * hypotheses pending calibration against real delivery/refund/support
 * outcomes, not facts baked into the product.
 */
export const CATALOG_POLICY_VERSION = 'catalog-policy-v1';

export const SCORE_WEIGHTS = {
  completeness: 20,
  inventoryAndFulfillment: 25,
  commercialViability: 25,
  reviewEvidence: 15,
  media: 10,
  platformDemand: 5,
} as const;

export const SCORE_THRESHOLDS = {
  pass: 80,
  passWithAttention: 65,
} as const;

/** Spec section 8.10: pilot default WIP limit, versioned configuration. */
export const ACTIVE_JOB_WIP_LIMIT = 10;

export function isWithinActiveJobLimit(
  activeJobCount: number,
  limit: number = ACTIVE_JOB_WIP_LIMIT,
): boolean {
  return activeJobCount < limit;
}

/**
 * No ADR-002 pilot category/market rule pack has been approved yet. The
 * empty ruleset is the honest default: every lookup misses, so
 * `evaluateComplianceGate` falls back to its own safe defaults
 * (`NOT_IN_PILOT` / `UNKNOWN -> no publication`) rather than fabricating a
 * rule. Replace this with a real, owner-approved ruleset when ADR-002
 * reaches `pilot_validated` for a branch.
 */
export const EMPTY_COMPLIANCE_RULESET: ComplianceRuleset = {
  policyVersion: 'compliance-ruleset-none',
  rules: [],
};

export const CATALOG_POLICY = {
  policyVersion: CATALOG_POLICY_VERSION,
  scoreWeights: SCORE_WEIGHTS,
  scoreThresholds: SCORE_THRESHOLDS,
  activeJobWipLimit: ACTIVE_JOB_WIP_LIMIT,
} as const;
