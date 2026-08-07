import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import type { RateLimitRule } from './rate-limit';
import {
  getEmailKey,
  getRequestIpKey,
  getRetryAfterSeconds,
  isRateLimited,
  peekRateLimitKeysForTests,
  resetRateLimitsForTests,
} from './rate-limit';

const RULE: RateLimitRule = { limit: 3, windowMs: 60_000 };
const START = 1_700_000_000_000;

function attempt(key: string, nowMs = START, rule = RULE) {
  return isRateLimited('test', [{ key, rule }], nowMs);
}

function ipRequest(forwardedFor?: string) {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
  });
}

afterEach(() => {
  resetRateLimitsForTests();
});

describe('isRateLimited', () => {
  it('allows requests up to the limit and rejects the one after it', () => {
    const verdicts = Array.from({ length: RULE.limit + 1 }, () =>
      attempt('ip:203.0.113.7'),
    );

    expect(verdicts.slice(0, RULE.limit)).toEqual([false, false, false]);
    expect(verdicts.at(-1)).toBe(true);
  });

  it('keeps separate keys in separate buckets', () => {
    Array.from({ length: RULE.limit + 1 }, () => attempt('ip:198.51.100.1'));

    expect(attempt('ip:198.51.100.2')).toBe(false);
  });

  it('keeps the same key in separate buckets per scope', () => {
    Array.from({ length: RULE.limit + 1 }, () =>
      isRateLimited('login', [{ key: 'ip:203.0.113.7', rule: RULE }], START),
    );

    expect(
      isRateLimited('signup', [{ key: 'ip:203.0.113.7', rule: RULE }], START),
    ).toBe(false);
  });

  it('blocks an email bucket even when every attempt arrives from a new address', () => {
    const emailKey = getEmailKey('victim@example.com');
    const ipRule: RateLimitRule = { limit: 50, windowMs: 60_000 };

    const verdicts = Array.from({ length: RULE.limit + 1 }, (_unused, index) =>
      isRateLimited(
        'login',
        [
          { key: `ip:198.51.100.${index}`, rule: ipRule },
          { key: emailKey, rule: RULE },
        ],
        START,
      ),
    );

    expect(verdicts.at(-1)).toBe(true);
  });

  it('consumes every dimension even after one has already tripped', () => {
    const ipKey = 'ip:203.0.113.9';
    const emailKey = getEmailKey('victim@example.com');
    const generousEmailRule: RateLimitRule = { limit: 100, windowMs: 60_000 };

    Array.from({ length: RULE.limit + 2 }, () =>
      isRateLimited(
        'login',
        [
          { key: ipKey, rule: RULE },
          { key: emailKey, rule: generousEmailRule },
        ],
        START,
      ),
    );

    // The email bucket must have counted all five attempts, not stopped at the
    // point the IP bucket started short-circuiting.
    expect(
      getRetryAfterSeconds('login', [{ key: emailKey, rule: RULE }], START),
    ).toBe(60);
    expect(isRateLimited('login', [{ key: emailKey, rule: RULE }], START)).toBe(
      true,
    );
  });

  it('resets a bucket once its window has elapsed', () => {
    Array.from({ length: RULE.limit + 1 }, () => attempt('ip:203.0.113.7'));

    expect(attempt('ip:203.0.113.7', START + RULE.windowMs + 1)).toBe(false);
  });
});

describe('bucket eviction', () => {
  it('drops expired buckets so the map does not grow without bound', () => {
    Array.from({ length: 50 }, (_unused, index) =>
      attempt(`ip:198.51.100.${index}`),
    );

    expect(peekRateLimitKeysForTests()).toHaveLength(50);

    attempt('ip:203.0.113.1', START + RULE.windowMs + 1);

    expect(peekRateLimitKeysForTests()).toEqual(['test:ip:203.0.113.1']);
  });

  it('keeps a bucket that is still inside its window', () => {
    attempt('ip:198.51.100.1');
    attempt('ip:203.0.113.1', START + RULE.windowMs - 1);

    expect(peekRateLimitKeysForTests()).toContain('test:ip:198.51.100.1');
  });
});

describe('getRetryAfterSeconds', () => {
  it('reports the whole seconds left in the window', () => {
    attempt('ip:203.0.113.7');

    expect(
      getRetryAfterSeconds(
        'test',
        [{ key: 'ip:203.0.113.7', rule: RULE }],
        START + 15_000,
      ),
    ).toBe(45);
  });

  it('never reports less than one second', () => {
    attempt('ip:203.0.113.7');

    expect(
      getRetryAfterSeconds(
        'test',
        [{ key: 'ip:203.0.113.7', rule: RULE }],
        START + RULE.windowMs,
      ),
    ).toBe(1);
  });
});

describe('getRequestIpKey', () => {
  it('uses the first hop of x-forwarded-for, not the whole chain', () => {
    expect(getRequestIpKey(ipRequest('203.0.113.7, 70.41.3.18'))).toBe(
      'ip:203.0.113.7',
    );
  });

  it('falls back to a single shared bucket when the header is absent', () => {
    expect(getRequestIpKey(ipRequest())).toBe('ip:unknown');
  });
});

describe('getEmailKey', () => {
  it('normalises case and surrounding whitespace to one bucket', () => {
    const canonical = getEmailKey('shopper@example.com');

    expect(getEmailKey('  Shopper@Example.com ')).toBe(canonical);
    expect(getEmailKey('SHOPPER@EXAMPLE.COM')).toBe(canonical);
  });

  it('separates different addresses', () => {
    expect(getEmailKey('a@example.com')).not.toBe(getEmailKey('b@example.com'));
  });

  it('never stores the raw address, so a heap dump cannot leak the account list', () => {
    attempt(getEmailKey('shopper@example.com'));

    const keys = peekRateLimitKeysForTests();

    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain('@');
    expect(keys[0]).not.toContain('shopper');
  });
});

describe('resetRateLimitsForTests', () => {
  it('clears every bucket', () => {
    attempt('ip:203.0.113.7');
    resetRateLimitsForTests();

    expect(peekRateLimitKeysForTests()).toEqual([]);
  });
});
