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
export const NO_STORE_ROUTES = ['/login', '/signup'];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: DOCUMENT_PATHS, headers: SECURITY_HEADERS },
      ...NO_STORE_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      })),
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
    ],
  },
};

export default nextConfig;
