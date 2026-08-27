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

  it.each([
    '/login',
    '/signup',
    '/checkout/:path*',
    '/orders',
    '/orders/:path*',
  ])('marks %s as never cacheable', async (source) => {
    const rules = await getHeaderRules();

    expect(findRule(rules, source)?.headers).toEqual([
      { key: 'Cache-Control', value: 'no-store' },
    ]);
  });

  it('covers every sensitive browser screen and no API route', async () => {
    // API routes send `no-store` from `noStoreJson`, so listing them here too
    // would create a second place to keep in step.
    expect(NO_STORE_ROUTES).toEqual([
      '/login',
      '/signup',
      '/checkout/:path*',
      // The buyer orders surface renders a name, an address, a phone number
      // and a purchase history behind a session cookie.
      '/orders',
      '/orders/:path*',
    ]);
    expect(NO_STORE_ROUTES.some((route) => route.startsWith('/api'))).toBe(
      false,
    );
  });
});

/**
 * The old shopping URLs were live on the deployed storefront before the markets
 * split, so they are in browser history and in the owner's own notes. They
 * redirect rather than 404 — and the redirects are asserted here rather than
 * end-to-end because `permanent` is the load-bearing part and a browser makes
 * a 307 and a 308 look identical.
 */
describe('next.config market redirects', () => {
  async function getRedirects() {
    return (await nextConfig.redirects?.()) ?? [];
  }

  it.each([
    ['/p/:path*', '/au/p/:path*'],
    ['/c/:path*', '/au/c/:path*'],
    ['/search/:path*', '/au/search/:path*'],
    ['/categories/:path*', '/au/categories/:path*'],
    ['/cart/:path*', '/au/cart/:path*'],
  ])('sends %s to %s', async (source, destination) => {
    const redirects = await getRedirects();

    expect(redirects).toContainEqual(
      expect.objectContaining({ source, destination }),
    );
  });

  /*
    Temporary, never permanent, and that is the whole point. A 308 would assert
    that this content now lives at `/au` — but the same product also lives at
    `/ph`, and every browser and proxy would cache the claim, pinning a
    market-less link to Australia forever and taking the choice away from the
    next visitor.
  */
  it('never makes a market redirect permanent', async () => {
    const redirects = await getRedirects();

    expect(redirects.length).toBeGreaterThan(0);
    redirects.forEach((redirect) => {
      expect(redirect.permanent).toBe(false);
    });
  });

  it('redirects no account route into a market', async () => {
    const redirects = await getRedirects();
    const accountPaths = ['/login', '/signup', '/checkout', '/orders', '/api'];

    redirects.forEach((redirect) => {
      expect(
        accountPaths.some((path) => redirect.source.startsWith(path)),
      ).toBe(false);
    });
  });
});
