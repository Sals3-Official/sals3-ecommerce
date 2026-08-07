import { AUTH_ERROR, type AuthErrorCode } from './auth-error-codes';

/**
 * Maps an Identity Toolkit error code onto the Sals3 wire contract.
 *
 * Every credential failure collapses to one code. `USER_DISABLED` is included
 * deliberately: reporting it separately would confirm that the address is
 * registered, which is exactly the oracle the generic response exists to
 * close. The accepted cost is that a disabled account sees a wrong-password
 * message rather than an explanation.
 */
const CREDENTIAL_FAILURES = new Set([
  'EMAIL_NOT_FOUND',
  'INVALID_PASSWORD',
  'INVALID_LOGIN_CREDENTIALS',
  'INVALID_EMAIL',
  'MISSING_PASSWORD',
  'MISSING_EMAIL',
  'USER_DISABLED',
  'INVALID_ID_TOKEN',
  'TOKEN_EXPIRED',
]);

export default function toAuthErrorCode(upstreamCode: string): AuthErrorCode {
  if (CREDENTIAL_FAILURES.has(upstreamCode)) {
    return AUTH_ERROR.invalidCredentials;
  }

  if (upstreamCode === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
    return AUTH_ERROR.tooManyRequests;
  }

  if (upstreamCode === 'WEAK_PASSWORD') {
    return AUTH_ERROR.weakPassword;
  }

  // OPERATION_NOT_ALLOWED, CONFIGURATION_NOT_FOUND, a rejected API key, a
  // network fault, or an unparseable body. Only the code is logged — never the
  // request body, the address, or the credential (rule 35).
  // eslint-disable-next-line no-console
  console.error('[auth] identity toolkit unavailable', { code: upstreamCode });

  return AUTH_ERROR.serviceUnavailable;
}
