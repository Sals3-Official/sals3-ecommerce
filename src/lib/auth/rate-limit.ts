import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Best-effort, in-process attempt throttling for abuse-sensitive auth
 * endpoints (nextjs-component-security-code-rules rule 29).
 *
 * Deliberate limitation: this Map lives in one server process. On a
 * scale-out host the effective ceiling is `instances x limit`, and every
 * cold start resets it. Firebase's own TOO_MANY_ATTEMPTS_TRY_LATER is the
 * durable backstop underneath. Describe this as throttling, not as a
 * rate-limit control.
 */

export type RateLimitRule = {
  readonly limit: number;
  readonly windowMs: number;
};

export type RateLimitDimension = {
  readonly key: string;
  readonly rule: RateLimitRule;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

/**
 * Sweeping on write rather than on an interval: a timer would hold a
 * serverless instance open and would leak between test files.
 */
const SWEEP_INTERVAL_MS = 60 * 1000;

/** Backstop so a flood of distinct keys cannot grow the Map without bound. */
const MAX_BUCKETS = 10_000;

let lastSweptAt = 0;

function dropExpired(nowMs: number) {
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= nowMs) {
      buckets.delete(key);
    }
  });
}

/**
 * Evicts the entries closest to expiry first. They have the least protective
 * value left, so a flooder cannot cheaply displace a victim's fresh bucket.
 */
function dropNearestToExpiry(excess: number) {
  Array.from(buckets.entries())
    .sort(([, left], [, right]) => left.resetAt - right.resetAt)
    .slice(0, excess)
    .forEach(([key]) => buckets.delete(key));
}

function sweep(nowMs: number) {
  if (nowMs - lastSweptAt < SWEEP_INTERVAL_MS && buckets.size <= MAX_BUCKETS) {
    return;
  }

  lastSweptAt = nowMs;
  dropExpired(nowMs);

  if (buckets.size > MAX_BUCKETS) {
    dropNearestToExpiry(buckets.size - MAX_BUCKETS);
  }
}

function consume(
  bucketKey: string,
  rule: RateLimitRule,
  nowMs: number,
): boolean {
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= nowMs) {
    buckets.set(bucketKey, { count: 1, resetAt: nowMs + rule.windowMs });
    return false;
  }

  bucket.count += 1;

  return bucket.count > rule.limit;
}

/**
 * Records one attempt against every dimension and reports whether any of them
 * is now over its limit.
 *
 * Every dimension is consumed even once one has tripped, so an attacker cannot
 * park an IP bucket over its limit and use the resulting short-circuit to hide
 * per-email attempts from the email bucket.
 */
export function isRateLimited(
  scope: string,
  dimensions: readonly RateLimitDimension[],
  nowMs = Date.now(),
) {
  sweep(nowMs);

  return dimensions.reduce(
    (limited, { key, rule }) =>
      consume(`${scope}:${key}`, rule, nowMs) || limited,
    false,
  );
}

/** Seconds a caller must wait before the given dimension frees up. */
export function getRetryAfterSeconds(
  scope: string,
  dimensions: readonly RateLimitDimension[],
  nowMs = Date.now(),
) {
  const resetAt = dimensions.reduce((latest, { key }) => {
    const bucket = buckets.get(`${scope}:${key}`);

    return bucket && bucket.resetAt > latest ? bucket.resetAt : latest;
  }, nowMs);

  return Math.max(1, Math.ceil((resetAt - nowMs) / 1000));
}

export function getRequestIpKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  return `ip:${forwardedFor?.split(',')[0]?.trim() || 'unknown'}`;
}

/**
 * Hashed, not raw: the address is personal data, this Map is long-lived and
 * could surface in a heap dump or an error serialisation. Hashing also bounds
 * the key length and normalises case and surrounding whitespace, so casing
 * variants cannot each get their own bucket.
 */
export function getEmailKey(email: string) {
  const digest = createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');

  return `email:${digest.slice(0, 32)}`;
}

export function resetRateLimitsForTests() {
  buckets.clear();
  lastSweptAt = 0;
}

export function peekRateLimitKeysForTests() {
  return Array.from(buckets.keys());
}
