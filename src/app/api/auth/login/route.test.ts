import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ERROR } from '@/lib/auth/auth-error-codes';
import { LOGIN_RULES } from '@/lib/auth/auth-rate-limits';
import { MAX_PASSWORD_LENGTH } from '@/lib/auth/login-schema';
import { resetRateLimitsForTests } from '@/lib/auth/rate-limit';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session-cookies';
import { POST } from './route';

const firebaseAdminAuth = vi.hoisted(() => ({
  createSessionCookie: vi.fn<(idToken: string) => Promise<string>>(),
  verifyIdToken: vi.fn<
    (idToken: string) => Promise<{
      auth_time: number;
      email_verified?: boolean;
    }>
  >(),
}));

const identityToolkit = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}));

vi.mock('@/lib/auth/firebase-admin', () => ({
  default: () => firebaseAdminAuth,
}));

vi.mock('@/lib/auth/identity-toolkit', () => identityToolkit);

const csrfToken = 'x'.repeat(43);
const routeUrl = 'http://localhost:3000/api/auth/login';

const VALID_EMAIL = 'shopper@example.com';
/** Distinctive so a substring assertion cannot pass by accident. */
const SENTINEL_PASSWORD = 'sentinel-pw-9f3a2b7c';

function request(
  init: {
    body?: string | Record<string, unknown>;
    cookie?: string | null;
    headers?: Record<string, string>;
  } = {},
) {
  const body =
    typeof init.body === 'string' ? init.body : JSON.stringify(init.body ?? {});

  return new NextRequest(routeUrl, {
    method: 'POST',
    headers: {
      ...(init.cookie === null
        ? {}
        : { cookie: init.cookie ?? `${CSRF_COOKIE_NAME}=${csrfToken}` }),
      ...init.headers,
    },
    body,
  });
}

function sameOriginHeaders(extra?: Record<string, string>) {
  return {
    'content-type': 'application/json',
    origin: 'http://localhost:3000',
    ...extra,
  };
}

function validRequest(
  overrides: Record<string, unknown> = {},
  headers?: Record<string, string>,
) {
  return request({
    body: {
      email: VALID_EMAIL,
      password: SENTINEL_PASSWORD,
      csrfToken,
      ...overrides,
    },
    headers: sameOriginHeaders(headers),
  });
}

function givenUpstreamSignIn(result: unknown) {
  identityToolkit.signInWithPassword.mockResolvedValue(result);
}

function givenVerifiedAccount() {
  givenUpstreamSignIn({
    status: 'ok',
    idToken: 'upstream-id-token',
    localId: 'uid-1',
  });
  firebaseAdminAuth.verifyIdToken.mockResolvedValue({
    auth_time: Math.floor(Date.now() / 1000),
    email_verified: true,
  });
  firebaseAdminAuth.createSessionCookie.mockResolvedValue('session-cookie');
}

/** Everything an attacker can observe, so two failures can be compared whole. */
async function snapshot(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    headers: [...response.headers]
      .filter(([key]) => key !== 'date')
      .sort(([left], [right]) => left.localeCompare(right)),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetRateLimitsForTests();
  identityToolkit.signInWithPassword.mockReset();
  firebaseAdminAuth.verifyIdToken.mockReset();
  firebaseAdminAuth.createSessionCookie.mockReset();
});

describe('POST /api/auth/login — origin and CSRF', () => {
  it.each([
    ['no Origin header', undefined],
    ['a different host', 'http://evil.example'],
    ['the same host on another port', 'http://localhost:3001'],
    ['the same host over another scheme', 'https://localhost:3000'],
    ['a null origin from a sandboxed iframe', 'null'],
  ])('rejects a request with %s', async (_name, origin) => {
    const response = await POST(
      request({
        body: { email: VALID_EMAIL, password: SENTINEL_PASSWORD, csrfToken },
        headers: {
          'content-type': 'application/json',
          ...(origin ? { origin } : {}),
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(identityToolkit.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing CSRF cookie', null, csrfToken],
    [
      'a mismatched CSRF cookie',
      `${CSRF_COOKIE_NAME}=${'y'.repeat(43)}`,
      csrfToken,
    ],
    ['a body token shorter than the schema minimum', undefined, 'z'.repeat(20)],
    ['a body token longer than the schema maximum', undefined, 'z'.repeat(300)],
  ])(
    'rejects %s without calling the provider',
    async (_name, cookie, bodyToken) => {
      const response = await POST(
        request({
          body: {
            email: VALID_EMAIL,
            password: SENTINEL_PASSWORD,
            csrfToken: bodyToken,
          },
          cookie,
          headers: sameOriginHeaders(),
        }),
      );

      expect([400, 401]).toContain(response.status);
      expect(identityToolkit.signInWithPassword).not.toHaveBeenCalled();
    },
  );

  it('returns an identical response for a missing and a mismatched CSRF cookie', async () => {
    const missing = await snapshot(
      await POST(
        request({
          body: { email: VALID_EMAIL, password: SENTINEL_PASSWORD, csrfToken },
          cookie: null,
          headers: sameOriginHeaders(),
        }),
      ),
    );

    resetRateLimitsForTests();

    const mismatched = await snapshot(
      await POST(
        request({
          body: { email: VALID_EMAIL, password: SENTINEL_PASSWORD, csrfToken },
          cookie: `${CSRF_COOKIE_NAME}=${'y'.repeat(43)}`,
          headers: sameOriginHeaders(),
        }),
      ),
    );

    expect(missing).toEqual(mismatched);
  });
});

describe('POST /api/auth/login — request shape', () => {
  it('rejects malformed JSON before touching the provider', async () => {
    const response = await POST(
      request({ body: '{', headers: sameOriginHeaders() }),
    );

    expect(response.status).toBe(400);
    expect(identityToolkit.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['an array', '[]'],
    ['a bare string', '"nope"'],
    ['null', 'null'],
  ])('rejects %s as a request body', async (_name, body) => {
    const response = await POST(
      request({ body, headers: sameOriginHeaders() }),
    );

    expect(response.status).toBe(400);
    expect(identityToolkit.signInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects an oversized password before it can reach a hasher', async () => {
    const response = await POST(
      validRequest({ password: 'a'.repeat(MAX_PASSWORD_LENGTH + 1) }),
    );

    expect(response.status).toBe(400);
    expect(identityToolkit.signInWithPassword).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before touching the provider', async () => {
    const response = await POST(validRequest({ email: 'not-an-email' }));

    expect(response.status).toBe(400);
    expect(identityToolkit.signInWithPassword).not.toHaveBeenCalled();
  });

  it('trims the email before sending it upstream', async () => {
    givenVerifiedAccount();

    await POST(validRequest({ email: `  ${VALID_EMAIL}  ` }));

    expect(identityToolkit.signInWithPassword).toHaveBeenCalledWith({
      email: VALID_EMAIL,
      password: SENTINEL_PASSWORD,
    });
  });
});

describe('POST /api/auth/login — successful sign-in', () => {
  it('mints a server session cookie for a verified account', async () => {
    givenVerifiedAccount();

    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'success' });
  });

  it('sends the cookie httpOnly, lax, path-scoped, and capped at 24 hours', async () => {
    givenVerifiedAccount();

    const setCookie =
      (await POST(validRequest())).headers.get('set-cookie') ?? '';

    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=session-cookie`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    // Asserted literally so widening the session lifetime is a visible failure.
    expect(SESSION_MAX_AGE_SECONDS).toBe(86_400);
  });

  it('marks the cookie Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    givenVerifiedAccount();

    expect((await POST(validRequest())).headers.get('set-cookie')).toContain(
      'Secure',
    );
  });

  it('omits Secure outside production so a plain-HTTP local run still signs in', async () => {
    givenVerifiedAccount();

    expect(
      (await POST(validRequest())).headers.get('set-cookie'),
    ).not.toContain('Secure');
  });

  it('verifies the upstream token before minting anything from it', async () => {
    givenVerifiedAccount();

    await POST(validRequest());

    expect(firebaseAdminAuth.verifyIdToken).toHaveBeenCalledWith(
      'upstream-id-token',
    );
  });
});

describe('POST /api/auth/login — credential failures', () => {
  it.each([
    ['an unknown address', AUTH_ERROR.invalidCredentials],
    ['a wrong password', AUTH_ERROR.invalidCredentials],
  ])('rejects %s with the generic code', async (_name, error) => {
    givenUpstreamSignIn({ status: 'failed', error });

    const response = await POST(validRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: AUTH_ERROR.invalidCredentials,
    });
  });

  it('returns a byte-identical response for a wrong password and an unknown address', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const wrongPassword = await snapshot(await POST(validRequest()));

    resetRateLimitsForTests();

    const unknownEmail = await snapshot(
      await POST(validRequest({ email: 'nobody@example.com' })),
    );

    expect(wrongPassword).toEqual(unknownEmail);
  });

  it('never sets a session cookie on a credential failure', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const response = await POST(validRequest());

    expect(response.headers.get('set-cookie')).toBeNull();
    expect(firebaseAdminAuth.createSessionCookie).not.toHaveBeenCalled();
  });

  it('reports a provider outage as service unavailable, not as a bad password', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.serviceUnavailable,
    });

    expect((await POST(validRequest())).status).toBe(503);
  });

  it('falls back to the generic code when the admin SDK throws', async () => {
    givenUpstreamSignIn({
      status: 'ok',
      idToken: 'upstream-id-token',
      localId: 'uid-1',
    });
    firebaseAdminAuth.verifyIdToken.mockRejectedValue(new Error('boom'));

    const response = await POST(validRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: AUTH_ERROR.invalidCredentials,
    });
  });

  it('rejects a stale auth_time even when the credential was correct', async () => {
    givenUpstreamSignIn({
      status: 'ok',
      idToken: 'upstream-id-token',
      localId: 'uid-1',
    });
    firebaseAdminAuth.verifyIdToken.mockResolvedValue({
      auth_time: Math.floor(Date.now() / 1000) - 3600,
      email_verified: true,
    });

    expect((await POST(validRequest())).status).toBe(401);
    expect(firebaseAdminAuth.createSessionCookie).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login — address verification', () => {
  it.each([
    ['an explicitly unverified address', false],
    ['a missing verification claim', undefined],
  ])('signs in an account with %s', async (_name, emailVerified) => {
    // Address verification is out of scope: signup signs the new account
    // straight in, so requiring a verified address here would lock out every
    // account the moment it was created.
    givenUpstreamSignIn({
      status: 'ok',
      idToken: 'upstream-id-token',
      localId: 'uid-1',
    });
    firebaseAdminAuth.verifyIdToken.mockResolvedValue({
      auth_time: Math.floor(Date.now() / 1000),
      ...(emailVerified === undefined ? {} : { email_verified: emailVerified }),
    });
    firebaseAdminAuth.createSessionCookie.mockResolvedValue('session-cookie');

    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(SESSION_COOKIE_NAME);
  });

  it('still refuses a wrong password on an unverified account', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const response = await POST(validRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: AUTH_ERROR.invalidCredentials,
    });
    expect(firebaseAdminAuth.createSessionCookie).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login — throttling', () => {
  type Attempt = { ip: string; email: string };

  /**
   * Runs attempts strictly one after another. `Promise.all` would race the
   * shared counter and make the boundary assertion flaky, and a `for` loop
   * with `await` inside is what `no-await-in-loop` exists to prevent, so the
   * sequencing is expressed as a promise chain instead.
   */
  function runInSequence(attempts: readonly Attempt[]) {
    return attempts.reduce<Promise<Response[]>>(
      async (previous, { ip, email }) => {
        const responses = await previous;
        const response = await POST(
          validRequest({ email }, { 'x-forwarded-for': ip }),
        );

        return [...responses, response];
      },
      Promise.resolve([]),
    );
  }

  function statusesOf(responses: readonly Response[]) {
    return responses.map((response) => response.status);
  }

  function attemptsOverLimit(
    limit: number,
    build: (index: number) => Attempt,
  ): Attempt[] {
    return Array.from({ length: limit + 1 }, (_unused, index) => build(index));
  }

  it('returns 429 once the per-address attempt budget is spent', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const statuses = statusesOf(
      await runInSequence(
        attemptsOverLimit(LOGIN_RULES.perIp.limit, (index) => ({
          ip: '203.0.113.7',
          email: `s${index}@example.com`,
        })),
      ),
    );

    expect(statuses.slice(0, LOGIN_RULES.perIp.limit)).not.toContain(429);
    expect(statuses.at(-1)).toBe(429);
  });

  it('returns 429 for one account guessed from rotating addresses', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const statuses = statusesOf(
      await runInSequence(
        attemptsOverLimit(LOGIN_RULES.perEmail.limit, (index) => ({
          ip: `198.51.100.${index}`,
          email: VALID_EMAIL,
        })),
      ),
    );

    expect(statuses.at(-1)).toBe(429);
    // Proof the account bucket fired and not the address bucket: every attempt
    // used a distinct IP, so each IP bucket still sits at one.
    expect(identityToolkit.signInWithPassword).toHaveBeenCalledTimes(
      LOGIN_RULES.perEmail.limit,
    );
  });

  it('cannot be sidestepped by changing the casing of the address', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const variants = [
      VALID_EMAIL,
      VALID_EMAIL.toUpperCase(),
      `  ${VALID_EMAIL}  `,
      'Shopper@Example.com',
      'SHOPPER@example.com',
      VALID_EMAIL,
    ];

    const statuses = statusesOf(
      await runInSequence(
        attemptsOverLimit(LOGIN_RULES.perEmail.limit, (index) => ({
          ip: `198.51.100.${index}`,
          email: variants[index] ?? VALID_EMAIL,
        })),
      ),
    );

    expect(statuses.at(-1)).toBe(429);
  });

  it('tells the caller how long to wait', async () => {
    givenUpstreamSignIn({
      status: 'failed',
      error: AUTH_ERROR.invalidCredentials,
    });

    const responses = await runInSequence(
      attemptsOverLimit(LOGIN_RULES.perIp.limit, (index) => ({
        ip: '203.0.113.9',
        email: `s${index}@example.com`,
      })),
    );
    const last = responses.at(-1)!;

    expect(last.status).toBe(429);
    expect(Number(last.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('POST /api/auth/login — leakage', () => {
  const failures = [
    [
      'a credential failure',
      { status: 'failed', error: AUTH_ERROR.invalidCredentials },
    ],
    [
      'a provider outage',
      { status: 'failed', error: AUTH_ERROR.serviceUnavailable },
    ],
    [
      'upstream throttling',
      { status: 'failed', error: AUTH_ERROR.tooManyRequests },
    ],
  ] as const;

  it.each(failures)(
    'never puts the password in the body or headers on %s',
    async (_name, upstream) => {
      givenUpstreamSignIn(upstream);

      const response = await POST(validRequest());
      const serialised = `${await response.text()}|${[...response.headers]
        .flat()
        .join('|')}`;

      expect(serialised).not.toContain(SENTINEL_PASSWORD);
      expect(serialised).not.toContain(VALID_EMAIL);
    },
  );

  it('never puts the password in the body or headers on success', async () => {
    givenVerifiedAccount();

    const response = await POST(validRequest());
    const serialised = `${await response.text()}|${[...response.headers]
      .flat()
      .join('|')}`;

    expect(serialised).not.toContain(SENTINEL_PASSWORD);
  });

  it.each(failures)(
    'never writes the password to the console on %s',
    async (_name, upstream) => {
      const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const spies = levels.map((level) =>
        vi.spyOn(console, level).mockImplementation(() => {}),
      );

      givenUpstreamSignIn(upstream);
      await POST(validRequest());

      const written = spies
        .flatMap((spy) => spy.mock.calls.flat())
        .map((value) =>
          typeof value === 'string' ? value : JSON.stringify(value),
        )
        .join('|');

      expect(written).not.toContain(SENTINEL_PASSWORD);
      expect(written).not.toContain(VALID_EMAIL);
    },
  );

  it.each([
    ['success', () => givenVerifiedAccount()],
    [
      'a credential failure',
      () =>
        givenUpstreamSignIn({
          status: 'failed',
          error: AUTH_ERROR.invalidCredentials,
        }),
    ],
  ])('sends Cache-Control no-store on %s', async (_name, arrange) => {
    arrange();

    const response = await POST(validRequest());

    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
