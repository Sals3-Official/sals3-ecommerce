import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  identityToolkitFixtures as fixtures,
  readSentBody,
  readSentUrl,
  stubIdentityToolkit,
} from '../../../test/identity-toolkit-fixture';
import { AUTH_ERROR } from './auth-error-codes';
import {
  sendOobCode,
  signInWithPassword,
  signUpWithPassword,
} from './identity-toolkit';

// `identity-toolkit.ts` imports `server-only`, which throws outside a React
// Server Component graph. The route tests mock the wrapper instead; this suite
// exercises the wrapper itself, so the guard is neutralised here only.
vi.mock('server-only', () => ({}));

const SENTINEL_PASSWORD = 'sentinel-pw-9f3a2b7c';
const CREDENTIALS = {
  email: 'shopper@example.com',
  password: SENTINEL_PASSWORD,
};

beforeEach(() => {
  vi.stubEnv('FIREBASE_WEB_API_KEY', 'test-api-key');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('signInWithPassword', () => {
  it('posts the credentials to the signInWithPassword endpoint', async () => {
    const fetchMock = stubIdentityToolkit(fixtures.signInSuccess());

    await signInWithPassword(CREDENTIALS);

    expect(readSentUrl(fetchMock)).toContain('/v1/accounts:signInWithPassword');
    expect(readSentBody(fetchMock)).toEqual({
      email: CREDENTIALS.email,
      password: SENTINEL_PASSWORD,
      returnSecureToken: 'true',
    });
  });

  it('keeps the password in the body, never in the query string', async () => {
    const fetchMock = stubIdentityToolkit(fixtures.signInSuccess());

    await signInWithPassword(CREDENTIALS);

    expect(readSentUrl(fetchMock)).not.toContain(SENTINEL_PASSWORD);
  });

  it('returns the id token and local id on success', async () => {
    stubIdentityToolkit(fixtures.signInSuccess('token-abc', 'uid-abc'));

    await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'ok',
      idToken: 'token-abc',
      localId: 'uid-abc',
    });
  });

  it('never returns the refresh token, so nothing downstream can leak it', async () => {
    stubIdentityToolkit(
      new Response(
        JSON.stringify({
          idToken: 'token-abc',
          localId: 'uid-abc',
          refreshToken: 'refresh-abc',
        }),
        { status: 200 },
      ),
    );

    const result = await signInWithPassword(CREDENTIALS);

    expect(JSON.stringify(result)).not.toContain('refresh-abc');
  });

  it.each([
    ['an unknown address', fixtures.emailNotFound],
    ['a wrong password', fixtures.invalidPassword],
    ['a generic credential rejection', fixtures.invalidLoginCredentials],
    ['a disabled account', fixtures.userDisabled],
  ])(
    'collapses %s to one indistinguishable failure',
    async (_name, fixture) => {
      stubIdentityToolkit(fixture());

      await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
        status: 'failed',
        error: AUTH_ERROR.invalidCredentials,
      });
    },
  );

  it('surfaces upstream throttling as a rate-limit failure', async () => {
    stubIdentityToolkit(fixtures.tooManyAttempts());

    await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'failed',
      error: AUTH_ERROR.tooManyRequests,
    });
  });

  it('reports a provider misconfiguration as service unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubIdentityToolkit(fixtures.operationNotAllowed());

    await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'failed',
      error: AUTH_ERROR.serviceUnavailable,
    });
  });

  it('reports an unparseable upstream body as service unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubIdentityToolkit(fixtures.malformedUpstream());

    await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'failed',
      error: AUTH_ERROR.serviceUnavailable,
    });
  });

  it('reports a rejected fetch as service unavailable instead of throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error(SENTINEL_PASSWORD)),
    );

    await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'failed',
      error: AUTH_ERROR.serviceUnavailable,
    });
  });

  it('does not call Google at all when no API key is configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('FIREBASE_WEB_API_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', '');
    const fetchMock = stubIdentityToolkit(fixtures.signInSuccess());

    await expect(signInWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'failed',
      error: AUTH_ERROR.serviceUnavailable,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a wrong password', fixtures.invalidPassword],
    ['a provider outage', fixtures.operationNotAllowed],
    ['an unparseable body', fixtures.malformedUpstream],
  ])(
    'never writes the password to the console on %s',
    async (_name, fixture) => {
      const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const spies = levels.map((level) =>
        vi.spyOn(console, level).mockImplementation(() => {}),
      );

      stubIdentityToolkit(fixture());
      await signInWithPassword(CREDENTIALS);

      const written = spies
        .flatMap((spy) => spy.mock.calls.flat())
        .map((value) =>
          typeof value === 'string' ? value : JSON.stringify(value),
        )
        .join('|');

      expect(written).not.toContain(SENTINEL_PASSWORD);
      expect(written).not.toContain(CREDENTIALS.email);
    },
  );
});

describe('signUpWithPassword', () => {
  it('posts to the signUp endpoint and returns the new account', async () => {
    const fetchMock = stubIdentityToolkit(
      fixtures.signUpSuccess('token-new', 'uid-new'),
    );

    await expect(signUpWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'ok',
      idToken: 'token-new',
      localId: 'uid-new',
    });
    expect(readSentUrl(fetchMock)).toContain('/v1/accounts:signUp');
  });

  it('reports an already-registered address distinctly, for the route to neutralise', async () => {
    stubIdentityToolkit(fixtures.emailExists());

    await expect(signUpWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'email-exists',
    });
  });

  it('maps a provider password policy rejection to weak-password', async () => {
    stubIdentityToolkit(fixtures.weakPassword());

    await expect(signUpWithPassword(CREDENTIALS)).resolves.toEqual({
      status: 'failed',
      error: AUTH_ERROR.weakPassword,
    });
  });

  it('strips the human suffix from an upstream code', async () => {
    stubIdentityToolkit(fixtures.weakPassword());

    const result = await signUpWithPassword(CREDENTIALS);

    expect(JSON.stringify(result)).not.toContain('at least 6 characters');
  });
});

describe('sendOobCode', () => {
  it('asks Firebase to send an out-of-band email', async () => {
    const fetchMock = stubIdentityToolkit(fixtures.oobCodeSent());

    await expect(
      sendOobCode({ requestType: 'PASSWORD_RESET', email: CREDENTIALS.email }),
    ).resolves.toBe(true);
    expect(readSentUrl(fetchMock)).toContain('/v1/accounts:sendOobCode');
    expect(readSentBody(fetchMock)).toEqual({
      requestType: 'PASSWORD_RESET',
      email: CREDENTIALS.email,
    });
  });

  it('reports failure without throwing, so a caller is not forced to unwind', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubIdentityToolkit(fixtures.malformedUpstream());

    await expect(
      sendOobCode({ requestType: 'PASSWORD_RESET', email: CREDENTIALS.email }),
    ).resolves.toBe(false);
  });
});
