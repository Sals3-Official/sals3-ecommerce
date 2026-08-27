import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchIndicativeRate, resetRateMemoForTests } from './rates';

/**
 * Every case here is a way to be handed a wrong number, and the answer to all
 * of them is the same: `null`, so the page shows no local price.
 *
 * ## These fixtures are the API's real shape, and the first version was not
 *
 * The first draft of this module read a `rates` **object** and these tests
 * passed — because the mocks were written from the same wrong assumption as the
 * code. `/v2/rate/{base}/{quote}` actually returns a **scalar** `rate` with a
 * `quote` field, so **the module would have returned `null` on every real call
 * and no test would have noticed.** Caught only by calling the live API during
 * a pre-merge check.
 *
 * The shapes below are copied from real responses observed 2026-08-28:
 *
 * - `USD/AUD?providers=RBA` → `200 {"date":"2026-08-27","base":"USD","quote":"AUD","rate":1.3922}`
 * - `USD/XYZ` → `422 {"status":422,"message":"invalid currency: XYZ"}`
 * - `USD/FJD?providers=RBA` → `404 {"status":404,"message":"not found"}`
 *
 * The lesson worth keeping: a mock you wrote from your own reading of the docs
 * tests your reading, not the integration.
 */

const NOW = new Date('2026-08-28T10:00:00Z');

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

/** A real 200 body, as the live API returns it. */
function rateBody(quote: string, rate: number, date = '2026-08-27') {
  return { date, base: 'USD', quote, rate };
}

describe('fetchIndicativeRate', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // A failure in one case must not silence the next one.
    resetRateMemoForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the scalar rate the API actually returns', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(rateBody('FJD', 2.2148)));

    await expect(fetchIndicativeRate('FJD', NOW)).resolves.toEqual({
      currency: 'FJD',
      rate: 2.2148,
      asOf: '2026-08-27',
    });
  });

  it.each([
    ['AUD', 'RBA'],
    ['PHP', 'BSP'],
    ['FJD', 'RBF'],
  ] as const)('pins %s to %s, its own central bank', async (currency, bank) => {
    // Every currency, not just one: the number a buyer sees should be the one
    // their own central bank published, and a single-currency assertion left
    // the other two pinned nowhere but the live contract test.
    vi.mocked(fetch).mockResolvedValue(jsonResponse(rateBody(currency, 1.5)));

    await fetchIndicativeRate(currency, NOW);

    const url = String(vi.mocked(fetch).mock.calls[0][0]);

    expect(url).toContain(`/rate/USD/${currency}`);
    expect(url).toContain(`providers=${bank}`);
  });

  it('refuses a rate dated one day beyond the stale window', async () => {
    // The boundary, which the 33-days-in-the-future case could not pin.
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(rateBody('AUD', 1.3922, '2026-08-20')),
    );

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('refuses a body quoting a different currency than the one asked for', async () => {
    // A rate can never be attributed to the wrong currency by a redirect, a
    // cache collision, or a change to how the path is built.
    vi.mocked(fetch).mockResolvedValue(jsonResponse(rateBody('AUD', 1.3922)));

    await expect(fetchIndicativeRate('FJD', NOW)).resolves.toBeNull();
  });

  it('refuses the 422 an unknown currency really returns', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 422, message: 'invalid currency: XYZ' }, false),
    );

    await expect(fetchIndicativeRate('FJD', NOW)).resolves.toBeNull();
  });

  it('refuses the 404 a provider that does not publish it really returns', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 404, message: 'not found' }, false),
    );

    await expect(fetchIndicativeRate('FJD', NOW)).resolves.toBeNull();
  });

  it('refuses a zero rate rather than pricing everything at nothing', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(rateBody('AUD', 0)));

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('refuses a rate published more than a week ago', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(rateBody('AUD', 1.3922, '2026-08-15')),
    );

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('accepts a rate a few days old, because banks do not publish at weekends', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(rateBody('AUD', 1.3922, '2026-08-24')),
    );

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.not.toBeNull();
  });

  it('refuses a date in the future', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(rateBody('AUD', 1.3922, '2026-09-30')),
    );

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('refuses a body with no rate at all', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ date: '2026-08-27', base: 'USD', quote: 'AUD' }),
    );

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('refuses a malformed body instead of throwing', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse('not an object'));

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('survives a network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNRESET'));

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.toBeNull();
  });

  it('remembers a failure instead of asking again on every render', async () => {
    /*
      The reason this memo exists. `next: { revalidate }` caches responses and
      Next writes that cache only for a 200, so without this every render during
      an outage would issue a live request and wait for it — on a page with no
      loading boundary, which makes it time-to-first-byte for every visitor.
    */
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 404, message: 'not found' }, false),
    );

    await fetchIndicativeRate('FJD', NOW);
    await fetchIndicativeRate('FJD', NOW);
    await fetchIndicativeRate('FJD', NOW);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('tries again once the failure memo expires', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 404, message: 'not found' }, false),
    );
    await fetchIndicativeRate('FJD', NOW);

    vi.mocked(fetch).mockResolvedValue(jsonResponse(rateBody('FJD', 2.2148)));
    const later = new Date(NOW.getTime() + 6 * 60 * 1000);

    await expect(fetchIndicativeRate('FJD', later)).resolves.not.toBeNull();
  });

  it('keeps one currency failure from silencing another', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 404, message: 'not found' }, false),
    );
    await fetchIndicativeRate('FJD', NOW);

    vi.mocked(fetch).mockResolvedValue(jsonResponse(rateBody('AUD', 1.3922)));

    await expect(fetchIndicativeRate('AUD', NOW)).resolves.not.toBeNull();
  });
});
