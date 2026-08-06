import {
  checkDuplicateHandling,
  checkFactsFresh,
  checkFreightAvailable,
  checkMarginPolicy,
  checkNoConfirmedUnsafeCondition,
  checkNotKnownBlocked,
  checkOutOfStock,
  checkSourceOnSale,
  checkSourceResponseValid,
  checkTemporarySupplierError,
  checkUsableVariant,
  checkValidExternalProductId,
} from './hard-gate-checks';
import type { HardGateResult, HardGateSignals } from './types';

const BLOCKER_CHECKS = [
  checkValidExternalProductId,
  checkSourceOnSale,
  checkUsableVariant,
  checkDuplicateHandling,
  checkSourceResponseValid,
  checkNotKnownBlocked,
  checkNoConfirmedUnsafeCondition,
];

const HOLD_CHECKS = [
  checkOutOfStock,
  checkFreightAvailable,
  checkMarginPolicy,
  checkFactsFresh,
  checkTemporarySupplierError,
];

/**
 * Data-driven orchestrator (spec section 8.5): "Hard gates run before
 * scoring. Quality points never override them." Adding a new gate means
 * adding one function to the arrays above — this function itself never
 * grows.
 */
export default function evaluateHardGates(
  signals: HardGateSignals,
): HardGateResult {
  const blockers = BLOCKER_CHECKS.map((check) => check(signals)).filter(
    (code): code is NonNullable<typeof code> => code !== null,
  );
  const holds = HOLD_CHECKS.map((check) => check(signals)).filter(
    (code): code is NonNullable<typeof code> => code !== null,
  );

  return {
    passed: blockers.length === 0,
    blockers,
    holds,
    reopensExisting: signals.duplicateStatus === 'EXACT_REOPEN',
    isNearDuplicate: signals.duplicateStatus === 'NEAR_DUPLICATE',
  };
}
