import { z } from 'zod';
import {
  ExternalProductIdSchema,
  MarketCodeSchema,
  SupplierSchema,
} from './common';

/** Spec section 18: `POST /api/v1/admin/catalog/candidates/cj` request body. */
export const CreateCjCandidateRequestSchema = z.object({
  supplier: SupplierSchema,
  externalProductId: ExternalProductIdSchema,
  intendedSellerId: z.string().trim().min(1),
  intendedMarketCodes: z.array(MarketCodeSchema).min(1),
});

export type CreateCjCandidateRequest = z.infer<
  typeof CreateCjCandidateRequestSchema
>;

/**
 * `POST /candidates/cj` response (spec section 8.1: the Shortlist step
 * only). No `decision`/score field — full preflight is not implemented
 * yet, so this route never claims one ran.
 */
export const CandidateShortlistResponseSchema = z.object({
  candidateId: z.string().min(1),
  shortlistState: z.enum(['SHORTLISTED', 'PREFLIGHT_PENDING']),
  reused: z.boolean(),
  requestId: z.string(),
});

export type CandidateShortlistResponse = z.infer<
  typeof CandidateShortlistResponseSchema
>;

/**
 * Spec section 5.3, phase-1 non-persisted shape. Nothing produces one live
 * yet — this schema exists so the shape is real and tested for forward
 * compatibility once persistence lands.
 */
export const SupplierCandidateSchema = z.object({
  supplier: SupplierSchema,
  externalProductId: ExternalProductIdSchema,
  intendedSellerId: z.string().trim().min(1),
  intendedMarketCodes: z.array(MarketCodeSchema).min(1),
});

export const CandidateDecisionSchema = z.enum([
  'PASS',
  'PASS_WITH_ATTENTION',
  'REVIEW',
  'HOLD',
  'BLOCKED',
]);

export const CandidatePreflightSchema = z.object({
  policyVersion: z.string().min(1),
  decision: CandidateDecisionSchema,
  reasonCodes: z.array(z.string()),
  checkedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type SupplierCandidate = z.infer<typeof SupplierCandidateSchema>;
export type CandidatePreflight = z.infer<typeof CandidatePreflightSchema>;
