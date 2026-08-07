/**
 * The auth wire contract.
 *
 * Every failing auth response body is exactly `{ "error": "<code>" }`. No
 * sentence, no upstream detail, no stack (rules 34 and 36). The human copy
 * lives client-side, next to the components that render it, so all visitor
 * wording is reviewable in one place and the server cannot leak
 * implementation detail through prose.
 *
 * Codes rather than sentences also let the client tell an unavailable address
 * apart from a rejected credential without matching on copy.
 *
 * This module is imported by both the routes and the browser, so it stays
 * free of imports. The helper that turns a code into a response lives in
 * `auth-error-response.ts`, which pulls in server-only modules.
 */
export const AUTH_ERROR = {
  invalidRequest: 'invalid_request',
  invalidCredentials: 'invalid_credentials',
  /**
   * Registration only. Signing a new account straight in means success has to
   * mean "you are signed in", which cannot be faked for an address someone
   * else owns — so signup has to say when one is taken. This does disclose
   * membership; sign-in stays generic.
   */
  emailUnavailable: 'email_unavailable',
  forbidden: 'forbidden',
  tooManyRequests: 'too_many_requests',
  serviceUnavailable: 'service_unavailable',
  weakPassword: 'weak_password',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR];

export const AUTH_ERROR_STATUS: Record<AuthErrorCode, number> = {
  [AUTH_ERROR.invalidRequest]: 400,
  [AUTH_ERROR.weakPassword]: 400,
  [AUTH_ERROR.invalidCredentials]: 401,
  [AUTH_ERROR.forbidden]: 403,
  [AUTH_ERROR.emailUnavailable]: 409,
  [AUTH_ERROR.tooManyRequests]: 429,
  [AUTH_ERROR.serviceUnavailable]: 503,
};
