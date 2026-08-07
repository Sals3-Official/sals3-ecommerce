import type { NextRequest } from 'next/server';
import { AUTH_ERROR } from '@/lib/auth/auth-error-codes';
import authErrorJson from '@/lib/auth/auth-error-response';
import guardAuthPost, { tooManyRequests } from '@/lib/auth/auth-request-guards';
import { loginRequestSchema } from '@/lib/auth/auth-request-schemas';
import { LOGIN_RULES, RATE_LIMIT_SCOPES } from '@/lib/auth/auth-rate-limits';
import getFirebaseAdminAuth from '@/lib/auth/firebase-admin';
import { signInWithPassword } from '@/lib/auth/identity-toolkit';
import { getEmailKey, isRateLimited } from '@/lib/auth/rate-limit';
import { setSessionCookie } from '@/lib/auth/session-cookie-response';
import {
  SESSION_MAX_AGE_MS,
  isRecentAuthTime,
  noStoreJson,
} from '@/lib/auth/session-cookies';

/**
 * Email and password sign-in.
 *
 * The credential is checked here rather than in the browser so the server can
 * re-validate it with the same schema the form used, throttle per account as
 * well as per address, and return one response for every credential failure.
 *
 * Nothing in this file logs, echoes, or stores the password, and no response
 * body carries anything beyond a fixed error code.
 */
export async function POST(request: NextRequest) {
  const guard = await guardAuthPost(request, {
    scope: RATE_LIMIT_SCOPES.login,
    perIp: LOGIN_RULES.perIp,
    schema: loginRequestSchema,
  });

  if (!guard.ok) {
    return guard.response;
  }

  const { email, password } = guard.data;
  const emailKey = getEmailKey(email);

  // Runs after validation, because only a well-formed address can be
  // normalised into a stable bucket. This is the dimension that actually caps
  // credential stuffing: a botnet rotates addresses, but it cannot rotate the
  // account it is attacking.
  if (
    isRateLimited(RATE_LIMIT_SCOPES.login, [
      { key: emailKey, rule: LOGIN_RULES.perEmail },
    ])
  ) {
    return tooManyRequests(
      RATE_LIMIT_SCOPES.login,
      emailKey,
      LOGIN_RULES.perEmail,
    );
  }

  const signIn = await signInWithPassword({ email, password });

  if (signIn.status !== 'ok') {
    return authErrorJson(
      signIn.status === 'email-exists'
        ? AUTH_ERROR.invalidCredentials
        : signIn.error,
    );
  }

  try {
    const auth = getFirebaseAdminAuth();

    // Confirms the token is genuinely ours (issuer, audience, signature)
    // before a 24-hour cookie is minted from it. `checkRevoked` is omitted on
    // purpose: the token is seconds old, and the extra flag costs a second
    // upstream lookup for nothing.
    //
    // `email_verified` is deliberately not checked. Address verification is
    // out of scope: signup signs the visitor straight in, so requiring a
    // verified address here would lock out every account the moment it was
    // created. The consequence is that an address can be registered by someone
    // who does not own it.
    const decodedToken = await auth.verifyIdToken(signIn.idToken);

    if (!isRecentAuthTime(decodedToken.auth_time)) {
      return authErrorJson(AUTH_ERROR.invalidCredentials);
    }

    const sessionCookie = await auth.createSessionCookie(signIn.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    const response = noStoreJson({ status: 'success' });

    setSessionCookie(response, sessionCookie);

    return response;
  } catch {
    // Deliberately indistinguishable from a wrong password: an admin-side
    // fault must not tell a caller that the credential was correct.
    return authErrorJson(AUTH_ERROR.invalidCredentials);
  }
}
