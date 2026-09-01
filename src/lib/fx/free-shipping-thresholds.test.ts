import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fetchFreeShippingThresholds, {
  resetFreeShippingThresholdsMemoForTests,
} from './free-shipping-thresholds';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const NOW = new Date('2026-09-01T10:00:00.000Z');

function laterBy(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

const HOUR = 60 * 60 * 1000;

describe('fetchFreeShippingThresholds', () => {
  beforeEach(() => {
    resetFreeShippingThresholdsMemoForTests();
    vi.stubEnv('SALS3_PORTAL_URL', 'http://portal.test');
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reads the thresholds the Portal serves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          thresholds: { AU: 2500, PH: 1200, FJ: 5500 },
          currency: 'USD',
        }),
      ),
    );

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({
      AU: 2500,
      PH: 1200,
      FJ: 5500,
    });
  });

  it('sends the shared bearer token, because the endpoint refuses without it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ thresholds: {}, currency: 'USD' }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchFreeShippingThresholds(NOW);

    const [url, init] = fetchMock.mock.calls[0];

    expect(String(url)).toBe('http://portal.test/api/storefront/free-shipping');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('drops a country the Portal did not send, rather than fabricating one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          thresholds: { AU: 2500 },
          currency: 'USD',
        }),
      ),
    );

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({ AU: 2500 });
  });

  it('drops a country outside the checkout-ready set, even if the Portal sent it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          thresholds: { AU: 2500, NZ: 3000 },
          currency: 'USD',
        }),
      ),
    );

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({ AU: 2500 });
  });

  it.each([
    ['a fat-fingered high value', 999_999],
    ['a non-positive value', 0],
  ])('refuses %s rather than rendering it', async (_label, amountMinor) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          thresholds: { AU: amountMinor, PH: 1200, FJ: 5500 },
          currency: 'USD',
        }),
      ),
    );

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({
      PH: 1200,
      FJ: 5500,
    });
  });

  it('keeps serving the last good thresholds through a Portal outage', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ thresholds: { AU: 2500 }, currency: 'USD' }),
      )
      .mockResolvedValue(jsonResponse({ error: 'nope' }, false, 503));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({ AU: 2500 });
    // A database blip must not blank the nudge across the whole site.
    expect(await fetchFreeShippingThresholds(laterBy(HOUR))).toEqual({
      AU: 2500,
    });
  });

  it('stops serving it once the outage outlives the grace window', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ thresholds: { AU: 2500 }, currency: 'USD' }),
      )
      .mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await fetchFreeShippingThresholds(NOW);

    expect(await fetchFreeShippingThresholds(laterBy(7 * HOUR))).toEqual({});
  });

  it('returns {} on a failure it has no good value behind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({});
  });

  it('returns {} on a body that is not the shape it expects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse('not an object')),
    );

    expect(await fetchFreeShippingThresholds(NOW)).toEqual({});
  });
});
