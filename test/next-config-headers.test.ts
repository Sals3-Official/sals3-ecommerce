import { describe, expect, it } from 'vitest';

import nextConfig, { NO_STORE_ROUTES, SECURITY_HEADERS } from '../next.config';

/**
 * Header rules are asserted here rather than only end-to-end because
 * `next dev` replaces `Cache-Control` with its own value, so the login route's
 * `no-store` rule is not observable from a dev-server response.
 */
async function getHeaderRules() {
  const rules = await nextConfig.headers?.();

  return rules ?? [];
}

function findRule(
  rules: Awaited<ReturnType<typeof getHeaderRules>>,
  source: string,
) {
  return rules.find((rule) => rule.source === source);
}

describe('next.config header rules', () => {
  it('sets the baseline hardening headers on document routes', async () => {
    const rules = await getHeaderRules();
    const documentRule = rules.find((rule) => rule.source.includes('_next'));

    expect(documentRule?.headers).toEqual(SECURITY_HEADERS);
  });

  it('excludes build output from the document rule so dev chunks are not blocked', async () => {
    const rules = await getHeaderRules();
    const documentRule = rules.find((rule) => rule.source.includes('_next'));

    expect(documentRule?.source).toBe('/((?!_next/).*)');
  });

  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'DENY'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ])('sends %s: %s', (key, value) => {
    expect(SECURITY_HEADERS).toContainEqual({ key, value });
  });

  it.each(['/login', '/signup'])(
    'marks %s as never cacheable',
    async (source) => {
      const rules = await getHeaderRules();

      expect(findRule(rules, source)?.headers).toEqual([
        { key: 'Cache-Control', value: 'no-store' },
      ]);
    },
  );

  it('covers every credential screen and nothing else', async () => {
    // API routes send `no-store` from `noStoreJson`, so listing them here too
    // would create a second place to keep in step.
    expect(NO_STORE_ROUTES).toEqual(['/login', '/signup']);
    expect(NO_STORE_ROUTES.some((route) => route.startsWith('/api'))).toBe(
      false,
    );
  });
});
