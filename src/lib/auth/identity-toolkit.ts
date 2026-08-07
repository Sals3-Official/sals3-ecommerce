import 'server-only';

import type { AuthErrorCode } from './auth-error-codes';
import toAuthErrorCode from './identity-toolkit-errors';
import {
  IDENTITY_TOOLKIT_UNKNOWN_ERROR,
  parseIdentityToolkitError,
  sendOobCodeResponseSchema,
  signInResponseSchema,
  signUpResponseSchema,
} from './identity-toolkit-schemas';

/**
 * Server-side client for the Firebase Identity Toolkit REST API.
 *
 * The password is checked here rather than in the browser so the server can
 * re-validate the credential shape, throttle per account, and collapse every
 * credential failure into one indistinguishable response.
 */

const IDENTITY_TOOLKIT_ORIGIN = 'https://identitytoolkit.googleapis.com';

export type IdentityToolkitResult<T> =
  | ({ status: 'ok' } & T)
  | { status: 'failed'; error: AuthErrorCode }
  | { status: 'email-exists' };

/**
 * Read per call, never captured at module load, so a test can stub the
 * environment and so a redeploy-free env change takes effect.
 *
 * The Web API key is public by design — it is already inlined into the client
 * bundle. `FIREBASE_WEB_API_KEY` exists because a key restricted by HTTP
 * referrer rejects server-to-server calls, which send no Referer. Point it at
 * a key restricted by API instead.
 */
function getApiKey() {
  return (
    process.env.FIREBASE_WEB_API_KEY ??
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    ''
  );
}

async function callIdentityToolkit(path: string, body: Record<string, string>) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { ok: false as const, json: undefined };
  }

  try {
    const response = await fetch(
      `${IDENTITY_TOOLKIT_ORIGIN}${path}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );

    return { ok: response.ok, json: (await response.json()) as unknown };
  } catch {
    // Never re-thrown: a rejected fetch can carry the request body, and the
    // body holds the password.
    return { ok: false as const, json: undefined };
  }
}

function toFailure(json: unknown): { status: 'failed'; error: AuthErrorCode } {
  const upstreamCode =
    json === undefined
      ? IDENTITY_TOOLKIT_UNKNOWN_ERROR
      : parseIdentityToolkitError(json);

  return { status: 'failed', error: toAuthErrorCode(upstreamCode) };
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<IdentityToolkitResult<{ idToken: string; localId: string }>> {
  const { ok, json } = await callIdentityToolkit(
    '/v1/accounts:signInWithPassword',
    { email: input.email, password: input.password, returnSecureToken: 'true' },
  );

  if (!ok) {
    return toFailure(json);
  }

  const parsed = signInResponseSchema.safeParse(json);

  return parsed.success
    ? { status: 'ok', ...parsed.data }
    : toFailure(undefined);
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
}): Promise<IdentityToolkitResult<{ idToken: string; localId: string }>> {
  const { ok, json } = await callIdentityToolkit('/v1/accounts:signUp', {
    email: input.email,
    password: input.password,
    returnSecureToken: 'true',
  });

  if (!ok) {
    if (parseIdentityToolkitError(json) === 'EMAIL_EXISTS') {
      return { status: 'email-exists' };
    }

    return toFailure(json);
  }

  const parsed = signUpResponseSchema.safeParse(json);

  return parsed.success
    ? { status: 'ok', ...parsed.data }
    : toFailure(undefined);
}

/**
 * Sends one of Firebase's own out-of-band emails. Firebase runs the mailer, so
 * no SMTP provider is needed.
 *
 * Nothing calls this yet. It is kept because `/login/reset` is the next piece
 * of work and needs exactly this with `requestType: 'PASSWORD_RESET'`; a
 * `VERIFY_EMAIL` request is the other caller if address verification is ever
 * reinstated.
 */
export async function sendOobCode(body: Record<string, string>) {
  const { ok, json } = await callIdentityToolkit(
    '/v1/accounts:sendOobCode',
    body,
  );

  return ok && sendOobCodeResponseSchema.safeParse(json).success;
}
