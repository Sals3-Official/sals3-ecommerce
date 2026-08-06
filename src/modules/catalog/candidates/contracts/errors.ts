import { z } from 'zod';

/** Spec section 18: the approved typed error taxonomy, verbatim. */
export const CATALOG_API_ERROR_CODES = [
  'AUTHENTICATION_REQUIRED',
  'PERMISSION_DENIED',
  'RESOURCE_NOT_FOUND',
  'IDEMPOTENCY_CONFLICT',
  'VERSION_CONFLICT',
  'SOURCE_UNAVAILABLE',
  'SOURCE_RATE_LIMITED',
  'SOURCE_RESPONSE_INVALID',
  'IMPORT_ALREADY_EXISTS',
  'CANDIDATE_PREFLIGHT_REQUIRED',
  'CANDIDATE_PREFLIGHT_EXPIRED',
  'CANDIDATE_REVIEW_REQUIRED',
  'CANDIDATE_HELD',
  'CANDIDATE_BLOCKED',
  'CATEGORY_NOT_IN_PILOT',
  'CATEGORY_MAPPING_REQUIRED',
  'VARIANT_MAPPING_REQUIRED',
  'MEDIA_REVIEW_REQUIRED',
  'IP_REVIEW_REQUIRED',
  'BRAND_AUTHORIZATION_REQUIRED',
  'COMPLIANCE_REVIEW_REQUIRED',
  'PERMIT_REQUIRED',
  'MARKET_PROHIBITED',
  'MARKET_UNSERVICEABLE',
  'MARGIN_POLICY_FAILED',
  'PUBLISH_VALIDATION_FAILED',
  'VALIDATION_FAILED',
] as const;

/**
 * NOT part of the approved spec's error taxonomy above. This is a
 * deliberate, clearly-flagged phase-1 placeholder returned only because no
 * database/queue exists yet (owner decision: "Hold"). Delete this const and
 * every route usage of it once persistence is chosen and implemented — a
 * real route should never need it.
 */
export const TRANSITIONAL_ERROR_CODES = [
  'CATALOG_PERSISTENCE_NOT_CONFIGURED',
] as const;

export const CatalogApiErrorCodeSchema = z.enum(CATALOG_API_ERROR_CODES);
export const TransitionalErrorCodeSchema = z.enum(TRANSITIONAL_ERROR_CODES);

export const AdminApiErrorBodySchema = z.object({
  error: z.union([CatalogApiErrorCodeSchema, TransitionalErrorCodeSchema]),
  message: z.string(),
  requestId: z.string().optional(),
});

export type CatalogApiErrorCode = (typeof CATALOG_API_ERROR_CODES)[number];
export type TransitionalErrorCode = (typeof TRANSITIONAL_ERROR_CODES)[number];
export type AdminApiErrorBody = z.infer<typeof AdminApiErrorBodySchema>;
