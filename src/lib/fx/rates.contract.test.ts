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
 * ## Reachability is probed separately, and the first attempt got this wrong
 *
 * The obvious shape — call `fetchIndicativeRate` in a `try`/`catch` and skip on
 * a throw — **cannot work, and shipped broken before review caught it.**
 * `fetchIndicativeRate` collapses every failure to `null` by design and never
 * rejects, so the `catch` was dead code and the skip was unreachable. A runner
 * with no egress would have got `null` and **failed**, blocking every commit in
 * the repository for as long as somebody else's service was down. That is
 * exactly the "teaches the team to ignore red" outcome this test is supposed to
 * avoid.
 *
 * So reachability is established with a bare `fetch` that is allowed to throw,
 * *before* the module under test is called. The two outcomes are then
 * distinguishable:
 *
 * - the host cannot be reached → **skip**, this environment cannot answer;
 * - the host answered 200 but the module returns `null` → **fail**, the shape,
 *   the provider, or the publication cadence has changed.
 *
 * `FJD` deliberately: it is the currency no ECB-backed source carries, so it is
 * the one most likely to disappear if Frankfurter's provider aggregation
 * changes. If the local price silently vanishes on `/fj` one day, this is the
 * test that says why.
 */
describe('Frankfurter contract', () => {
  it(
    'still returns the shape this module parses',
    { timeout: 20_000 },
    async ({ skip }) => {
      const probe = await fetch(
        'https://api.frankfurter.dev/v2/rate/USD/FJD?providers=RBF',
        { signal: AbortSignal.timeout(10_000), cache: 'no-store' },
      ).catch(() => null);

      if (probe === null) {
        skip('Frankfurter unreachable from this environment.');
        return;
      }

      if (!probe.ok) {
        skip(`Frankfurter answered ${probe.status}; not this test's business.`);
        return;
      }

      // Reachable and answering. From here a `null` is a real contract change.
      const live = await fetchIndicativeRate('FJD');

      expect(
        live,
        'Frankfurter answered 200 but no usable FJD rate came back — the response shape, the RBF provider, or the publication date has changed.',
      ).not.toBeNull();

      expect(live?.currency).toBe('FJD');
      expect(live?.rate).toBeGreaterThan(0);
      expect(live?.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    },
  );
});
