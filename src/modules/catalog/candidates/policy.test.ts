import { describe, expect, it } from 'vitest';
import {
  ACTIVE_JOB_WIP_LIMIT,
  CATALOG_POLICY,
  CATALOG_POLICY_VERSION,
  EMPTY_COMPLIANCE_RULESET,
  SCORE_THRESHOLDS,
  SCORE_WEIGHTS,
  isWithinActiveJobLimit,
} from './policy';

describe('CATALOG_POLICY', () => {
  it('carries a stable, non-empty policy version', () => {
    expect(CATALOG_POLICY_VERSION).toBe('catalog-policy-v1');
    expect(CATALOG_POLICY.policyVersion).toBe(CATALOG_POLICY_VERSION);
  });

  it('score weights sum to 100', () => {
    const total = Object.values(SCORE_WEIGHTS).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    expect(total).toBe(100);
  });

  it('pass threshold is stricter than pass-with-attention threshold', () => {
    expect(SCORE_THRESHOLDS.pass).toBeGreaterThan(
      SCORE_THRESHOLDS.passWithAttention,
    );
  });
});

describe('isWithinActiveJobLimit', () => {
  it('allows counts below the limit', () => {
    expect(isWithinActiveJobLimit(0)).toBe(true);
    expect(isWithinActiveJobLimit(ACTIVE_JOB_WIP_LIMIT - 1)).toBe(true);
  });

  it('rejects counts at or above the limit', () => {
    expect(isWithinActiveJobLimit(ACTIVE_JOB_WIP_LIMIT)).toBe(false);
    expect(isWithinActiveJobLimit(ACTIVE_JOB_WIP_LIMIT + 1)).toBe(false);
  });

  it('accepts an explicit override limit', () => {
    expect(isWithinActiveJobLimit(5, 3)).toBe(false);
    expect(isWithinActiveJobLimit(2, 3)).toBe(true);
  });
});

describe('EMPTY_COMPLIANCE_RULESET', () => {
  it('has no rules, so every lookup misses by design', () => {
    expect(EMPTY_COMPLIANCE_RULESET.rules).toHaveLength(0);
  });
});
