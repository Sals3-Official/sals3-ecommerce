import { vi, type Mock } from 'vitest';

/**
 * Shared Identity Toolkit stubs.
 *
 * Lives in `test/` rather than beside a spec because four suites need the same
 * upstream error strings, and duplicating Google's codes across them
 * guarantees drift. The filename has no `.test.` segment, so `vitest.config.mts`
 * will not collect it as a suite — same arrangement as `test/render-with-cart.tsx`.
 */

export const IDENTITY_TOOLKIT_ORIGIN = 'https://identitytoolkit.googleapis.com';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function upstreamError(message: string) {
  return json({ error: { code: 400, message } }, 400);
}

export const identityToolkitFixtures = {
  signInSuccess: (idToken = 'upstream-id-token', localId = 'user-1') =>
    json(
      { idToken, localId, email: 'shopper@example.com', registered: true },
      200,
    ),
  signUpSuccess: (idToken = 'upstream-id-token', localId = 'user-1') =>
    json({ idToken, localId, email: 'shopper@example.com' }, 200),
  oobCodeSent: () => json({ email: 'shopper@example.com' }, 200),
  emailNotFound: () => upstreamError('EMAIL_NOT_FOUND'),
  invalidPassword: () => upstreamError('INVALID_PASSWORD'),
  invalidLoginCredentials: () => upstreamError('INVALID_LOGIN_CREDENTIALS'),
  userDisabled: () => upstreamError('USER_DISABLED'),
  emailExists: () => upstreamError('EMAIL_EXISTS'),
  weakPassword: () =>
    upstreamError('WEAK_PASSWORD : Password should be at least 6 characters'),
  tooManyAttempts: () => upstreamError('TOO_MANY_ATTEMPTS_TRY_LATER'),
  operationNotAllowed: () => upstreamError('OPERATION_NOT_ALLOWED'),
  /** A proxy or outage returning HTML where JSON was expected. */
  malformedUpstream: () => new Response('<html>502</html>', { status: 502 }),
} as const;

/**
 * Installs a global `fetch` answering only Identity Toolkit URLs.
 *
 * Anything else throws, so a stray outbound call fails with a readable message
 * instead of hanging on a real DNS lookup — CI supplies no Firebase
 * credentials and must never reach Google.
 *
 * Responses are consumed in order; the last one is cloned for every further
 * call, because a `Response` body can only be read once.
 */
export function stubIdentityToolkit(
  ...responses: Response[]
): Mock<typeof fetch> {
  const queue = [...responses];

  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input instanceof Request ? input.url : input);

    if (!url.startsWith(IDENTITY_TOOLKIT_ORIGIN)) {
      throw new Error(`Unexpected outbound fetch in test: ${url}`);
    }

    if (queue.length > 1) {
      return queue.shift()!;
    }

    return queue[0]!.clone();
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

/** The JSON body a given call was made with, for asserting what went upstream. */
export function readSentBody(
  fetchMock: Mock<typeof fetch>,
  callIndex = 0,
): Record<string, unknown> {
  const init = fetchMock.mock.calls[callIndex]?.[1];

  return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
}

/** The URL a given call was made to. */
export function readSentUrl(fetchMock: Mock<typeof fetch>, callIndex = 0) {
  const input = fetchMock.mock.calls[callIndex]?.[0];

  return String(input instanceof Request ? input.url : input);
}
