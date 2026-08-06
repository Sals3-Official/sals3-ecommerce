import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'sals3_session';
export const CSRF_COOKIE_NAME = 'sals3_csrf';

export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
export const CSRF_MAX_AGE_SECONDS = 10 * 60;
export const RECENT_SIGN_IN_SECONDS = 5 * 60;

const SESSION_POST_LIMIT = 20;
const SESSION_POST_WINDOW_MS = 60 * 1000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const sessionPostAttempts = new Map<string, RateLimitBucket>();

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
  const forwardedFor = request.headers.get('x-forwarded-for');
  const key = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const bucket = sessionPostAttempts.get(key);

  if (!bucket || bucket.resetAt <= now) {
    sessionPostAttempts.set(key, {
      count: 1,
      resetAt: now + SESSION_POST_WINDOW_MS,
    });
    return false;
  }

  bucket.count += 1;
  return bucket.count > SESSION_POST_LIMIT;
}

export function resetSessionPostRateLimitForTests() {
  sessionPostAttempts.clear();
}
