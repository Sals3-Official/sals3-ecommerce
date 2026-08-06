import { EMPTY_COMPLIANCE_RULESET } from './policy';
import type {
  ComplianceGateResult,
  ComplianceResult,
  ComplianceRuleset,
  ComplianceRuleType,
  ComplianceSignals,
} from './types';

function resultForRuleType(
  ruleType: ComplianceRuleType,
  policyVersion: string,
): ComplianceGateResult {
  switch (ruleType) {
    case 'PROHIBITED':
      return {
        result: 'MARKET_BLOCKED',
        policyVersion,
        reasonCodes: ['MARKET_BLOCKED_FOR_DESTINATION'],
      };
    case 'PERMIT_REQUIRED':
      return {
        result: 'PERMIT_REQUIRED',
        policyVersion,
        reasonCodes: ['PERMIT_EVIDENCE_REQUIRED'],
      };
    case 'REVIEW_REQUIRED':
    case 'LABEL_REQUIRED':
    case 'AGE_RESTRICTED':
      return {
        result: 'COMPLIANCE_REVIEW_REQUIRED',
        policyVersion,
        reasonCodes: ['COMPLIANCE_REVIEW_REQUIRED'],
      };
    case 'NOT_IN_PILOT':
      return {
        result: 'NOT_IN_PILOT',
        policyVersion,
        reasonCodes: ['CATEGORY_NOT_IN_APPROVED_PILOT'],
      };
    case 'ALLOWED':
      return {
        result: 'ELIGIBLE',
        policyVersion,
        reasonCodes: ['COMPLIANCE_ELIGIBLE'],
      };
    case 'UNKNOWN':
    default:
      // Spec section 14.2: "UNKNOWN defaults to no publication."
      return {
        result: 'COMPLIANCE_REVIEW_REQUIRED',
        policyVersion,
        reasonCodes: ['COMPLIANCE_REVIEW_REQUIRED'],
      };
  }
}

/**
 * Country/category/counterfeit compliance gate (spec section 14). No
 * ADR-002 pilot category/market pack is approved yet, so `ruleset` defaults
 * to `EMPTY_COMPLIANCE_RULESET` — every lookup misses, which safely resolves
 * to `NOT_IN_PILOT` (spec section 14.1: "This is an operating decision, not
 * a claim that the item is illegal"). Brand/counterfeit checks run first and
 * can globally block or route to review regardless of the ruleset, per spec
 * section 14.4.
 */
export function evaluateComplianceGate(
  signals: ComplianceSignals,
  ruleset: ComplianceRuleset = EMPTY_COMPLIANCE_RULESET,
): ComplianceGateResult {
  if (signals.isConfirmedCounterfeit) {
    return {
      result: 'GLOBALLY_BLOCKED',
      policyVersion: ruleset.policyVersion,
      reasonCodes: ['GLOBALLY_BLOCKED_PRODUCT'],
    };
  }

  if (signals.hasBrandSignal && !signals.hasVerifiedBrandAuthorization) {
    return {
      result: 'IP_REVIEW_REQUIRED',
      policyVersion: ruleset.policyVersion,
      reasonCodes: ['POSSIBLE_BRAND_OR_IP_SIGNAL'],
    };
  }

  const rule = ruleset.rules.find(
    (candidate) =>
      candidate.countryCode === signals.marketCode &&
      candidate.categoryCode === signals.categoryCode,
  );

  if (rule === undefined) {
    return {
      result: 'NOT_IN_PILOT',
      policyVersion: ruleset.policyVersion,
      reasonCodes: ['CATEGORY_NOT_IN_APPROVED_PILOT'],
    };
  }

  return resultForRuleType(rule.ruleType, ruleset.policyVersion);
}

export type { ComplianceResult };
