import { afterEach, describe, expect, it } from 'vitest';
import { checkRateLimit, resetCatalogAdminRateLimiter } from './rate-limit';

const CONFIG = { capacity: 2, refillIntervalMs: 1000 };

describe('checkRateLimit', () => {
  afterEach(() => {
    resetCatalogAdminRateLimiter();
  });

  it('allows requests up to capacity', () => {
    expect(checkRateLimit('key-a', CONFIG, 0).allowed).toBe(true);
    expect(checkRateLimit('key-a', CONFIG, 0).allowed).toBe(true);
  });

  it('rejects once capacity is exhausted, with a retryAfterMs', () => {
    checkRateLimit('key-b', CONFIG, 0);
    checkRateLimit('key-b', CONFIG, 0);
    const outcome = checkRateLimit('key-b', CONFIG, 0);
    expect(outcome.allowed).toBe(false);
    expect(outcome.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills capacity after the interval elapses', () => {
    checkRateLimit('key-c', CONFIG, 0);
    checkRateLimit('key-c', CONFIG, 0);
    expect(checkRateLimit('key-c', CONFIG, 0).allowed).toBe(false);
    expect(checkRateLimit('key-c', CONFIG, 1000).allowed).toBe(true);
  });

  it('tracks independent keys separately', () => {
    checkRateLimit('key-d', CONFIG, 0);
    checkRateLimit('key-d', CONFIG, 0);
    expect(checkRateLimit('key-d', CONFIG, 0).allowed).toBe(false);
    expect(checkRateLimit('key-e', CONFIG, 0).allowed).toBe(true);
  });
});
