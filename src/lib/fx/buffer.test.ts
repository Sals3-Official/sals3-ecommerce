import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fetchFxBuffer, { resetFxBufferMemoForTests } from './buffer';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const NOW = new Date('2026-08-28T10:00:00.000Z');

function laterBy(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

const HOUR = 60 * 60 * 1000;

describe('fetchFxBuffer', () => {
  beforeEach(() => {
    resetFxBufferMemoForTests();
    vi.stubEnv('SALS3_PORTAL_URL', 'http://portal.test');
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reads the percent the Portal serves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          buffer: { bufferPercent: 1.5, policyVersion: 2, policyId: 'p1' },
        }),
      ),
    );

    expect(await fetchFxBuffer(NOW)).toBe(1.5);
  });

  it('sends the shared bearer token, because the endpoint refuses without it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ buffer: null }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchFxBuffer(NOW);

    const [url, init] = fetchMock.mock.calls[0];

    expect(String(url)).toBe('http://portal.test/api/storefront/fx-buffer');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('treats a served null as "no buffer", not as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ buffer: null })),
    );

    expect(await fetchFxBuffer(NOW)).toBeNull();
  });

  it('forgets the last good value when the Portal says there is none', async () => {
    // The distinction the grace window exists for: deactivating a buffer in
    // Market Rules must stop buffering at once, not age out over six hours.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          buffer: { bufferPercent: 1.5, policyVersion: 2, policyId: 'p1' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ buffer: null }))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchFxBuffer(NOW)).toBe(1.5);
    expect(await fetchFxBuffer(NOW)).toBeNull();
    expect(await fetchFxBuffer(NOW)).toBeNull();
  });

  it('keeps serving the last good buffer through a Portal outage', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          buffer: { bufferPercent: 1.5, policyVersion: 2, policyId: 'p1' },
        }),
      )
      .mockResolvedValue(jsonResponse({ error: 'nope' }, false, 503));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchFxBuffer(NOW)).toBe(1.5);
    // A database blip must not take every local price off the site.
    expect(await fetchFxBuffer(laterBy(HOUR))).toBe(1.5);
  });

  it('stops serving it once the outage outlives the grace window', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          buffer: { bufferPercent: 1.5, policyVersion: 2, policyId: 'p1' },
        }),
      )
      .mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await fetchFxBuffer(NOW);

    expect(await fetchFxBuffer(laterBy(7 * HOUR))).toBeNull();
  });

  it('returns null on a failure it has no good value behind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await fetchFxBuffer(NOW)).toBeNull();
  });

  it.each([
    ['an order-of-magnitude fat finger', 150],
    ['a negative far past any real rebate', -50],
    ['a non-numeric value', 'high'],
  ])('refuses %s rather than rendering it', async (_label, bufferPercent) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ buffer: { bufferPercent } })),
    );

    // The Portal checks the same band; this is the boundary's own second
    // opinion, because a consumer that renders a number to a buyer on the
    // grounds that "the server already checked" is trusting a server it does
    // not deploy.
    expect(await fetchFxBuffer(NOW)).toBeNull();
  });

  it('returns null on a body that is not the shape it expects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse('not an object')),
    );

    expect(await fetchFxBuffer(NOW)).toBeNull();
  });
});
