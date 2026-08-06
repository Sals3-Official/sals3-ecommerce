import 'server-only';

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

export default function getFirebaseAdminAuth(): Auth {
  const existingApp = getApps()[0];

  if (existingApp) {
    return getAuth(existingApp);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return getAuth(
      initializeApp({
        credential: applicationDefault(),
        ...(projectId ? { projectId } : {}),
      }),
    );
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin configuration is missing.');
  }

  return getAuth(
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    }),
  );
}
