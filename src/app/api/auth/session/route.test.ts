import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  resetSessionPostRateLimitForTests,
} from '@/lib/auth/session-cookies';
import { DELETE, GET, POST } from './route';

const firebaseAdminAuth = vi.hoisted(() => ({
  createSessionCookie: vi.fn<(idToken: string) => Promise<string>>(),
  verifyIdToken: vi.fn<(idToken: string) => Promise<{ auth_time: number }>>(),
  verifySessionCookie: vi.fn<(sessionCookie: string) => Promise<unknown>>(),
}));

vi.mock('@/lib/auth/firebase-admin', () => ({
  default: () => firebaseAdminAuth,
}));

const csrfToken = 'x'.repeat(43);
const routeUrl = 'http://localhost:3000/api/auth/session';

function request(
  method: 'DELETE' | 'GET' | 'POST',
  init: {
    body?: string | Record<string, unknown>;
    cookie?: string;
    headers?: Record<string, string>;
  } = {},
) {
  let body: BodyInit | undefined;

  if (typeof init.body === 'string') {
    body = init.body;
  } else if (init.body) {
    body = JSON.stringify(init.body);
  }

  return new NextRequest(routeUrl, {
    method,
    headers: {
      ...(init.cookie ? { cookie: init.cookie } : {}),
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

afterEach(() => {
  vi.restoreAllMocks();
  resetSessionPostRateLimitForTests();
});

describe('/api/auth/session', () => {
  it('rejects POST requests without a same-origin Origin header', async () => {
    const response = await POST(
      request('POST', {
        body: { idToken: 'id-token', csrfToken },
        cookie: `${CSRF_COOKIE_NAME}=${csrfToken}`,
      }),
    );

    expect(response.status).toBe(403);
    expect(firebaseAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before touching Firebase Admin', async () => {
    const response = await POST(
      request('POST', {
        body: '{',
        cookie: `${CSRF_COOKIE_NAME}=${csrfToken}`,
        headers: sameOriginHeaders(),
      }),
    );

    expect(response.status).toBe(400);
    expect(firebaseAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects missing or mismatched CSRF tokens', async () => {
    const response = await POST(
      request('POST', {
        body: { idToken: 'id-token', csrfToken },
        cookie: `${CSRF_COOKIE_NAME}=wrong-token`,
        headers: sameOriginHeaders(),
      }),
    );

    expect(response.status).toBe(401);
    expect(firebaseAdminAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects stale Firebase ID tokens', async () => {
    firebaseAdminAuth.verifyIdToken.mockResolvedValue({
      auth_time: Math.floor(Date.now() / 1000) - 301,
    });

    const response = await POST(
      request('POST', {
        body: { idToken: 'id-token', csrfToken },
        cookie: `${CSRF_COOKIE_NAME}=${csrfToken}`,
        headers: sameOriginHeaders(),
      }),
    );

    expect(response.status).toBe(401);
    expect(firebaseAdminAuth.createSessionCookie).not.toHaveBeenCalled();
  });

  it('sets a secure server session cookie after a fresh verified Firebase token', async () => {
    firebaseAdminAuth.verifyIdToken.mockResolvedValue({
      auth_time: Math.floor(Date.now() / 1000),
    });
    firebaseAdminAuth.createSessionCookie.mockResolvedValue('session-cookie');

    const response = await POST(
      request('POST', {
        body: { idToken: 'id-token', csrfToken },
        cookie: `${CSRF_COOKIE_NAME}=${csrfToken}`,
        headers: sameOriginHeaders(),
      }),
    );
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=session-cookie`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Path=/');
  });

  it('returns signedIn true with the sanitized first name only when the session cookie verifies', async () => {
    firebaseAdminAuth.verifySessionCookie.mockResolvedValue({
      uid: 'user-1',
      name: 'AJ Shopper',
    });

    const response = await GET(
      request('GET', {
        cookie: `${SESSION_COOKIE_NAME}=session-cookie`,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      signedIn: true,
      firstName: 'AJ',
    });
    expect(firebaseAdminAuth.verifySessionCookie).toHaveBeenCalledWith(
      'session-cookie',
      true,
    );
  });

  it('returns signedIn false and clears an invalid session cookie', async () => {
    firebaseAdminAuth.verifySessionCookie.mockRejectedValue(
      new Error('invalid'),
    );

    const response = await GET(
      request('GET', {
        cookie: `${SESSION_COOKIE_NAME}=bad-cookie`,
      }),
    );
    const setCookie = response.headers.get('set-cookie') ?? '';

    await expect(response.json()).resolves.toEqual({ signedIn: false });
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('clears the session cookie on same-origin CSRF-protected DELETE', () => {
    const response = DELETE(
      request('DELETE', {
        cookie: `${CSRF_COOKIE_NAME}=${csrfToken}; ${SESSION_COOKIE_NAME}=session-cookie`,
        headers: sameOriginHeaders({ 'x-sals3-csrf': csrfToken }),
      }),
    );
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=0');
  });
});
