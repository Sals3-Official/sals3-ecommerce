import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import getCsrfToken from './auth-csrf-client';
import authFlowError from './auth-flow-error';
import getFirebaseAuth from './firebase-client';

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
    const csrfToken = await getCsrfToken(
      'Unable to start secure Google sign-in.',
    );

    await createServerSession(idToken, csrfToken);
  } finally {
    // The httpOnly cookie is the session of record. Dropping the client
    // Firebase state means a stolen browser profile yields no reusable
    // credential.
    await signOut(auth);
  }
}
