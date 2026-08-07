import type { NextRequest } from 'next/server';
import { AUTH_ERROR } from '@/lib/auth/auth-error-codes';
import authErrorJson from '@/lib/auth/auth-error-response';
import guardAuthPost, { tooManyRequests } from '@/lib/auth/auth-request-guards';
import { signupRequestSchema } from '@/lib/auth/auth-request-schemas';
import { RATE_LIMIT_SCOPES, SIGNUP_RULES } from '@/lib/auth/auth-rate-limits';
import getFirebaseAdminAuth from '@/lib/auth/firebase-admin';
import { signUpWithPassword } from '@/lib/auth/identity-toolkit';
import { getEmailKey, isRateLimited } from '@/lib/auth/rate-limit';
import { setSessionCookie } from '@/lib/auth/session-cookie-response';
import { SESSION_MAX_AGE_MS, noStoreJson } from '@/lib/auth/session-cookies';

/**
 * Account registration.
 *
 * The new account is signed straight in: the same 24-hour `httpOnly`
 * `sals3_session` cookie the sign-in route mints, so the visitor lands on the
 * home page already signed in.
 *
 * Address verification is deliberately out of scope. That means an address can
 * be registered by someone who does not own it, and it is why an
 * already-registered address must be reported rather than absorbed — success
 * here means "you are signed in", which cannot be faked for an account
 * somebody else owns.
 *
 * The account is created through the Identity Toolkit rather than the Admin
 * SDK because only the REST call returns an ID token, which is what
 * `createSessionCookie` needs.
 */

/**
 * Best effort. The account already exists at this point, so a failure here
 * must not fail the signup — the visitor simply has no first name in the
 * header until they set one.
 */
async function setDisplayName(localId: string, fullName: string) {
  try {
    await getFirebaseAdminAuth().updateUser(localId, { displayName: fullName });
  } catch {
    // eslint-disable-next-line no-console
    console.error('[auth] display name not set for a new account');
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAuthPost(request, {
    scope: RATE_LIMIT_SCOPES.signup,
    perIp: SIGNUP_RULES.perIp,
    schema: signupRequestSchema,
  });

  if (!guard.ok) {
    return guard.response;
  }

  const { fullName, email, password } = guard.data;
  const emailKey = getEmailKey(email);

  if (
    isRateLimited(RATE_LIMIT_SCOPES.signup, [
      { key: emailKey, rule: SIGNUP_RULES.perEmail },
    ])
  ) {
    return tooManyRequests(
      RATE_LIMIT_SCOPES.signup,
      emailKey,
      SIGNUP_RULES.perEmail,
    );
  }

  const created = await signUpWithPassword({ email, password });

  if (created.status === 'email-exists') {
    return authErrorJson(AUTH_ERROR.emailUnavailable);
  }

  if (created.status !== 'ok') {
    return authErrorJson(created.error);
  }

  await setDisplayName(created.localId, fullName);

  try {
    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(
      created.idToken,
      { expiresIn: SESSION_MAX_AGE_MS },
    );
    const response = noStoreJson({ status: 'success' });

    setSessionCookie(response, sessionCookie);

    return response;
  } catch {
    // The account exists but no cookie could be minted. Reporting an outage is
    // honest: the visitor can sign in with the credential they just chose.
    // eslint-disable-next-line no-console
    console.error('[auth] session cookie not minted for a new account');

    return authErrorJson(AUTH_ERROR.serviceUnavailable);
  }
}
