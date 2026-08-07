import type { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  isProduction,
} from './session-cookies';

/**
 * One definition of the session cookie's attributes, shared by every route
 * that mints or clears it, so the two can never drift apart.
 *
 * `httpOnly` keeps the cookie out of reach of any script, `sameSite: 'lax'`
 * stops it riding along with a cross-site POST, and `secure` is applied
 * outside development only so a plain-HTTP local run can still sign in
 * (rule 28).
 */
const SESSION_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} as const;

export function setSessionCookie(
  response: NextResponse,
  sessionCookie: string,
) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    ...SESSION_COOKIE_ATTRIBUTES,
    secure: isProduction(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...SESSION_COOKIE_ATTRIBUTES,
    secure: isProduction(),
    maxAge: 0,
  });
}
