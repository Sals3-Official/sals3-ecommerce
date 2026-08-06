import { describe, expect, it } from 'vitest';
import decideCandidate from './decision';
import { CATALOG_POLICY_VERSION } from './policy';
import type {
  ComplianceGateResult,
  HardGateResult,
  ScoreResult,
} from './types';

const POLICY_VERSION = CATALOG_POLICY_VERSION;

const PASSING_HARD_GATE: HardGateResult = {
  passed: true,
  blockers: [],
  holds: [],
  reopensExisting: false,
  isNearDuplicate: false,
};

const ELIGIBLE_COMPLIANCE: ComplianceGateResult = {
  result: 'ELIGIBLE',
  policyVersion: 'fixture-v1',
  reasonCodes: ['COMPLIANCE_ELIGIBLE'],
};

function score(qualityScore: number): ScoreResult {
  return {
    qualityScore,
    componentScores: {
      completeness: 0,
      inventoryAndFulfillment: 0,
      commercialViability: 0,
      reviewEvidence: 0,
      media: 0,
      platformDemand: 0,
    },
    policyVersion: POLICY_VERSION,
  };
}

describe('decideCandidate', () => {
  it('BLOCKED always wins, even with a high score and eligible compliance', () => {
    const hardGate: HardGateResult = {
      ...PASSING_HARD_GATE,
      passed: false,
      blockers: ['NO_USABLE_VARIANT'],
    };
    const result = decideCandidate(
      hardGate,
      ELIGIBLE_COMPLIANCE,
      score(100),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('BLOCKED');
    expect(result.reasonCodes).toContain('NO_USABLE_VARIANT');
  });

  it('BLOCKED on a global compliance block, even with a passing score', () => {
    const compliance: ComplianceGateResult = {
      result: 'GLOBALLY_BLOCKED',
      policyVersion: 'fixture-v1',
      reasonCodes: ['GLOBALLY_BLOCKED_PRODUCT'],
    };
    const result = decideCandidate(
      PASSING_HARD_GATE,
      compliance,
      score(95),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('BLOCKED');
  });

  it('HOLD when hard gates pass but a temporary hold signal is present', () => {
    const hardGate: HardGateResult = {
      ...PASSING_HARD_GATE,
      holds: ['OUT_OF_STOCK'],
    };
    const result = decideCandidate(
      hardGate,
      ELIGIBLE_COMPLIANCE,
      score(90),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('HOLD');
  });

  it('HOLD when compliance is NOT_IN_PILOT (operating decision, not a legal claim)', () => {
    const compliance: ComplianceGateResult = {
      result: 'NOT_IN_PILOT',
      policyVersion: 'fixture-v1',
      reasonCodes: ['CATEGORY_NOT_IN_APPROVED_PILOT'],
    };
    const result = decideCandidate(
      PASSING_HARD_GATE,
      compliance,
      score(90),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('HOLD');
  });

  it.each([
    'PERMIT_REQUIRED',
    'COMPLIANCE_REVIEW_REQUIRED',
    'IP_REVIEW_REQUIRED',
  ] as const)('REVIEW when compliance result is %s', (complianceResult) => {
    const compliance: ComplianceGateResult = {
      result: complianceResult,
      policyVersion: 'fixture-v1',
      reasonCodes: ['x'],
    };
    const result = decideCandidate(
      PASSING_HARD_GATE,
      compliance,
      score(90),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('REVIEW');
  });

  it('REVIEW on a near-duplicate signal without blocking or auto-merging', () => {
    const hardGate: HardGateResult = {
      ...PASSING_HARD_GATE,
      isNearDuplicate: true,
    };
    const result = decideCandidate(
      hardGate,
      ELIGIBLE_COMPLIANCE,
      score(90),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('REVIEW');
  });

  it('PASS when eligible and the score meets the pass threshold', () => {
    const result = decideCandidate(
      PASSING_HARD_GATE,
      ELIGIBLE_COMPLIANCE,
      score(85),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('PASS');
  });

  it('PASS_WITH_ATTENTION when eligible and the score is in the attention band', () => {
    const result = decideCandidate(
      PASSING_HARD_GATE,
      ELIGIBLE_COMPLIANCE,
      score(70),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('PASS_WITH_ATTENTION');
  });

  it('REVIEW when eligible but the score is below the attention threshold', () => {
    const result = decideCandidate(
      PASSING_HARD_GATE,
      ELIGIBLE_COMPLIANCE,
      score(40),
      POLICY_VERSION,
    );
    expect(result.decision).toBe('REVIEW');
  });

  it('accepts no override input — a client cannot forge a result past a blocker', () => {
    // Type-level guarantee: decideCandidate's signature has no `override`,
    // `forceDecision`, or similar parameter for a caller to pass.
    expect(decideCandidate.length).toBe(4);
  });
});
