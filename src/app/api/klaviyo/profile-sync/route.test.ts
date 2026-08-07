import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimitsForTests } from '@/lib/auth/rate-limit';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session-cookies';
import { POST } from './route';

vi.mock('server-only', () => ({}));

const firebaseAdminAuth = vi.hoisted(() => ({
  getUser: vi.fn(),
  verifySessionCookie: vi.fn(),
}));

vi.mock('@/lib/auth/firebase-admin', () => ({
  default: () => firebaseAdminAuth,
}));

const csrfToken = 'x'.repeat(43);
const routeUrl = 'http://localhost:3000/api/klaviyo/profile-sync';

function sameOriginHeaders(extra?: Record<string, string>) {
  return {
    'content-type': 'application/json',
    origin: 'http://localhost:3000',
    ...extra,
  };
}

function validBrowserContext() {
  return {
    locale: 'en-US',
    timezone: 'Asia/Manila',
    viewportWidth: 1280,
    viewportHeight: 900,
    screenWidth: 1440,
    screenHeight: 900,
    referrer: 'https://example.com',
    currentPath: '/p/air-cooler?utm_source=test',
    utm: { utm_source: 'test' },
    consentedAt: '2026-08-08T00:00:00.000Z',
  };
}

function request({
  body = { csrfToken, browserContext: validBrowserContext() },
  cookie = `${CSRF_COOKIE_NAME}=${csrfToken}; ${SESSION_COOKIE_NAME}=session-cookie`,
  headers = sameOriginHeaders(),
}: {
  body?: string | Record<string, unknown>;
  cookie?: string;
  headers?: Record<string, string>;
} = {}) {
  return new NextRequest(routeUrl, {
    method: 'POST',
    headers: {
      cookie,
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function mockSignedInUser() {
  firebaseAdminAuth.verifySessionCookie.mockResolvedValue({
    uid: 'firebase-uid-1',
    email: 'token@example.com',
  });
  firebaseAdminAuth.getUser.mockResolvedValue({
    uid: 'firebase-uid-1',
    email: 'shopper@example.com',
    emailVerified: true,
    displayName: 'AJ Shopper',
    phoneNumber: '+15005550006',
    photoURL: 'https://example.com/aj.jpg',
    providerData: [{ providerId: 'password' }],
    metadata: {
      creationTime: 'Sat, 08 Aug 2026 00:00:00 GMT',
      lastSignInTime: 'Sat, 08 Aug 2026 01:00:00 GMT',
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetRateLimitsForTests();
});

describe('POST /api/klaviyo/profile-sync', () => {
  it('rejects cross-origin requests before reading the session', async () => {
    const response = await POST(
      request({ headers: sameOriginHeaders({ origin: 'https://evil.test' }) }),
    );

    expect(response.status).toBe(403);
    expect(firebaseAdminAuth.verifySessionCookie).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and invalid browser context', async () => {
    const malformed = await POST(request({ body: '{' }));
    const invalidContext = await POST(
      request({
        body: {
          csrfToken,
          browserContext: { ...validBrowserContext(), currentPath: '' },
        },
      }),
    );

    expect(malformed.status).toBe(400);
    expect(invalidContext.status).toBe(400);
    expect(firebaseAdminAuth.verifySessionCookie).not.toHaveBeenCalled();
  });

  it('rejects a mismatched CSRF token', async () => {
    const response = await POST(
      request({
        cookie: `${CSRF_COOKIE_NAME}=wrong-token; ${SESSION_COOKIE_NAME}=session-cookie`,
      }),
    );

    expect(response.status).toBe(400);
    expect(firebaseAdminAuth.verifySessionCookie).not.toHaveBeenCalled();
  });

  it('returns signed-out when there is no session cookie', async () => {
    const response = await POST(
      request({ cookie: `${CSRF_COOKIE_NAME}=${csrfToken}` }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ status: 'signed-out' });
  });

  it('returns disabled when the private key is not configured', async () => {
    mockSignedInUser();

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'disabled',
      identify: {
        email: 'shopper@example.com',
        first_name: 'AJ',
        last_name: 'Shopper',
      },
    });
  });

  it('syncs verified Firebase profile fields to Klaviyo', async () => {
    mockSignedInUser();
    vi.stubEnv('KLAVIYO_PRIVATE_API_KEY', 'pk_test');
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null));

    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request());
    const klaviyoBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as {
      data: {
        attributes: {
          email: string;
          external_id: string;
          properties: Record<string, unknown>;
        };
      };
    };

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'synced',
      identify: { email: 'shopper@example.com' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://a.klaviyo.com/api/profile-import',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Klaviyo-API-Key pk_test',
          revision: '2026-07-15',
        }),
      }),
    );
    expect(klaviyoBody.data.attributes.email).toBe('shopper@example.com');
    expect(klaviyoBody.data.attributes.external_id).toBe('firebase-uid-1');
    expect(klaviyoBody.data.attributes.properties).toMatchObject({
      sals3_firebase_uid: 'firebase-uid-1',
      sals3_auth_providers: ['password'],
      sals3_email_verified: true,
      sals3_last_path: '/p/air-cooler?utm_source=test',
      sals3_last_utm: { utm_source: 'test' },
    });
  });

  it('does not leak Klaviyo upstream failure details', async () => {
    mockSignedInUser();
    vi.stubEnv('KLAVIYO_PRIVATE_API_KEY', 'pk_test');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response('no', { status: 403 })),
    );

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ status: 'unavailable' });
  });
});
