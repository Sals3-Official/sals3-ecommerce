import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import type { ShortlistState } from '@prisma/client';

/**
 * Persists the "Shortlist" step only (spec section 8.1): creates or reuses
 * a `SupplierCandidate` row. Full preflight (hard gates + score run
 * against real CJ enrichment data, spec section 8.3) is not implemented
 * yet — the CJ product-detail/variant/inventory/media/review fetch it
 * needs is a separate, larger unit of work.
 */

export type CandidateShortlistResult = {
  candidateId: string;
  shortlistState: ShortlistState;
  reused: boolean;
};

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function hashRequestPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function createOrReuseCandidate(input: {
  supplier: 'CJ_DROPSHIPPING';
  externalProductId: string;
  intendedSellerId: string;
  intendedMarketCodes: string[];
  actorId: string;
}): Promise<CandidateShortlistResult> {
  const existing = await prisma.supplierCandidate.findUnique({
    where: {
      supplier_externalProductId: {
        supplier: input.supplier,
        externalProductId: input.externalProductId,
      },
    },
  });

  if (existing !== null) {
    return {
      candidateId: existing.id,
      shortlistState: existing.shortlistState,
      reused: true,
    };
  }

  const created = await prisma.supplierCandidate.create({
    data: {
      supplier: input.supplier,
      externalProductId: input.externalProductId,
      intendedSellerId: input.intendedSellerId,
      intendedMarketCodes: input.intendedMarketCodes,
      createdBy: input.actorId,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: 'CANDIDATE_SHORTLISTED',
      entityType: 'SupplierCandidate',
      entityId: created.id,
      payload: {
        supplier: input.supplier,
        externalProductId: input.externalProductId,
      },
    },
  });

  return {
    candidateId: created.id,
    shortlistState: created.shortlistState,
    reused: false,
  };
}

export type IdempotencyOutcome =
  | { outcome: 'conflict' }
  | { outcome: 'ok'; result: CandidateShortlistResult; replayed: boolean };

/**
 * Spec section 4.2: "The same key and same payload return the original
 * result. The same key with a different payload returns
 * 409 IDEMPOTENCY_CONFLICT."
 */
export async function withIdempotency(
  key: string,
  payload: unknown,
  actorId: string,
  operation: string,
  run: () => Promise<CandidateShortlistResult>,
): Promise<IdempotencyOutcome> {
  const requestHash = hashRequestPayload(payload);
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key },
  });

  if (existing !== null) {
    if (existing.requestHash !== requestHash) {
      return { outcome: 'conflict' };
    }
    return {
      outcome: 'ok',
      result: existing.resultReference as unknown as CandidateShortlistResult,
      replayed: true,
    };
  }

  const result = await run();

  await prisma.idempotencyRecord.create({
    data: {
      key,
      actorId,
      operation,
      requestHash,
      resultReference: result,
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    },
  });

  return { outcome: 'ok', result, replayed: false };
}
