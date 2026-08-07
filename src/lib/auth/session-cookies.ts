import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RATE_LIMIT_SCOPES, SESSION_POST_RULES } from './auth-rate-limits';
import {
  getRequestIpKey,
  isRateLimited,
  resetRateLimitsForTests,
} from './rate-limit';

export const SESSION_COOKIE_NAME = 'sals3_session';
export const CSRF_COOKIE_NAME = 'sals3_csrf';

export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
export const CSRF_MAX_AGE_SECONDS = 10 * 60;
export const RECENT_SIGN_IN_SECONDS = 5 * 60;

export function noStoreJson(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return false;
  }

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function hasMatchingCsrf(request: NextRequest, csrfToken: string) {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const bodyBuffer = Buffer.from(csrfToken);

  return (
    cookieBuffer.length === bodyBuffer.length &&
    timingSafeEqual(cookieBuffer, bodyBuffer)
  );
}

export function isRecentAuthTime(authTimeSeconds: number, nowMs = Date.now()) {
  const ageSeconds = Math.floor(nowMs / 1000) - authTimeSeconds;

  return ageSeconds >= 0 && ageSeconds < RECENT_SIGN_IN_SECONDS;
}

export function isSessionPostRateLimited(request: NextRequest) {
  return isRateLimited(RATE_LIMIT_SCOPES.sessionPost, [
    { key: getRequestIpKey(request), rule: SESSION_POST_RULES.perIp },
  ]);
}

/**
 * Clears every scope, not only the session-post one. Kept under the original
 * name so existing route tests continue to work unchanged.
 */
export function resetSessionPostRateLimitForTests() {
  resetRateLimitsForTests();
}
