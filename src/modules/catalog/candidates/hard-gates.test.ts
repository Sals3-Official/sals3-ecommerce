import { describe, expect, it } from 'vitest';
import evaluateHardGates from './hard-gates';
import type { HardGateSignals } from './types';

const CLEAN_SIGNALS: HardGateSignals = {
  hasValidExternalProductId: true,
  sourceStatus: 'ON_SALE',
  usableVariantCount: 2,
  duplicateStatus: 'NONE',
  sourceResponseValid: true,
  isKnownBlockedSupplierOrProduct: false,
  hasConfirmedUnsafeCondition: false,
  isOutOfStock: false,
  hasNoSupportedFreight: false,
  failsMarginPolicy: false,
  hasStaleFacts: false,
  hasTemporarySupplierError: false,
};

describe('evaluateHardGates', () => {
  it('passes with no blockers or holds on clean signals', () => {
    const result = evaluateHardGates(CLEAN_SIGNALS);
    expect(result.passed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.holds).toHaveLength(0);
  });

  it.each([
    [
      'invalid pid',
      { hasValidExternalProductId: false },
      'INVALID_EXTERNAL_PRODUCT_ID',
    ],
    [
      'off-sale source',
      { sourceStatus: 'OFF_SALE' as const },
      'SOURCE_NOT_ON_SALE',
    ],
    ['no usable variant', { usableVariantCount: 0 }, 'NO_USABLE_VARIANT'],
    [
      'duplicate handling failure',
      { duplicateStatus: 'DUPLICATE_HANDLING_FAILED' as const },
      'DUPLICATE_HANDLING_FAILED',
    ],
    [
      'invalid source response',
      { sourceResponseValid: false },
      'SOURCE_RESPONSE_INVALID',
    ],
    [
      'known blocked supplier/product',
      { isKnownBlockedSupplierOrProduct: true },
      'KNOWN_BLOCKED_SUPPLIER_OR_PRODUCT',
    ],
    [
      'confirmed unsafe condition',
      { hasConfirmedUnsafeCondition: true },
      'CONFIRMED_UNSAFE_CONDITION',
    ],
  ] as const)('blocks on %s', (_label, override, expectedCode) => {
    const result = evaluateHardGates({ ...CLEAN_SIGNALS, ...override });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain(expectedCode);
  });

  it.each([
    ['out of stock', { isOutOfStock: true }, 'OUT_OF_STOCK'],
    [
      'no supported freight',
      { hasNoSupportedFreight: true },
      'NO_SUPPORTED_FREIGHT',
    ],
    [
      'margin policy failure',
      { failsMarginPolicy: true },
      'MARGIN_POLICY_FAILED',
    ],
    ['stale facts', { hasStaleFacts: true }, 'STALE_SUPPLIER_FACTS'],
    [
      'temporary supplier error',
      { hasTemporarySupplierError: true },
      'TEMPORARY_SUPPLIER_ERROR',
    ],
  ] as const)(
    'a %s signal is a HOLD, never a BLOCKED, even alone',
    (_label, override, expectedCode) => {
      const result = evaluateHardGates({ ...CLEAN_SIGNALS, ...override });
      expect(result.passed).toBe(true);
      expect(result.blockers).toHaveLength(0);
      expect(result.holds).toContain(expectedCode);
    },
  );

  it('reopens the existing record on an exact duplicate rather than blocking', () => {
    const result = evaluateHardGates({
      ...CLEAN_SIGNALS,
      duplicateStatus: 'EXACT_REOPEN',
    });
    expect(result.passed).toBe(true);
    expect(result.reopensExisting).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it('flags a near-duplicate for review without blocking or auto-merging', () => {
    const result = evaluateHardGates({
      ...CLEAN_SIGNALS,
      duplicateStatus: 'NEAR_DUPLICATE',
    });
    expect(result.passed).toBe(true);
    expect(result.isNearDuplicate).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it('accumulates multiple simultaneous blockers', () => {
    const result = evaluateHardGates({
      ...CLEAN_SIGNALS,
      hasValidExternalProductId: false,
      isKnownBlockedSupplierOrProduct: true,
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'INVALID_EXTERNAL_PRODUCT_ID',
        'KNOWN_BLOCKED_SUPPLIER_OR_PRODUCT',
      ]),
    );
    expect(result.blockers).toHaveLength(2);
  });
});
