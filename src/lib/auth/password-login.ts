import { z } from 'zod';
import getCsrfToken from './auth-csrf-client';
import authFlowError from './auth-flow-error';
import { AUTH_ERROR } from './auth-error-codes';
import type { LoginInput } from './login-schema';

/**
 * Email and password sign-in, from the browser's side.
 *
 * Unlike the Google flow this touches no Firebase client SDK: the credential
 * goes straight to our own route, which verifies it server-side. So password
 * sign-in keeps working even when the `NEXT_PUBLIC_FIREBASE_*` values are
 * absent — only the Google button needs them.
 */

const errorResponseSchema = z.object({ error: z.string() });

async function readErrorCode(response: Response) {
  try {
    const parsed = errorResponseSchema.safeParse(await response.json());

    return parsed.success ? parsed.data.error : AUTH_ERROR.serviceUnavailable;
  } catch {
    return AUTH_ERROR.serviceUnavailable;
  }
}

export default async function signInWithPasswordSession(
  input: LoginInput,
): Promise<void> {
  const csrfToken = await getCsrfToken('Unable to start secure sign-in.');

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, csrfToken }),
    cache: 'no-store',
  });

  if (response.ok) {
    return;
  }

  throw authFlowError(
    'Sign-in could not be completed.',
    await readErrorCode(response),
  );
}
