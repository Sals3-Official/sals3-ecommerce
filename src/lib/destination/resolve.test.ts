import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = { get: vi.fn() };
const headerStore = { get: vi.fn() };

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
  headers: () => Promise.resolve(headerStore),
}));

const { resolveDestination, DESTINATION_COOKIE_NAME } =
  await import('./resolve');

/**
 * The precedence that keeps a market page from contradicting itself.
 *
 * The case in `agrees with the market` is a **regression test for a real
 * defect**, found in a browser on 2026-08-27 and not by any test: a first-time
 * visitor on `/au` was shown "Ship to: Somewhere else" — the URL saying
 * Australia and the header saying it was not, on one screen.
 *
 * Nothing could have caught it before, and that is the part worth keeping.
 * `resolveDestination` had no idea a market existed and `[market]` had no idea
 * a destination existed, so **each half was correct in isolation and the
 * contradiction lived in the gap between them.** A test can only see it once
 * one half is handed the other, which is exactly what the fix does.
 */
describe('resolveDestination', () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
    headerStore.get.mockReset();
    cookieStore.get.mockReturnValue(undefined);
    headerStore.get.mockReturnValue(null);
  });

  it('agrees with the market when the buyer has chosen nothing', async () => {
    const result = await resolveDestination('AU');

    expect(result.destination.code).toBe('AU');
    expect(result.source).toBe('suggested');
  });

  it("lets the buyer's own choice outrank the market they are browsing", async () => {
    // Being in a market is not consent to ship there. Someone who picked
    // "Somewhere else" keeps it on /au, and the cart tells them what it means.
    cookieStore.get.mockImplementation((name: string) =>
      name === DESTINATION_COOKIE_NAME ? { value: 'GLOBAL' } : undefined,
    );

    const result = await resolveDestination('AU');

    expect(result.destination.isGlobal).toBe(true);
    expect(result.source).toBe('chosen');
  });

  it('ignores geo once a market is in play', async () => {
    // Geo's job is choosing a market at `/`. By the time a market page renders
    // it has done that job, and a second bite would let an IP override the
    // segment the buyer can see in the address bar.
    headerStore.get.mockReturnValue('PH');

    const result = await resolveDestination('AU');

    expect(result.destination.code).toBe('AU');
  });

  it('still uses geo where there is no market, as the account routes have none', async () => {
    headerStore.get.mockReturnValue('PH');

    const result = await resolveDestination();

    expect(result.destination.code).toBe('PH');
    expect(result.source).toBe('suggested');
  });

  it('falls back to Global when nothing is known', async () => {
    const result = await resolveDestination();

    expect(result.destination.isGlobal).toBe(true);
    expect(result.source).toBe('default');
  });
});
