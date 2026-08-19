import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import getFirebaseAdminAuth from './firebase-admin';
import { SESSION_COOKIE_NAME } from './session-cookies';
import { getBuyerSession, getRevocationCheckedBuyerSession } from './dal';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('./firebase-admin', () => ({
  default: vi.fn(),
}));

const mockedCookies = vi.mocked(cookies);
const mockedGetFirebaseAdminAuth = vi.mocked(getFirebaseAdminAuth);
const verifySessionCookie = vi.fn();

function seedCookie(value?: string) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && value ? { name, value } : undefined,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

/** Each reader is asserted against the same table; only `checkRevoked` differs. */
const READERS = [
  ['getBuyerSession', getBuyerSession, false],
  ['getRevocationCheckedBuyerSession', getRevocationCheckedBuyerSession, true],
] as const;

describe('auth dal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetFirebaseAdminAuth.mockReturnValue({
      verifySessionCookie,
    } as unknown as ReturnType<typeof getFirebaseAdminAuth>);
  });

  describe.each(READERS)('%s', (_name, readSession, expectedCheckRevoked) => {
    it('returns the uid for a valid session cookie', async () => {
      seedCookie('session-cookie-value');
      verifySessionCookie.mockResolvedValue({ uid: 'buyer-123' });

      await expect(readSession()).resolves.toEqual({ uid: 'buyer-123' });
      expect(verifySessionCookie).toHaveBeenCalledWith(
        'session-cookie-value',
        expectedCheckRevoked,
      );
    });

    /* `/checkout/success` compares this against the Stripe session's buyer. */
    it('carries the verified email through when the token has one', async () => {
      seedCookie('session-cookie-value');
      verifySessionCookie.mockResolvedValue({
        uid: 'buyer-123',
        email: 'buyer@example.com',
      });

      await expect(readSession()).resolves.toEqual({
        uid: 'buyer-123',
        email: 'buyer@example.com',
      });
    });

    it('never reaches Firebase when no session cookie is present', async () => {
      seedCookie();

      await expect(readSession()).resolves.toBeNull();
      expect(mockedGetFirebaseAdminAuth).not.toHaveBeenCalled();
    });

    it('fails closed when the cookie is rejected', async () => {
      seedCookie('tampered-cookie');
      verifySessionCookie.mockRejectedValue(new Error('invalid session'));

      await expect(readSession()).resolves.toBeNull();
    });

    it('fails closed when Firebase Admin is not configured', async () => {
      seedCookie('session-cookie-value');
      mockedGetFirebaseAdminAuth.mockImplementation(() => {
        throw new Error('Firebase Admin configuration is missing.');
      });

      await expect(readSession()).resolves.toBeNull();
    });
  });
});
