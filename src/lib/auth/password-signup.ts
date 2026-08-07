import { z } from 'zod';
import getCsrfToken from './auth-csrf-client';
import authFlowError from './auth-flow-error';
import { AUTH_ERROR } from './auth-error-codes';

const errorResponseSchema = z.object({ error: z.string() });

export type SignupCredentials = {
  fullName: string;
  email: string;
  password: string;
};

/**
 * Account registration, from the browser's side.
 *
 * There is no already-registered outcome to handle: the server answers a taken
 * address exactly as it answers a fresh one, so the form has a single success
 * state and cannot be used to probe for accounts.
 */
export default async function signUpWithPasswordAccount(
  input: SignupCredentials,
): Promise<void> {
  const csrfToken = await getCsrfToken('Unable to start secure signup.');

  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, csrfToken }),
    cache: 'no-store',
  });

  if (response.ok) {
    return;
  }

  const parsed = errorResponseSchema.safeParse(
    await response.json().catch(() => null),
  );

  throw authFlowError(
    'Account could not be created.',
    parsed.success ? parsed.data.error : AUTH_ERROR.serviceUnavailable,
  );
}
