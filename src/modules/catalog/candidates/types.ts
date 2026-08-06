/**
 * Phase-1 candidate-screening domain types.
 *
 * These shapes mirror spec section 5.3 (SupplierCandidate, CandidatePreflight)
 * but are NOT persisted anywhere yet — no database exists. Every function in
 * this module is pure: given signals and a policy, it returns a result. There
 * is no hidden state, no I/O, and no storage.
 */

export type CandidateDecision =
  'PASS' | 'PASS_WITH_ATTENTION' | 'REVIEW' | 'HOLD' | 'BLOCKED';

export type Supplier = 'CJ_DROPSHIPPING';

export type DuplicateStatus =
  'NONE' | 'EXACT_REOPEN' | 'NEAR_DUPLICATE' | 'DUPLICATE_HANDLING_FAILED';

export type SourceStatus = 'ON_SALE' | 'OFF_SALE' | 'REMOVED' | 'UNKNOWN';

/** Inputs to the objective, non-compliance hard gates (spec section 8.5). */
export type HardGateSignals = {
  hasValidExternalProductId: boolean;
  sourceStatus: SourceStatus;
  usableVariantCount: number;
  duplicateStatus: DuplicateStatus;
  sourceResponseValid: boolean;
  isKnownBlockedSupplierOrProduct: boolean;
  hasConfirmedUnsafeCondition: boolean;
  /** HOLD triggers — never permanent blockers (spec section 8.5, closing note). */
  isOutOfStock: boolean;
  hasNoSupportedFreight: boolean;
  failsMarginPolicy: boolean;
  hasStaleFacts: boolean;
  hasTemporarySupplierError: boolean;
};

export type HardGateBlockerCode =
  | 'INVALID_EXTERNAL_PRODUCT_ID'
  | 'SOURCE_NOT_ON_SALE'
  | 'NO_USABLE_VARIANT'
  | 'DUPLICATE_HANDLING_FAILED'
  | 'SOURCE_RESPONSE_INVALID'
  | 'KNOWN_BLOCKED_SUPPLIER_OR_PRODUCT'
  | 'CONFIRMED_UNSAFE_CONDITION';

export type HardGateHoldCode =
  | 'OUT_OF_STOCK'
  | 'NO_SUPPORTED_FREIGHT'
  | 'MARGIN_POLICY_FAILED'
  | 'STALE_SUPPLIER_FACTS'
  | 'TEMPORARY_SUPPLIER_ERROR';

export type HardGateResult = {
  passed: boolean;
  blockers: HardGateBlockerCode[];
  holds: HardGateHoldCode[];
  /** Exact CJ pid duplicate reopens the existing record; never a blocker. */
  reopensExisting: boolean;
  /** Different pid, high similarity; routes to REVIEW, never auto-merged. */
  isNearDuplicate: boolean;
};

/** Inputs to the country/category/counterfeit compliance gate (spec section 14). */
export type ComplianceSignals = {
  categoryCode: string;
  marketCode: string;
  hasBrandSignal: boolean;
  hasVerifiedBrandAuthorization: boolean;
  isConfirmedCounterfeit: boolean;
};

export type ComplianceRuleType =
  | 'ALLOWED'
  | 'REVIEW_REQUIRED'
  | 'PERMIT_REQUIRED'
  | 'LABEL_REQUIRED'
  | 'AGE_RESTRICTED'
  | 'PROHIBITED'
  | 'NOT_IN_PILOT'
  | 'UNKNOWN';

/**
 * Injected, versioned rule set (spec section 14.2). No ADR-002 pilot category
 * or market pack has been approved yet, so the default export in
 * `compliance-gate.ts` is an EMPTY ruleset — every lookup misses and the gate
 * safely defaults to `NOT_IN_PILOT` / `UNKNOWN`. This type exists so a real
 * ruleset can be injected later without changing the gate's code.
 */
export type ComplianceRuleset = {
  policyVersion: string;
  rules: ReadonlyArray<{
    countryCode: string;
    categoryCode: string;
    ruleType: ComplianceRuleType;
  }>;
};

export type ComplianceResult =
  | 'GLOBALLY_BLOCKED'
  | 'MARKET_BLOCKED'
  | 'PERMIT_REQUIRED'
  | 'COMPLIANCE_REVIEW_REQUIRED'
  | 'IP_REVIEW_REQUIRED'
  | 'NOT_IN_PILOT'
  | 'ELIGIBLE';

export type ComplianceGateResult = {
  result: ComplianceResult;
  policyVersion: string;
  reasonCodes: string[];
};

/** Inputs to the pilot quality score (spec section 8.6). */
export type ScoreSignals = {
  completeness: {
    hasName: boolean;
    hasDescriptionSource: boolean;
    hasCategoryData: boolean;
    hasRequiredAttributes: boolean;
    hasValidVariants: boolean;
    hasDimensions: boolean;
  };
  inventoryAndFulfillment: {
    hasStockSignal: boolean;
    hasWarehouseSignal: boolean;
    hasFreightOption: boolean;
    hasDeliveryEvidence: boolean;
    factsAreFresh: boolean;
  };
  commercialViability: {
    landedCost: number;
    minimumViablePrice: number;
    sellingPrice: number;
  };
  reviewEvidence: {
    reviewCount: number;
    averageScore: number;
  };
  media: {
    usableImageCount: number;
    hasDuplicateImages: boolean;
    hasWatermarkOrLogoSignal: boolean;
    hasCategoryMismatchSignal: boolean;
  };
  platformDemand: {
    listedNum: number | null;
    ageInDays: number | null;
  };
};

export type ScoreComponentBreakdown = {
  completeness: number;
  inventoryAndFulfillment: number;
  commercialViability: number;
  reviewEvidence: number;
  media: number;
  platformDemand: number;
};

export type ScoreResult = {
  qualityScore: number;
  componentScores: ScoreComponentBreakdown;
  policyVersion: string;
};

export type CandidateDecisionResult = {
  decision: CandidateDecision;
  reasonCodes: string[];
  policyVersion: string;
  hardGate: HardGateResult;
  compliance: ComplianceGateResult;
  score: ScoreResult | null;
};

/**
 * Phase-1, non-persisted shape (spec section 5.3). Nothing in this repo
 * creates or stores one today — see `CATALOG_PERSISTENCE_NOT_CONFIGURED` in
 * `contracts/errors.ts`.
 */
export type SupplierCandidate = {
  supplier: Supplier;
  externalProductId: string;
  intendedSellerId: string;
  intendedMarketCodes: string[];
};

export type CandidatePreflight = {
  policyVersion: string;
  decision: CandidateDecision;
  reasonCodes: string[];
  checkedAt: string;
  expiresAt: string;
};
