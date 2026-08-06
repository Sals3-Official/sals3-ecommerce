import type {
  HardGateBlockerCode,
  HardGateHoldCode,
  HardGateSignals,
} from './types';

/**
 * One small, pure function per spec section 8.5 objective hard gate. Category
 * pilot status, market prohibition, and counterfeit/brand checks live in
 * `compliance-gate.ts` instead — those need an injected, versioned ruleset
 * (spec section 14), not a fixed boolean signal.
 */

export function checkValidExternalProductId(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.hasValidExternalProductId
    ? null
    : 'INVALID_EXTERNAL_PRODUCT_ID';
}

export function checkSourceOnSale(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.sourceStatus === 'ON_SALE' ? null : 'SOURCE_NOT_ON_SALE';
}

export function checkUsableVariant(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.usableVariantCount >= 1 ? null : 'NO_USABLE_VARIANT';
}

export function checkDuplicateHandling(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.duplicateStatus === 'DUPLICATE_HANDLING_FAILED'
    ? 'DUPLICATE_HANDLING_FAILED'
    : null;
}

export function checkSourceResponseValid(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.sourceResponseValid ? null : 'SOURCE_RESPONSE_INVALID';
}

export function checkNotKnownBlocked(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.isKnownBlockedSupplierOrProduct
    ? 'KNOWN_BLOCKED_SUPPLIER_OR_PRODUCT'
    : null;
}

export function checkNoConfirmedUnsafeCondition(
  signals: HardGateSignals,
): HardGateBlockerCode | null {
  return signals.hasConfirmedUnsafeCondition
    ? 'CONFIRMED_UNSAFE_CONDITION'
    : null;
}

/**
 * HOLD triggers (spec section 8.5, closing note): "Out of stock, unavailable
 * freight, failed margin, stale facts, or temporary supplier errors normally
 * produce HOLD, not permanent BLOCKED." Kept separate from blockers so a
 * temporary condition can never be silently escalated to BLOCKED.
 */
export function checkOutOfStock(
  signals: HardGateSignals,
): HardGateHoldCode | null {
  return signals.isOutOfStock ? 'OUT_OF_STOCK' : null;
}

export function checkFreightAvailable(
  signals: HardGateSignals,
): HardGateHoldCode | null {
  return signals.hasNoSupportedFreight ? 'NO_SUPPORTED_FREIGHT' : null;
}

export function checkMarginPolicy(
  signals: HardGateSignals,
): HardGateHoldCode | null {
  return signals.failsMarginPolicy ? 'MARGIN_POLICY_FAILED' : null;
}

export function checkFactsFresh(
  signals: HardGateSignals,
): HardGateHoldCode | null {
  return signals.hasStaleFacts ? 'STALE_SUPPLIER_FACTS' : null;
}

export function checkTemporarySupplierError(
  signals: HardGateSignals,
): HardGateHoldCode | null {
  return signals.hasTemporarySupplierError ? 'TEMPORARY_SUPPLIER_ERROR' : null;
}
