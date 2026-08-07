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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.dummyjson.com',
        pathname: '/product-images/**',
      },
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
