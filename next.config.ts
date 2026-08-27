import type { NextConfig } from 'next';

/*
 * Baseline response hardening. Added with the login screen because a credential
 * form is the clickjacking/MIME-confusion target that makes these matter, but
 * they are correct for every route so they are applied site-wide.
 *
 * Not set here: Strict-Transport-Security, which belongs to the TLS-terminating
 * host (Vercel already sends it) and would be wrong to emit from the app on a
 * plain-HTTP local run. No Content-Security-Policy yet either: Next's inlined
 * bootstrap needs a nonce-based policy, which is a separate change with its own
 * verification rather than a guess bolted onto this one.
 */
export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
];

export const CHECKOUT_CSP =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; frame-src https://*.stripe.com https://*.link.com; connect-src 'self' https://*.stripe.com https://*.link.com; worker-src 'self' blob:";

/*
 * `/_next/` is excluded rather than covered by a plain `/:path*`. With the
 * broader matcher, `next dev` (16.3.0) answered its own chunk requests with 403
 * and the HMR websocket handshake failed, which silently left every client
 * component unhydrated — verified by removing and re-adding the rule against
 * `e2e/login.spec.ts`. The excluded paths are build-output scripts, styles, and
 * optimized images; framing and MIME-sniffing protections apply to documents.
 */
const DOCUMENT_PATHS = '/((?!_next/).*)';

/*
 * Credential screens. A signed-in variant of one of these must never be served
 * from a shared or browser cache, and the back button must not restore a
 * filled credential form. `next dev` overrides this with its own
 * `no-cache, must-revalidate`; the rule is what production serves.
 *
 * API responses are not listed: `/api/auth/*` sends `no-store` from
 * `noStoreJson`, and duplicating it here would leave two places to keep in
 * step.
 */
export const NO_STORE_ROUTES = [
  '/login',
  '/signup',
  '/checkout/:path*',
  // `/orders` and `/orders/*` render a name, a street address, a phone number
  // and a purchase history behind a session cookie. A shared or browser cache
  // holding one of those would serve it to the next reader of the same device.
  '/orders',
  '/orders/:path*',
];

/*
 * The Cloudflare R2 public host seller-uploaded product photos are served
 * from, derived from the same env var `src/lib/r2-image-host.ts` reads so the
 * two cannot drift. Empty when unset — the storefront then simply drops
 * seller-uploaded image addresses at the mapper, same as any other
 * non-allow-listed host.
 */
function r2RemotePatterns() {
  const baseUrl = process.env.NEXT_PUBLIC_R2_IMAGE_BASE_URL;

  if (baseUrl === undefined || baseUrl.trim() === '') return [];

  try {
    const url = new URL(baseUrl);

    return url.protocol === 'https:'
      ? [
          {
            protocol: 'https' as const,
            hostname: url.hostname,
            pathname: '/**',
          },
        ]
      : [];
  } catch {
    return [];
  }
}

/**
 * The shopping routes that moved under `/[market]` on 2026-08-27.
 *
 * Every one of these was a live URL on `sals3-ecommerce.vercel.app` before the
 * move, so they redirect rather than 404 — the deployed site is in use and its
 * links are in browser history and in the owner's own notes.
 *
 * **Temporary, not permanent, and that is load-bearing.** A 308 would assert
 * that this content now lives at `/au` — but the same product also lives at
 * `/ph`, and which one a person belongs on depends on who is asking. A
 * permanent redirect is cached by every browser and proxy, so it would pin a
 * market-less link to Australia forever and take the choice away from the next
 * visitor. Same reasoning as the dispatcher at `/`.
 *
 * A prefix rather than a literal list of routes, so a route added under a
 * market later needs no matching entry here.
 */
const MARKET_MOVED_ROUTES = ['/p', '/c', '/search', '/categories', '/cart'];

/**
 * What each moved prefix matches under: any number of path segments, none of
 * which may contain a dot. Deliberately not a bare `:path*`.
 *
 * **A redirect `source` is a claim over a namespace, and `public/` shares that
 * namespace with the router.** `/categories/:path*` matched the static asset
 * directory `public/categories/` as readily as the route, so all 21 department
 * photographs were answered with `307 -> /au/categories/<file>.webp`, where no
 * file exists, and every one of them 404ed in production. Redirects are
 * evaluated before the static-file handler, so nothing downstream could rescue
 * them.
 *
 * Excluding a dot rather than naming the one colliding directory keeps the
 * guard over all five prefixes and over assets nobody has added yet. What it
 * costs is a redirect for any route segment containing a dot, and none exists:
 * a product or category slug is `^[a-z0-9]+(?:-[a-z0-9]+)*$`, refused by
 * `isPublicSlug` in `sals3-portal` before it can ever be written. `*` keeps the
 * bare prefix (`/cart`, `/categories`) matching on zero segments.
 */
const MOVED_ROUTE_SEGMENTS = ':path([^/.]+)*';

const nextConfig: NextConfig = {
  async redirects() {
    return MARKET_MOVED_ROUTES.map((source) => ({
      source: `${source}/${MOVED_ROUTE_SEGMENTS}`,
      destination: `/au${source}/:path*`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      { source: DOCUMENT_PATHS, headers: SECURITY_HEADERS },
      ...NO_STORE_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      })),
      {
        source: '/checkout/:path*',
        headers: [{ key: 'Content-Security-Policy', value: CHECKOUT_CSP }],
      },
    ];
  },
  images: {
    /*
     * Every image goes through `src/lib/images/cj-image-loader.ts` instead of
     * Vercel's metered `/_next/image` optimizer, which answered `402
     * OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` to every request once the
     * account's Image Optimization allowance ran out (verified against
     * production 2026-08-14) and broke every image in the storefront. The
     * loader hands resizing to CJ's own CDN for free; read its header comment
     * for the measurements and for what it deliberately does not do.
     */
    loader: 'custom',
    loaderFile: './src/lib/images/cj-image-loader.ts',
    /*
     * Allow-listed on purpose: only these CJdropshipping hosts may serve
     * product images. `getAllowedProductImageUrl` in
     * `src/services/storefront/mappers.ts` drops any image address from another
     * host as the portal payload is mapped, so the two lists must stay in step
     * — both now read `src/lib/cj-image-hosts.ts`.
     *
     * This list no longer gates anything at request time: a custom loader
     * bypasses the optimizer that enforces it. It is kept because it documents
     * the same allow-list the code enforces, and because removing it would
     * silently re-open the whole internet the moment anyone drops `loader:
     * 'custom'`. `cdn.dummyjson.com` used to be listed here for the first
     * landing page's placeholder catalogue; no code path renders that host any
     * more, so it is gone.
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cf.cjdropshipping.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'oss-cf.cjdropshipping.com',
        pathname: '/**',
      },
      // Seller-uploaded photos on Cloudflare R2 (NEXT_PUBLIC_R2_IMAGE_BASE_URL).
      ...r2RemotePatterns(),
    ],
  },
};

export default nextConfig;
