import { SCORE_THRESHOLDS } from './policy';
import type {
  CandidateDecisionResult,
  ComplianceGateResult,
  HardGateResult,
  ScoreResult,
} from './types';

function build(
  decision: CandidateDecisionResult['decision'],
  reasonCodes: string[],
  hardGate: HardGateResult,
  compliance: ComplianceGateResult,
  score: ScoreResult | null,
  policyVersion: string,
): CandidateDecisionResult {
  return { decision, reasonCodes, policyVersion, hardGate, compliance, score };
}

/**
 * Combines hard-gate, compliance, and score results into the final decision
 * (spec section 8.4). No parameter here lets a caller inject an override —
 * that is a deliberate structural guarantee: nothing that reaches this
 * function can forge a result past a blocker (spec section 20.8).
 */
export default function decideCandidate(
  hardGate: HardGateResult,
  compliance: ComplianceGateResult,
  score: ScoreResult | null,
  policyVersion: string,
): CandidateDecisionResult {
  if (!hardGate.passed) {
    return build(
      'BLOCKED',
      hardGate.blockers,
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (
    compliance.result === 'GLOBALLY_BLOCKED' ||
    compliance.result === 'MARKET_BLOCKED'
  ) {
    return build(
      'BLOCKED',
      compliance.reasonCodes,
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (hardGate.holds.length > 0) {
    return build(
      'HOLD',
      hardGate.holds,
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (
    compliance.result === 'PERMIT_REQUIRED' ||
    compliance.result === 'COMPLIANCE_REVIEW_REQUIRED' ||
    compliance.result === 'IP_REVIEW_REQUIRED'
  ) {
    return build(
      'REVIEW',
      compliance.reasonCodes,
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (compliance.result === 'NOT_IN_PILOT') {
    return build(
      'HOLD',
      compliance.reasonCodes,
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (hardGate.isNearDuplicate) {
    return build(
      'REVIEW',
      ['NEAR_DUPLICATE_REQUIRES_REVIEW'],
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  // compliance.result === 'ELIGIBLE' from here on.
  if (score === null) {
    return build(
      'REVIEW',
      ['LOW_QUALITY_SCORE_REQUIRES_REVIEW'],
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (score.qualityScore >= SCORE_THRESHOLDS.pass) {
    return build(
      'PASS',
      ['QUALITY_SCORE_MEETS_PASS_THRESHOLD'],
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  if (score.qualityScore >= SCORE_THRESHOLDS.passWithAttention) {
    return build(
      'PASS_WITH_ATTENTION',
      ['QUALITY_SCORE_MEETS_ATTENTION_THRESHOLD'],
      hardGate,
      compliance,
      score,
      policyVersion,
    );
  }

  return build(
    'REVIEW',
    ['LOW_QUALITY_SCORE_REQUIRES_REVIEW'],
    hardGate,
    compliance,
    score,
    policyVersion,
  );
}
