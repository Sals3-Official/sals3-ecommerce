import { afterEach, describe, expect, it, vi } from 'vitest';
import logoutServerSession from './logout-session';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('logoutServerSession', () => {
  it('gets a CSRF token and clears the server session', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'x'.repeat(43) }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    await logoutServerSession();

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
      cache: 'no-store',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/session',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'x-sals3-csrf': 'x'.repeat(43) },
        cache: 'no-store',
      }),
    );
  });

  it('rejects missing CSRF responses before touching the session endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(logoutServerSession()).rejects.toThrow(/secure sign-out/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
