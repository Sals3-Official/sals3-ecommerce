/**
 * Where a visitor lands after signing in, when a guarded route sent them to the
 * credential screens in the first place.
 *
 * Security posture — this file is the whole story, so it is deliberately small:
 * the `next` query parameter is an **opaque key**, never a path and never a
 * URL. `/login?next=checkout` is honoured; `/login?next=/checkout`,
 * `?next=//evil.example`, and `?next=https://evil.example` all resolve to the
 * home page. Nothing a visitor types can reach `router.replace` or `redirect`
 * without first matching an entry in `POST_LOGIN_DESTINATIONS`, which is how
 * `nextjs-component-security-code-rules` rules 32 and 33 (allow-list internal
 * redirects, never block-list them) are satisfied. A conventional
 * `?callbackUrl=<path>` scheme would instead need a validator that has to be
 * right about every open-redirect trick; this one has nothing to get right.
 *
 * Kept free of `server-only` and of any `node:` import on purpose: the login
 * and signup forms are client components, and
 * `test/client-bundle-boundary.test.ts` walks their import graph and fails on
 * either.
 */
import AUTH_LINKS from './auth-links';

/** Query parameter carrying the key. */
export const POST_LOGIN_PARAM = 'next';

/** Where sign-in leads when no key is present, or the key is not recognised. */
export const DEFAULT_POST_LOGIN_PATH = AUTH_LINKS.home;

/**
 * The allow list. One entry per guarded route that redirects to sign-in; add a
 * key here when a new route starts calling `withPostLoginKey`.
 */
const POST_LOGIN_DESTINATIONS = {
  checkout: '/checkout',
  orders: '/orders',
} as const;

export type PostLoginKey = keyof typeof POST_LOGIN_DESTINATIONS;

/**
 * Narrows a raw `searchParams` value to a known key.
 *
 * A repeated parameter (`?next=checkout&next=evil`) arrives as an array and is
 * rejected outright rather than resolved to its first element: no legitimate
 * link produces one, so the ambiguity is not worth the guessing. The lookup
 * uses `Object.hasOwn` so inherited property names — `__proto__`,
 * `constructor`, `toString` — cannot masquerade as entries.
 */
export function getPostLoginKey(value: unknown): PostLoginKey | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return Object.hasOwn(POST_LOGIN_DESTINATIONS, value)
    ? (value as PostLoginKey)
    : undefined;
}

/** The internal path a key stands for. Unknown or absent keys go home. */
export function resolvePostLoginPath(key: PostLoginKey | undefined) {
  return key ? POST_LOGIN_DESTINATIONS[key] : DEFAULT_POST_LOGIN_PATH;
}

/**
 * Appends the key to a credential-screen href, so moving between `/login` and
 * `/signup` does not drop the destination the visitor was originally headed
 * for. Returns `href` untouched when there is no key to carry.
 */
export function withPostLoginKey(href: string, key: PostLoginKey | undefined) {
  if (!key) {
    return href;
  }

  return `${href}?${new URLSearchParams({ [POST_LOGIN_PARAM]: key }).toString()}`;
}
