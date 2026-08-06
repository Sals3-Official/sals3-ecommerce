import { describe, expect, it } from 'vitest';
import { evaluateComplianceGate } from './compliance-gate';
import { EMPTY_COMPLIANCE_RULESET } from './policy';
import type { ComplianceRuleset, ComplianceSignals } from './types';

const CLEAN_SIGNALS: ComplianceSignals = {
  categoryCode: 'HOME_DECOR',
  marketCode: 'PH',
  hasBrandSignal: false,
  hasVerifiedBrandAuthorization: false,
  isConfirmedCounterfeit: false,
};

describe('evaluateComplianceGate', () => {
  it('defaults to NOT_IN_PILOT when no ruleset is injected (no ADR-002 pack approved)', () => {
    const result = evaluateComplianceGate(CLEAN_SIGNALS);
    expect(result.result).toBe('NOT_IN_PILOT');
    expect(result.policyVersion).toBe(EMPTY_COMPLIANCE_RULESET.policyVersion);
  });

  it('defaults an unmapped category/market pair to NOT_IN_PILOT with a fixture ruleset', () => {
    const ruleset: ComplianceRuleset = {
      policyVersion: 'fixture-v1',
      rules: [
        { countryCode: 'US', categoryCode: 'ELECTRONICS', ruleType: 'ALLOWED' },
      ],
    };
    const result = evaluateComplianceGate(CLEAN_SIGNALS, ruleset);
    expect(result.result).toBe('NOT_IN_PILOT');
  });

  it('globally blocks a confirmed counterfeit regardless of ruleset', () => {
    const result = evaluateComplianceGate({
      ...CLEAN_SIGNALS,
      isConfirmedCounterfeit: true,
    });
    expect(result.result).toBe('GLOBALLY_BLOCKED');
  });

  it('routes a possible brand signal without authorization to IP review', () => {
    const result = evaluateComplianceGate({
      ...CLEAN_SIGNALS,
      hasBrandSignal: true,
      hasVerifiedBrandAuthorization: false,
    });
    expect(result.result).toBe('IP_REVIEW_REQUIRED');
  });

  it('does not treat a verified brand authorization as a blocker', () => {
    const ruleset: ComplianceRuleset = {
      policyVersion: 'fixture-v1',
      rules: [
        { countryCode: 'PH', categoryCode: 'HOME_DECOR', ruleType: 'ALLOWED' },
      ],
    };
    const result = evaluateComplianceGate(
      {
        ...CLEAN_SIGNALS,
        hasBrandSignal: true,
        hasVerifiedBrandAuthorization: true,
      },
      ruleset,
    );
    expect(result.result).toBe('ELIGIBLE');
  });

  it.each([
    ['ALLOWED', 'ELIGIBLE'],
    ['PROHIBITED', 'MARKET_BLOCKED'],
    ['PERMIT_REQUIRED', 'PERMIT_REQUIRED'],
    ['REVIEW_REQUIRED', 'COMPLIANCE_REVIEW_REQUIRED'],
    ['LABEL_REQUIRED', 'COMPLIANCE_REVIEW_REQUIRED'],
    ['AGE_RESTRICTED', 'COMPLIANCE_REVIEW_REQUIRED'],
    ['NOT_IN_PILOT', 'NOT_IN_PILOT'],
    ['UNKNOWN', 'COMPLIANCE_REVIEW_REQUIRED'],
  ] as const)('maps injected rule type %s to %s', (ruleType, expected) => {
    const ruleset: ComplianceRuleset = {
      policyVersion: 'fixture-v1',
      rules: [{ countryCode: 'PH', categoryCode: 'HOME_DECOR', ruleType }],
    };
    const result = evaluateComplianceGate(CLEAN_SIGNALS, ruleset);
    expect(result.result).toBe(expected);
  });

  it('blocks unknown market eligibility from publication (UNKNOWN never yields ELIGIBLE)', () => {
    const ruleset: ComplianceRuleset = {
      policyVersion: 'fixture-v1',
      rules: [
        { countryCode: 'PH', categoryCode: 'HOME_DECOR', ruleType: 'UNKNOWN' },
      ],
    };
    const result = evaluateComplianceGate(CLEAN_SIGNALS, ruleset);
    expect(result.result).not.toBe('ELIGIBLE');
  });
});
