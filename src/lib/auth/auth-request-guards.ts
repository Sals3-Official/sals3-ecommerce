import type { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { AUTH_ERROR } from './auth-error-codes';
import authErrorJson from './auth-error-response';
import type { RateLimitRule } from './rate-limit';
import {
  getRequestIpKey,
  getRetryAfterSeconds,
  isRateLimited,
} from './rate-limit';
import { hasMatchingCsrf, hasSameOrigin } from './session-cookies';

export type GuardResult<T> =
  { ok: true; data: T } | { ok: false; response: NextResponse };

type GuardOptions<TSchema extends z.ZodType> = {
  scope: string;
  perIp: RateLimitRule;
  schema: TSchema;
};

export function tooManyRequests(
  scope: string,
  key: string,
  rule: RateLimitRule,
) {
  return authErrorJson(AUTH_ERROR.tooManyRequests, {
    'Retry-After': String(getRetryAfterSeconds(scope, [{ key, rule }])),
  });
}

/**
 * The preamble every auth mutation shares, in a deliberate order:
 *
 * 1. Same origin — a cookie-setting POST from another site is refused before
 *    anything else is read (rule 27).
 * 2. Per-IP throttle — applied before the body is consumed, so a flood cannot
 *    make us parse it.
 * 3. JSON parse, then schema — the credential bounds are enforced here, so an
 *    over-long password never reaches a hasher.
 * 4. CSRF double-submit — last, because the constant-time comparison should
 *    only run on a token the schema has already length-bounded.
 *
 * The per-email throttle is deliberately NOT here: it needs a parsed, well
 * formed address, so it belongs to the caller, immediately after this returns.
 */
export default async function guardAuthPost<TSchema extends z.ZodType>(
  request: NextRequest,
  { scope, perIp, schema }: GuardOptions<TSchema>,
): Promise<GuardResult<z.infer<TSchema>>> {
  if (!hasSameOrigin(request)) {
    return { ok: false, response: authErrorJson(AUTH_ERROR.forbidden) };
  }

  const ipKey = getRequestIpKey(request);

  if (isRateLimited(scope, [{ key: ipKey, rule: perIp }])) {
    return { ok: false, response: tooManyRequests(scope, ipKey, perIp) };
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, response: authErrorJson(AUTH_ERROR.invalidRequest) };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return { ok: false, response: authErrorJson(AUTH_ERROR.invalidRequest) };
  }

  const { csrfToken } = parsed.data as { csrfToken: string };

  if (!hasMatchingCsrf(request, csrfToken)) {
    return {
      ok: false,
      response: authErrorJson(AUTH_ERROR.invalidCredentials),
    };
  }

  return { ok: true, data: parsed.data as z.infer<TSchema> };
}
