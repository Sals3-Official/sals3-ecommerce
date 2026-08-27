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

  /*
    The `marketDestinationCode` parameter these tests used to cover was added on
    2026-08-27 and removed with the markets on 2026-08-28. It existed so a
    shopfront's own country could stand in when the buyer had chosen nothing —
    `/au` was showing a first-time visitor "Ship to: Somewhere else". With one
    storefront there is no country in the URL to disagree with, so what is left
    is the buyer's choice, then geo, then Global.
  */
  /*
    The rule everything else rests on, and the one the owner asked for in plain
    words on 2026-08-28: whatever country is selected, nothing overrides it.
    ADR-003 §1 — "Geo-IP is only a default suggestion. The user's selected
    shipping country is the browsing source of truth."
  */
  it("keeps the buyer's own choice over a geo hint that disagrees", async () => {
    cookieStore.get.mockImplementation((name: string) =>
      name === DESTINATION_COOKIE_NAME ? { value: 'PH' } : undefined,
    );
    headerStore.get.mockReturnValue('AU');

    const result = await resolveDestination();

    expect(result.destination.code).toBe('PH');
    expect(result.source).toBe('chosen');
  });

  it('uses geo when the buyer has chosen nothing', async () => {
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
