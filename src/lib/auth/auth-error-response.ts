import { AUTH_ERROR_STATUS, type AuthErrorCode } from './auth-error-codes';
import { noStoreJson } from './session-cookies';

/**
 * Server half of the auth error contract.
 *
 * Split from `auth-error-codes.ts` because that module is imported by client
 * components, and this one reaches `session-cookies.ts`, which uses
 * `node:crypto`. Keeping them together dragged Node-only code into the browser
 * bundle and broke hydration.
 */
export default function authErrorJson(
  error: AuthErrorCode,
  headers?: Record<string, string>,
) {
  return noStoreJson(
    { error },
    { status: AUTH_ERROR_STATUS[error], ...(headers ? { headers } : {}) },
  );
}
