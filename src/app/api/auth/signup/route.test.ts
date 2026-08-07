import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ERROR } from '@/lib/auth/auth-error-codes';
import { SIGNUP_RULES } from '@/lib/auth/auth-rate-limits';
import { MAX_PASSWORD_LENGTH } from '@/lib/auth/login-schema';
import { resetRateLimitsForTests } from '@/lib/auth/rate-limit';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session-cookies';
import { POST } from './route';

const firebaseAdminAuth = vi.hoisted(() => ({
  updateUser: vi.fn(),
  createSessionCookie: vi.fn<(idToken: string) => Promise<string>>(),
}));

const identityToolkit = vi.hoisted(() => ({
  signUpWithPassword: vi.fn(),
}));

vi.mock('@/lib/auth/firebase-admin', () => ({
  default: () => firebaseAdminAuth,
}));

vi.mock('@/lib/auth/identity-toolkit', () => identityToolkit);

const csrfToken = 'x'.repeat(43);
const VALID_EMAIL = 'newcomer@example.com';
const VALID_NAME = 'AJ Shopper';
const SENTINEL_PASSWORD = 'sentinel-pw-9f3a2b7c';

function request(
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: {
      cookie: `${CSRF_COOKIE_NAME}=${csrfToken}`,
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      ...headers,
    },
    body:
      typeof overrides.body === 'string'
        ? overrides.body
        : JSON.stringify({
            fullName: VALID_NAME,
            email: VALID_EMAIL,
            password: SENTINEL_PASSWORD,
            csrfToken,
            ...overrides,
          }),
  });
}

function givenNewAccount() {
  identityToolkit.signUpWithPassword.mockResolvedValue({
    status: 'ok',
    idToken: 'upstream-id-token',
    localId: 'uid-new',
  });
  firebaseAdminAuth.updateUser.mockResolvedValue({});
  firebaseAdminAuth.createSessionCookie.mockResolvedValue('session-cookie');
}

afterEach(() => {
  vi.restoreAllMocks();
  resetRateLimitsForTests();
  identityToolkit.signUpWithPassword.mockReset();
  firebaseAdminAuth.updateUser.mockReset();
  firebaseAdminAuth.createSessionCookie.mockReset();
});

describe('POST /api/auth/signup — guards', () => {
  it('rejects a cross-origin request', async () => {
    const response = await POST(request({}, { origin: 'http://evil.example' }));

    expect(response.status).toBe(403);
    expect(identityToolkit.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('rejects a mismatched CSRF token', async () => {
    const response = await POST(
      request({}, { cookie: `${CSRF_COOKIE_NAME}=${'y'.repeat(43)}` }),
    );

    expect(response.status).toBe(401);
    expect(identityToolkit.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before touching the provider', async () => {
    const response = await POST(request({ body: '{' }));

    expect(response.status).toBe(400);
    expect(identityToolkit.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('rejects an oversized password before it can reach a hasher', async () => {
    const response = await POST(
      request({ password: 'a'.repeat(MAX_PASSWORD_LENGTH + 1) }),
    );

    expect(response.status).toBe(400);
    expect(identityToolkit.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('rejects a missing name', async () => {
    const response = await POST(request({ fullName: '' }));

    expect(response.status).toBe(400);
    expect(identityToolkit.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('rejects a name carrying markup rather than storing it as a display name', async () => {
    const response = await POST(request({ fullName: '<script>x</script>' }));

    expect(response.status).toBe(400);
    expect(identityToolkit.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('accepts a non-ASCII name', async () => {
    givenNewAccount();

    const response = await POST(request({ fullName: 'Zoë Ngô-Đình' }));

    expect(response.status).toBe(200);
    expect(firebaseAdminAuth.updateUser).toHaveBeenCalledWith('uid-new', {
      displayName: 'Zoë Ngô-Đình',
    });
  });

  it('ignores a confirmPassword field, which is a form concern only', async () => {
    givenNewAccount();

    const response = await POST(request({ confirmPassword: 'anything-else' }));

    expect(response.status).toBe(200);
  });
});

describe('POST /api/auth/signup — registration', () => {
  it('creates the account and signs it straight in', async () => {
    givenNewAccount();

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'success' });
    expect(identityToolkit.signUpWithPassword).toHaveBeenCalledWith({
      email: VALID_EMAIL,
      password: SENTINEL_PASSWORD,
    });
  });

  it('issues the same session cookie the sign-in route issues', async () => {
    givenNewAccount();

    const setCookie = (await POST(request())).headers.get('set-cookie') ?? '';

    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=session-cookie`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
  });

  it('mints the cookie from the token the provider just returned', async () => {
    givenNewAccount();

    await POST(request());

    expect(firebaseAdminAuth.createSessionCookie).toHaveBeenCalledWith(
      'upstream-id-token',
      { expiresIn: SESSION_MAX_AGE_MS },
    );
  });

  it('does not require a verified address, since none is ever sent', async () => {
    givenNewAccount();

    expect((await POST(request())).status).toBe(200);
  });

  it('records the display name so the header greets password accounts too', async () => {
    givenNewAccount();

    await POST(request());

    expect(firebaseAdminAuth.updateUser).toHaveBeenCalledWith('uid-new', {
      displayName: VALID_NAME,
    });
  });

  it('still succeeds when the display name cannot be recorded', async () => {
    givenNewAccount();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    firebaseAdminAuth.updateUser.mockRejectedValue(new Error('admin down'));

    expect((await POST(request())).status).toBe(200);
  });

  it('reports an outage when the account exists but no cookie could be minted', async () => {
    givenNewAccount();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    firebaseAdminAuth.createSessionCookie.mockRejectedValue(
      new Error('admin down'),
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('reports a provider outage rather than claiming success', async () => {
    identityToolkit.signUpWithPassword.mockResolvedValue({
      status: 'failed',
      error: AUTH_ERROR.serviceUnavailable,
    });

    expect((await POST(request())).status).toBe(503);
  });

  it('reports a provider password policy rejection', async () => {
    identityToolkit.signUpWithPassword.mockResolvedValue({
      status: 'failed',
      error: AUTH_ERROR.weakPassword,
    });

    expect((await POST(request())).status).toBe(400);
  });
});

describe('POST /api/auth/signup — an address already in use', () => {
  function givenAddressTaken() {
    identityToolkit.signUpWithPassword.mockResolvedValue({
      status: 'email-exists',
    });
  }

  it('reports the address as unavailable', async () => {
    // A deliberate disclosure, and the one place sign-in's generic posture is
    // not mirrored. Success here means "you are signed in", which cannot be
    // faked for an account somebody else owns, so the visitor has to be told.
    givenAddressTaken();

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: AUTH_ERROR.emailUnavailable,
    });
  });

  it('never signs the caller into the account that already exists', async () => {
    givenAddressTaken();

    const response = await POST(request());

    expect(firebaseAdminAuth.createSessionCookie).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('does not overwrite the existing account display name', async () => {
    givenAddressTaken();

    await POST(request());

    expect(firebaseAdminAuth.updateUser).not.toHaveBeenCalled();
  });

  it('is still throttled, so the disclosure cannot be harvested in bulk', async () => {
    givenAddressTaken();

    const attempts = Array.from(
      { length: SIGNUP_RULES.perIp.limit + 1 },
      (_unused, index) => index,
    );

    const responses = await attempts.reduce<Promise<Response[]>>(
      async (previous, index) => {
        const collected = await previous;

        return [
          ...collected,
          await POST(request({ email: `probe${index}@example.com` })),
        ];
      },
      Promise.resolve([]),
    );

    expect(responses.at(-1)!.status).toBe(429);
  });
});

describe('POST /api/auth/signup — throttling and leakage', () => {
  it('caps registrations per address regardless of source', async () => {
    givenNewAccount();

    const attempts = Array.from(
      { length: SIGNUP_RULES.perEmail.limit + 1 },
      (_unused, index) => index,
    );

    const responses = await attempts.reduce<Promise<Response[]>>(
      async (previous, index) => {
        const collected = await previous;
        const response = await POST(
          request({}, { 'x-forwarded-for': `198.51.100.${index}` }),
        );

        return [...collected, response];
      },
      Promise.resolve([]),
    );

    expect(responses.at(-1)!.status).toBe(429);
    expect(identityToolkit.signUpWithPassword).toHaveBeenCalledTimes(
      SIGNUP_RULES.perEmail.limit,
    );
  });

  it('never returns the password or the upstream token', async () => {
    givenNewAccount();

    const response = await POST(request());
    const serialised = `${await response.text()}|${[...response.headers]
      .flat()
      .join('|')}`;

    expect(serialised).not.toContain(SENTINEL_PASSWORD);
    expect(serialised).not.toContain('upstream-id-token');
  });

  it('never writes the password to the console', async () => {
    const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const spies = levels.map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );

    givenNewAccount();
    await POST(request());

    const written = spies
      .flatMap((spy) => spy.mock.calls.flat())
      .map((value) =>
        typeof value === 'string' ? value : JSON.stringify(value),
      )
      .join('|');

    expect(written).not.toContain(SENTINEL_PASSWORD);
    expect(written).not.toContain(VALID_EMAIL);
  });

  it('sends Cache-Control no-store', async () => {
    givenNewAccount();

    expect((await POST(request())).headers.get('cache-control')).toBe(
      'no-store',
    );
  });
});
