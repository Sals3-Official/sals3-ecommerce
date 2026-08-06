/**
 * Stable reason codes for candidate decisions (spec section 20.2: "preserve
 * stable reason codes, evidence, rule version, score version, and next
 * action"). Each entry is a `const` so callers can compare by reference-safe
 * string literal without a typo silently producing a new, undocumented code.
 */

export const HARD_GATE_BLOCKER_REASON_CODES = [
  'INVALID_EXTERNAL_PRODUCT_ID',
  'SOURCE_NOT_ON_SALE',
  'NO_USABLE_VARIANT',
  'DUPLICATE_HANDLING_FAILED',
  'SOURCE_RESPONSE_INVALID',
  'KNOWN_BLOCKED_SUPPLIER_OR_PRODUCT',
  'CONFIRMED_UNSAFE_CONDITION',
] as const;

export const HARD_GATE_HOLD_REASON_CODES = [
  'OUT_OF_STOCK',
  'NO_SUPPORTED_FREIGHT',
  'MARGIN_POLICY_FAILED',
  'STALE_SUPPLIER_FACTS',
  'TEMPORARY_SUPPLIER_ERROR',
] as const;

export const COMPLIANCE_REASON_CODES = [
  'GLOBALLY_BLOCKED_PRODUCT',
  'MARKET_BLOCKED_FOR_DESTINATION',
  'PERMIT_EVIDENCE_REQUIRED',
  'COMPLIANCE_REVIEW_REQUIRED',
  'POSSIBLE_BRAND_OR_IP_SIGNAL',
  'CATEGORY_NOT_IN_APPROVED_PILOT',
  'COMPLIANCE_ELIGIBLE',
] as const;

export const DECISION_REASON_CODES = [
  'NEAR_DUPLICATE_REQUIRES_REVIEW',
  'LOW_QUALITY_SCORE_REQUIRES_REVIEW',
  'QUALITY_SCORE_MEETS_PASS_THRESHOLD',
  'QUALITY_SCORE_MEETS_ATTENTION_THRESHOLD',
] as const;

export type HardGateBlockerReasonCode =
  (typeof HARD_GATE_BLOCKER_REASON_CODES)[number];
export type HardGateHoldReasonCode =
  (typeof HARD_GATE_HOLD_REASON_CODES)[number];
export type ComplianceReasonCode = (typeof COMPLIANCE_REASON_CODES)[number];
export type DecisionReasonCode = (typeof DECISION_REASON_CODES)[number];
