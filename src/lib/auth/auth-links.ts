/**
 * Destinations referenced by the credential screens.
 *
 * `pricing`, `terms`, and `privacy` reuse the exact hrefs the site footer
 * already ships (see `footer-data.ts`) so there is one path per document.
 * `passwordReset` is the only path with no route behind it — it is listed here
 * rather than inlined so the route, when built, has one place to land. That
 * gap now matters: real password accounts exist, and a visitor who forgets a
 * password has no in-app recovery until it is built.
 * None of these are external, so no target/rel handling is needed.
 */
const AUTH_LINKS = {
  home: '/',
  signIn: '/login',
  signUp: '/signup',
  pricing: '/help/pricing',
  passwordReset: '/login/reset',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
} as const;

export default AUTH_LINKS;
