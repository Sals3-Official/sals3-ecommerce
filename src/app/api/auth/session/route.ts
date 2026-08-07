import type { NextRequest } from 'next/server';
import { z } from 'zod';
import getFirebaseAdminAuth from '@/lib/auth/firebase-admin';
import {
  clearSessionCookie,
  setSessionCookie,
} from '@/lib/auth/session-cookie-response';
import { toSignedInSessionResponse } from '@/lib/auth/session-user';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  hasMatchingCsrf,
  hasSameOrigin,
  isRecentAuthTime,
  isSessionPostRateLimited,
  noStoreJson,
} from '@/lib/auth/session-cookies';

const sessionRequestSchema = z.object({
  idToken: z.string().min(1).max(8192),
  csrfToken: z.string().min(32).max(256),
});

function unauthorized() {
  return noStoreJson({ error: 'Unauthorized request.' }, { status: 401 });
}

function forbidden() {
  return noStoreJson({ error: 'Forbidden request.' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return noStoreJson({ signedIn: false });
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );

    const displayName: unknown = decodedToken.name;

    return noStoreJson(toSignedInSessionResponse(displayName));
  } catch {
    const response = noStoreJson({ signedIn: false });
    clearSessionCookie(response);
    return response;
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return forbidden();
  }

  if (isSessionPostRateLimited(request)) {
    return noStoreJson({ error: 'Too many requests.' }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = sessionRequestSchema.safeParse(body);

  if (!parsed.success || !hasMatchingCsrf(request, parsed.data.csrfToken)) {
    return unauthorized();
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(parsed.data.idToken);

    if (!isRecentAuthTime(decodedToken.auth_time)) {
      return unauthorized();
    }

    const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    const response = noStoreJson({ status: 'success' });

    setSessionCookie(response, sessionCookie);

    return response;
  } catch {
    return unauthorized();
  }
}

export function DELETE(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return forbidden();
  }

  const csrfToken = request.headers.get('x-sals3-csrf') ?? '';

  if (!hasMatchingCsrf(request, csrfToken)) {
    return unauthorized();
  }

  const response = noStoreJson({ status: 'signed-out' });
  clearSessionCookie(response);

  return response;
}
