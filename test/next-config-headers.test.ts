import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';

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

  /**
   * Next's own matcher rather than a hand-written stand-in. The defect this
   * block guards against lived entirely in how `path-to-regexp` reads a
   * `source`, so a stand-in built from the same reading as the config would
   * have agreed with the config and seen nothing.
   */
  async function destinationFor(pathname: string) {
    const redirects = await getRedirects();
    const matched = redirects.find(
      (redirect) => getPathMatch(redirect.source)(pathname) !== false,
    );

    return matched?.destination;
  }

  /** Every file `public/` serves, as the path a browser asks for. */
  function publicAssetPaths(directory = 'public', prefix = ''): string[] {
    return readdirSync(join(process.cwd(), directory), {
      withFileTypes: true,
    }).flatMap((entry) =>
      entry.isDirectory()
        ? publicAssetPaths(
            `${directory}/${entry.name}`,
            `${prefix}/${entry.name}`,
          )
        : [`${prefix}/${entry.name}`],
    );
  }

  it.each([
    ['/p/:path([^/.]+)*', '/au/p/:path*'],
    ['/c/:path([^/.]+)*', '/au/c/:path*'],
    ['/search/:path([^/.]+)*', '/au/search/:path*'],
    ['/categories/:path([^/.]+)*', '/au/categories/:path*'],
    ['/cart/:path([^/.]+)*', '/au/cart/:path*'],
  ])('sends %s to %s', async (source, destination) => {
    const redirects = await getRedirects();

    expect(redirects).toContainEqual(
      expect.objectContaining({ source, destination }),
    );
  });

  it.each([
    ['/cart', '/au/cart/:path*'],
    ['/categories', '/au/categories/:path*'],
    ['/search', '/au/search/:path*'],
    ['/p/blue-cotton-shirt', '/au/p/:path*'],
    ['/c/health-beauty', '/au/c/:path*'],
  ])(
    'still carries the moved link %s into a market',
    async (pathname, destination) => {
      await expect(destinationFor(pathname)).resolves.toBe(destination);
    },
  );

  /*
    The regression this exists for. A redirect `source` is a claim over a
    namespace and `public/` shares that namespace with the router:
    `/categories/:path*` matched the asset directory `public/categories/` as
    readily as the route, and answered all 21 department photographs with a 307
    into `/au`, where no file exists. Redirects run before the static-file
    handler, so nothing downstream could rescue them.
  */
  it('redirects no file that public/ serves', async () => {
    const assets = publicAssetPaths();

    // A walk that returned nothing would pass the assertion below for free.
    expect(assets).toContain('/categories/electronics.webp');
    expect(assets.length).toBeGreaterThan(20);

    const redirected = (
      await Promise.all(
        assets.map(async (asset) => [asset, await destinationFor(asset)]),
      )
    ).filter(([, destination]) => destination !== undefined);

    expect(redirected).toEqual([]);
  });

  /*
    An unknown market is a 404, not a redirect to Australia — otherwise every
    typo "works" and a crawler gets unbounded duplicate URLs.
  */
  it.each(['/xx', '/xx/p/blue-cotton-shirt', '/xx/cart'])(
    'leaves %s alone so an unknown market can 404',
    async (pathname) => {
      await expect(destinationFor(pathname)).resolves.toBeUndefined();
    },
  );

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
