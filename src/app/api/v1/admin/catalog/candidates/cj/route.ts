import { NextResponse } from 'next/server';
import {
  createOrReuseCandidate,
  withIdempotency,
} from '@/modules/catalog/candidates/candidate-repository';
import { CreateCjCandidateRequestSchema } from '@/modules/catalog/candidates/contracts/candidate';
import {
  ActorIdSchema,
  IdempotencyKeySchema,
} from '@/modules/catalog/candidates/contracts/common';
import isCatalogAdminRequestAuthorized from '@/lib/catalog-admin/auth';
import { checkRateLimit } from '@/lib/catalog-admin/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_CONFIG = { capacity: 20, refillIntervalMs: 60_000 };

function jsonError(
  status: number,
  error: string,
  message: string,
  extraHeaders?: HeadersInit,
): NextResponse {
  return NextResponse.json(
    { error, message, requestId: crypto.randomUUID() },
    { status, headers: { 'Cache-Control': 'no-store', ...extraHeaders } },
  );
}

/**
 * Spec section 18/8.1: `POST /api/v1/admin/catalog/candidates/cj`.
 *
 * Persists only the "Shortlist" step — creates or reuses a
 * `SupplierCandidate` row, idempotently. Full preflight (hard gates + score
 * run against real CJ enrichment data) is not implemented yet — the CJ
 * detail/variant/inventory/media/review fetch it needs is separate,
 * larger work. This route never returns a `decision`/score; claiming one
 * ran without real signals would be worse than not running it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isCatalogAdminRequestAuthorized(request)) {
    return jsonError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Missing or invalid service credentials.',
    );
  }

  const rateLimit = checkRateLimit('candidates:cj', RATE_LIMIT_CONFIG);
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      'SOURCE_RATE_LIMITED',
      'Too many requests. Retry later.',
      {
        'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
      },
    );
  }

  const actorId = request.headers.get('x-sals3-actor-id') ?? '';
  if (!ActorIdSchema.safeParse(actorId).success) {
    return jsonError(
      400,
      'VALIDATION_FAILED',
      'Missing or invalid X-Sals3-Actor-Id header.',
    );
  }

  const idempotencyKey = request.headers.get('idempotency-key') ?? '';
  if (!IdempotencyKeySchema.safeParse(idempotencyKey).success) {
    return jsonError(
      400,
      'VALIDATION_FAILED',
      'Missing or invalid Idempotency-Key header.',
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(
      400,
      'VALIDATION_FAILED',
      'Request body must be valid JSON.',
    );
  }

  const parsed = CreateCjCandidateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      'VALIDATION_FAILED',
      'Request body failed schema validation.',
    );
  }

  try {
    const idempotency = await withIdempotency(
      idempotencyKey,
      parsed.data,
      actorId,
      'candidates.cj.shortlist',
      () =>
        createOrReuseCandidate({
          supplier: parsed.data.supplier,
          externalProductId: parsed.data.externalProductId,
          intendedSellerId: parsed.data.intendedSellerId,
          intendedMarketCodes: parsed.data.intendedMarketCodes,
          actorId,
        }),
    );

    if (idempotency.outcome === 'conflict') {
      return jsonError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This Idempotency-Key was already used with a different request body.',
      );
    }

    return NextResponse.json(
      {
        candidateId: idempotency.result.candidateId,
        shortlistState: idempotency.result.shortlistState,
        reused: idempotency.result.reused,
        requestId: crypto.randomUUID(),
      },
      {
        status: idempotency.result.reused ? 200 : 201,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    // No stack trace, database error detail, or internal path in the
    // response — logged server-side only.
    // eslint-disable-next-line no-console
    console.error('[catalog-admin] candidates/cj failed', error);
    return jsonError(
      500,
      'INTERNAL_ERROR',
      'The candidate could not be processed. Try again.',
    );
  }
}
