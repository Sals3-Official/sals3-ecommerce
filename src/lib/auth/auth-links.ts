/**
 * Destinations referenced by the login screen.
 *
 * `pricing`, `terms`, and `privacy` reuse the exact hrefs the site footer
 * already ships (see `footer-data.ts`) so there is one path per document.
 * `passwordReset` is the only new path and no route backs it yet — it is listed
 * here rather than inlined so the route, when built, has one place to land.
 * None of these are external, so no target/rel handling is needed.
 */
const AUTH_LINKS = {
  home: '/',
  signUp: '/signup',
  pricing: '/help/pricing',
  passwordReset: '/login/reset',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
} as const;

export default AUTH_LINKS;
