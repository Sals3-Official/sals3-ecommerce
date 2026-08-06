/**
 * In-process token-bucket rate limiter for candidate-screening endpoints
 * (spec section 8.10: "Shortlisting and preflight endpoints are
 * rate-limited and audited"). Single-instance-only by design — state lives
 * in a module-level `Map`, not a shared store. That is an accepted phase-1
 * limitation (no Redis/DB exists), not a durability claim.
 */

export type RateLimitConfig = {
  capacity: number;
  refillIntervalMs: number;
};

export type RateLimitOutcome = {
  allowed: boolean;
  retryAfterMs: number;
};

type Bucket = {
  tokens: number;
  lastRefillAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now(),
): RateLimitOutcome {
  const bucket = buckets.get(key) ?? {
    tokens: config.capacity,
    lastRefillAt: now,
  };

  const elapsedMs = now - bucket.lastRefillAt;
  const refillTokens = Math.floor(elapsedMs / config.refillIntervalMs);
  if (refillTokens > 0) {
    bucket.tokens = Math.min(config.capacity, bucket.tokens + refillTokens);
    bucket.lastRefillAt = now;
  }

  if (bucket.tokens <= 0) {
    buckets.set(key, bucket);
    const msSinceLastRefillTick = elapsedMs % config.refillIntervalMs;
    return {
      allowed: false,
      retryAfterMs: config.refillIntervalMs - msSinceLastRefillTick,
    };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
}

/** Test-only helper — mirrors `resetCjToken()`'s idiom in sals3-portal. */
export function resetCatalogAdminRateLimiter(): void {
  buckets.clear();
}
