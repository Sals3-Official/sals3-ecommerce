import { afterEach, describe, expect, it, vi } from 'vitest';
import signInWithGoogleSession from './firebase-google-login';

const auth = {};

const firebaseAuthMocks = vi.hoisted(() => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

const firebaseClientMocks = vi.hoisted(() => ({
  getFirebaseAuth: vi.fn<() => Promise<object>>(),
}));

vi.mock('firebase/auth', () => firebaseAuthMocks);

vi.mock('./firebase-client', () => ({
  default: firebaseClientMocks.getFirebaseAuth,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('signInWithGoogleSession', () => {
  it('exchanges a Google ID token for a server cookie and clears Firebase client state', async () => {
    const getIdToken = vi.fn().mockResolvedValue('id-token');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'x'.repeat(43) }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    firebaseClientMocks.getFirebaseAuth.mockResolvedValue(auth);
    firebaseAuthMocks.signInWithPopup.mockResolvedValue({
      user: { getIdToken },
    });
    firebaseAuthMocks.signOut.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);

    await signInWithGoogleSession();

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
      cache: 'no-store',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          idToken: 'id-token',
          csrfToken: 'x'.repeat(43),
        }),
      }),
    );
    expect(firebaseAuthMocks.signOut).toHaveBeenCalledWith(auth);
  });

  it('clears Firebase client state when session exchange fails after Google sign-in', async () => {
    firebaseClientMocks.getFirebaseAuth.mockResolvedValue(auth);
    firebaseAuthMocks.signInWithPopup.mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('id-token') },
    });
    firebaseAuthMocks.signOut.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ csrfToken: 'x'.repeat(43) }), {
          status: 500,
        }),
      ),
    );

    await expect(signInWithGoogleSession()).rejects.toMatchObject({
      code: 'auth/csrf-unavailable',
    });
    expect(firebaseAuthMocks.signOut).toHaveBeenCalledWith(auth);
  });

  it('labels server session exchange failures after the CSRF token is ready', async () => {
    firebaseClientMocks.getFirebaseAuth.mockResolvedValue(auth);
    firebaseAuthMocks.signInWithPopup.mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('id-token') },
    });
    firebaseAuthMocks.signOut.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ csrfToken: 'x'.repeat(43) }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 401 })),
    );

    await expect(signInWithGoogleSession()).rejects.toMatchObject({
      code: 'auth/server-session-unavailable',
    });
    expect(firebaseAuthMocks.signOut).toHaveBeenCalledWith(auth);
  });
});
