import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  inMemoryPersistence,
  setPersistence,
  type Auth,
} from 'firebase/auth';

const firebaseConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
] as const satisfies readonly (keyof FirebaseOptions)[];

let authPromise: Promise<Auth> | undefined;

function authSetupError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

function getFirebaseWebConfig(): FirebaseOptions | undefined {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  } satisfies FirebaseOptions;

  return firebaseConfigKeys.every((key) => Boolean(config[key]))
    ? config
    : undefined;
}

export default async function getFirebaseAuth(): Promise<Auth> {
  const config = getFirebaseWebConfig();

  if (!config) {
    throw authSetupError(
      'Firebase web configuration is missing.',
      'auth/missing-client-config',
    );
  }

  if (!authPromise) {
    const app = getApps()[0] ?? initializeApp(config);
    const auth = getAuth(app);

    authPromise = setPersistence(auth, inMemoryPersistence).then(() => auth);
  }

  return authPromise;
}
