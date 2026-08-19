import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import getFirebaseAdminAuth from './firebase-admin';
import { SESSION_COOKIE_NAME } from './session-cookies';

/**
 * Server-side data access layer for the buyer session.
 *
 * Every guarded server surface reads the session through this file rather than
 * calling `verifySessionCookie` itself, so there is one place to audit and one
 * place to change. `GET /api/auth/session` deliberately stays separate: it also
 * clears a stale cookie on the way out, which a Server Component cannot do.
 *
 * Only the uid is returned. The decoded token carries the email, the display
 * name, the provider, and custom claims; none of that is needed to answer "may
 * this request continue", and not returning it keeps the surface honest.
 */
export type BuyerSession = {
  uid: string;
};

async function readSessionCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Fails closed for every reason at once: no cookie, a forged or expired
 * cookie, a revoked session when the check is on, and a server missing its
 * Firebase Admin credentials all return `null`. The caller gets a redirect or
 * a generic refusal either way, so distinguishing them would only leak the
 * server's state to whoever is probing it (rule 34).
 */
async function verifyBuyerSession(
  checkRevoked: boolean,
): Promise<BuyerSession | null> {
  const sessionCookie = await readSessionCookie();

  // The early exit matters beyond speed: a signed-out visitor never reaches
  // `firebase-admin`, so the redirect works — and stays testable end to end —
  // on a machine with no Firebase credentials at all.
  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      checkRevoked,
    );

    return { uid: decodedToken.uid };
  } catch {
    return null;
  }
}

/**
 * The page-render gate.
 *
 * `checkRevoked: false` verifies the cookie's signature and expiry against
 * Firebase's cached public keys with no network round trip; `true` costs one
 * Firebase call per render, and Vercel bills function duration. The tradeoff
 * that buys: a session revoked mid-life — signed out everywhere, password
 * changed, account disabled — can still *render* `/checkout` until the cookie
 * expires, bounded by `SESSION_MAX_AGE_SECONDS` (24 hours). It cannot
 * transact, because every action that spends money or supplier quota uses
 * `getRevocationCheckedBuyerSession` below. The guarantee sits on the money
 * path, where it is worth paying for.
 *
 * Memoized with React `cache` so several callers in one render pass — the page
 * guard, and anything later added below it — verify once, not once each.
 */
export const getBuyerSession = cache(async () => verifyBuyerSession(false));

/**
 * The money path: Server Actions that create a Stripe Checkout Session or
 * spend CJ freight-quote budget. Not memoized — each action invocation is its
 * own request, and re-checking revocation is the entire point.
 */
export async function getRevocationCheckedBuyerSession() {
  return verifyBuyerSession(true);
}
