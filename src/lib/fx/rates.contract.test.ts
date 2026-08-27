import { describe, expect, it } from 'vitest';
import { fetchIndicativeRate } from './rates';

/**
 * One test that calls the real API, because the mocked ones could not have
 * caught what went wrong.
 *
 * The first version of `rates.ts` parsed a `rates` object. Every unit test
 * passed, because the fixtures were written from the same misreading as the
 * code — **the module would have returned `null` on every real call and the
 * suite would have stayed green.** A mock written from your own reading of the
 * docs tests your reading, not the integration.
 *
 * So this asserts the one thing a fixture cannot: that the shape we parse is
 * the shape the API sends.
 *
 * ## Why it is allowed to skip
 *
 * It reaches the network, and a test that fails on a CI runner with no egress —
 * or when someone else's service has a bad afternoon — teaches the team to
 * ignore red. It **skips** when the call cannot be made, and **fails** when the
 * call succeeds and the shape is wrong. That is the only case it exists for.
 *
 * `FJD` deliberately: it is the currency no ECB-backed source carries, so it is
 * the one most likely to disappear if Frankfurter's provider aggregation
 * changes. If the local price silently vanishes on `/fj` one day, this is the
 * test that says why.
 */
describe('Frankfurter contract', () => {
  it(
    'still returns the shape this module parses',
    { timeout: 15_000 },
    async ({ skip }) => {
      let live: Awaited<ReturnType<typeof fetchIndicativeRate>> | 'unreachable';

      try {
        live = await fetchIndicativeRate('FJD');
      } catch {
        live = 'unreachable';
      }

      if (live === 'unreachable') {
        skip('Frankfurter unreachable from this environment.');
        return;
      }

      // `null` here means reachable but unusable — a changed shape, a dropped
      // currency, or a stale publication. All three are exactly what this test
      // is for, so it is a failure rather than a skip.
      expect(
        live,
        'Frankfurter answered but no usable FJD rate came back — the response shape, the RBF provider, or the publication date has changed.',
      ).not.toBeNull();

      expect(live?.currency).toBe('FJD');
      expect(live?.rate).toBeGreaterThan(0);
      expect(live?.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    },
  );
});
