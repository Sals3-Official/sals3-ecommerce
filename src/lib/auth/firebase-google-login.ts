import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { z } from 'zod';
import getFirebaseAuth from './firebase-client';

const csrfResponseSchema = z.object({
  csrfToken: z.string().min(32),
});

function authFlowError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf', { cache: 'no-store' });

  if (!response.ok) {
    throw authFlowError(
      'Unable to start secure Google sign-in.',
      'auth/csrf-unavailable',
    );
  }

  const parsed = csrfResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw authFlowError(
      'Unable to start secure Google sign-in.',
      'auth/csrf-unavailable',
    );
  }

  return parsed.data.csrfToken;
}

async function createServerSession(idToken: string, csrfToken: string) {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, csrfToken }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw authFlowError(
      'Unable to finish secure Google sign-in.',
      'auth/server-session-unavailable',
    );
  }
}

export default async function signInWithGoogleSession() {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  try {
    const idToken = await result.user.getIdToken();
    const csrfToken = await getCsrfToken();

    await createServerSession(idToken, csrfToken);
  } finally {
    await signOut(auth);
  }
}
