import { z } from 'zod';

/** Spec section 5.1: `Supplier` is a closed enum; CJ is the only member today. */
export const SupplierSchema = z.literal('CJ_DROPSHIPPING');

/**
 * Format-only check. Spec section 18: "The API rejects unknown or disabled
 * markets... does not assume a country from IP address or supplier origin."
 * Which markets are actually enabled is an ADR-003 business decision, not
 * something this format schema can decide — the route layer is responsible
 * for rejecting a structurally valid but non-enabled market code.
 */
export const MarketCodeSchema = z
  .string()
  .regex(
    /^[A-Z]{2}$/,
    'Market code must be a two-letter uppercase ISO country code',
  );

export const ExternalProductIdSchema = z.string().trim().min(1).max(64);

/** Spec section 18: mutation requests require an `Idempotency-Key` header. */
export const IdempotencyKeySchema = z.string().trim().min(16).max(200);

export const ActorIdSchema = z.string().trim().min(1).max(128);
