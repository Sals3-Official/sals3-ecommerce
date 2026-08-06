import { NextResponse } from 'next/server';
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
 * Spec section 18: `POST /api/v1/admin/catalog/candidates/cj`.
 *
 * This route validates auth, rate limits, headers, and the request body for
 * real. It never creates a `SupplierCandidate` — no database exists yet
 * (owner decision: "Hold", see `CATALOG_PERSISTENCE_NOT_CONFIGURED` in
 * `contracts/errors.ts`). It always short-circuits with that transitional
 * error on an otherwise-valid request rather than fabricating a decision.
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

  // Structured, redacted request log (spec section 19) — a phase-1
  // stand-in for the durable AuditEvent the spec ultimately wants.
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      event: 'catalog.candidate.cj.request',
      externalProductId: parsed.data.externalProductId,
      outcome: 'CATALOG_PERSISTENCE_NOT_CONFIGURED',
    }),
  );

  return jsonError(
    503,
    'CATALOG_PERSISTENCE_NOT_CONFIGURED',
    'Candidate screening is not yet backed by persistence. No candidate was created.',
  );
}
