import { AUTH_ERROR } from './auth-error-codes';
import { getAuthFlowErrorCode } from './auth-flow-error';
import { CSRF_UNAVAILABLE_CODE } from './auth-csrf-client';

/**
 * Every sentence the auth forms can show for a server outcome, in one place.
 *
 * Keeping the enumeration-safe wording together makes it reviewable: the
 * generic credential message must stay generic, and nothing here may name a
 * cause the server refused to disclose.
 */

export const INVALID_CREDENTIALS_NOTICE =
  'That email and password do not match an account. Check both and try again.';

export const TOO_MANY_REQUESTS_NOTICE =
  'Too many sign-in attempts. Wait a few minutes, then try again.';

export const SERVICE_UNAVAILABLE_NOTICE =
  'Something went wrong on our side. Try again in a moment.';

export const CSRF_NOTICE =
  'Secure sign-in could not start. Refresh the page and try again.';

/**
 * Registration only. Sign-in never says whether an address has an account;
 * signup has to, because it signs the new account straight in and cannot do
 * that for an address someone else owns.
 */
export const EMAIL_UNAVAILABLE_NOTICE =
  'An account already uses that email address. Sign in instead.';

export const SIGNING_IN_ANNOUNCEMENT = 'Signing in.';

export const SIGNED_IN_ANNOUNCEMENT = 'Signed in. Taking you to Sals3.';

const NOTICE_BY_CODE: Record<string, string> = {
  [AUTH_ERROR.invalidCredentials]: INVALID_CREDENTIALS_NOTICE,
  [AUTH_ERROR.emailUnavailable]: EMAIL_UNAVAILABLE_NOTICE,
  [AUTH_ERROR.tooManyRequests]: TOO_MANY_REQUESTS_NOTICE,
  [AUTH_ERROR.serviceUnavailable]: SERVICE_UNAVAILABLE_NOTICE,
  [AUTH_ERROR.weakPassword]: SERVICE_UNAVAILABLE_NOTICE,
  [AUTH_ERROR.forbidden]: CSRF_NOTICE,
  [AUTH_ERROR.invalidRequest]: CSRF_NOTICE,
  [CSRF_UNAVAILABLE_CODE]: CSRF_NOTICE,
};

/**
 * Falls back to the generic outage wording for anything unrecognised, so a new
 * server code can never surface a raw string to a shopper.
 */
export default function getLoginErrorNotice(error: unknown) {
  const code = getAuthFlowErrorCode(error);

  return (code && NOTICE_BY_CODE[code]) || SERVICE_UNAVAILABLE_NOTICE;
}
