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
    Two of the three steps ADR-003 §1 sets can still happen. The third — the
    buyer choosing — lost its control on 2026-08-28 when the owner removed the
    `Ship to` picker along with the market shopfronts.

    The stored choice is still read and still wins, and that is deliberate: the
    cookie is already in real browsers with a year to run, so a buyer who chose
    the Philippines on 2026-08-27 keeps it instead of silently losing it. What is
    gone is the ability to make a new choice before checkout.
  */
  it('keeps a stored choice over a geo hint that disagrees', async () => {
    cookieStore.get.mockImplementation((name: string) =>
      name === DESTINATION_COOKIE_NAME ? { value: 'PH' } : undefined,
    );
    headerStore.get.mockReturnValue('AU');

    await expect(resolveDestination()).resolves.toMatchObject({ code: 'PH' });
  });

  it('uses geo when there is no stored choice', async () => {
    headerStore.get.mockReturnValue('PH');

    await expect(resolveDestination()).resolves.toMatchObject({ code: 'PH' });
  });

  /*
    Every visitor with no geo header now lands here — `x-vercel-ip-country` is
    absent locally and on any non-Vercel host, and nothing writes the cookie any
    more. Global is the honest answer to an unknown location, and it is what the
    cart's cannot-ship notice speaks to.
  */
  it('falls back to Global when nothing is known', async () => {
    await expect(resolveDestination()).resolves.toMatchObject({
      isGlobal: true,
    });
  });

  it('ignores a stored value that is not a destination we price', async () => {
    cookieStore.get.mockImplementation((name: string) =>
      name === DESTINATION_COOKIE_NAME ? { value: 'ZZ' } : undefined,
    );

    await expect(resolveDestination()).resolves.toMatchObject({
      isGlobal: true,
    });
  });
});
