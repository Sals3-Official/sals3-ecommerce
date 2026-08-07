import { afterEach, describe, expect, it, vi } from 'vitest';
import getCsrfToken, { CSRF_UNAVAILABLE_CODE } from './auth-csrf-client';
import { getAuthFlowErrorCode } from './auth-flow-error';

const TOKEN = 'x'.repeat(43);
const FAILURE = 'Unable to start secure sign-in.';

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCsrfToken', () => {
  it('requests an uncached token and returns it', async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ csrfToken: TOKEN }), { status: 200 }),
    );

    await expect(getCsrfToken(FAILURE)).resolves.toBe(TOKEN);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/csrf', {
      cache: 'no-store',
    });
  });

  it('rejects with the caller wording and a stable code when the endpoint fails', async () => {
    stubFetch(new Response('', { status: 500 }));

    await expect(getCsrfToken(FAILURE)).rejects.toThrow(FAILURE);
  });

  it('tags every failure with the csrf-unavailable code', async () => {
    stubFetch(new Response('', { status: 500 }));

    const error = await getCsrfToken(FAILURE).catch(
      (thrown: unknown) => thrown,
    );

    expect(getAuthFlowErrorCode(error)).toBe(CSRF_UNAVAILABLE_CODE);
  });

  it('rejects a response with no token rather than submitting an empty one', async () => {
    stubFetch(new Response(JSON.stringify({}), { status: 200 }));

    await expect(getCsrfToken(FAILURE)).rejects.toThrow(FAILURE);
  });

  it('rejects a truncated token that could never match the cookie', async () => {
    stubFetch(
      new Response(JSON.stringify({ csrfToken: 'short' }), { status: 200 }),
    );

    await expect(getCsrfToken(FAILURE)).rejects.toThrow(FAILURE);
  });
});
