import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findDestination } from '@/lib/destination/destinations';
import type { ResolvedDestination } from '@/lib/destination/resolve';
import RootPage from './page';

const redirect = vi.hoisted(() => vi.fn());
const resolveDestination = vi.hoisted(() =>
  vi.fn<() => Promise<ResolvedDestination>>(),
);

vi.mock('next/navigation', () => ({ redirect }));

/*
  `resolveDestination` reads `cookies()` and `headers()`, and jsdom has no
  request. Mocking it keeps these assertions about the dispatch rule rather than
  about cookie reading, which `resolve.ts` owns and tests itself.
*/
vi.mock('@/lib/destination/resolve', () => ({ resolveDestination }));

function resolvesTo(code: string, source: ResolvedDestination['source']) {
  resolveDestination.mockResolvedValue({
    destination: findDestination(code),
    source,
  });
}

beforeEach(() => {
  redirect.mockClear();
  resolveDestination.mockReset();
});

/**
 * The bare `/` is a dispatcher, not a page: exactly one URL per market, and
 * which market a person belongs on is a function of who is asking.
 */
describe('/ dispatcher', () => {
  it('sends a returning buyer to the market they chose', async () => {
    resolvesTo('PH', 'chosen');

    await RootPage();

    expect(redirect).toHaveBeenCalledWith('/ph');
  });

  /*
    ADR-003 §1: geo-IP is a suggestion, not a decision. It reaches this route
    only through `resolveDestination`, which applies a stored choice first — so
    a `suggested` answer here already means the buyer had chosen nothing.
  */
  it('follows a geo suggestion when the buyer has chosen nothing', async () => {
    resolvesTo('FJ', 'suggested');

    await RootPage();

    expect(redirect).toHaveBeenCalledWith('/fj');
  });

  /*
    A destination with no shopfront of its own falls to the default market
    rather than 404ing: the buyer picked somewhere to send an order, not a
    storefront, and the two lists are deliberately different sizes.
  */
  it('falls back to the default market for a destination with no shopfront', async () => {
    resolvesTo('US', 'chosen');

    await RootPage();

    expect(redirect).toHaveBeenCalledWith('/au');
  });

  it('falls back to the default market for Global', async () => {
    resolvesTo('GLOBAL', 'default');

    await RootPage();

    expect(redirect).toHaveBeenCalledWith('/au');
  });

  /*
    A redirect, not a render. Serving `/au`'s content here would create a second
    address for the same page — the duplicate the market layout's `hreflang` set
    exists to prevent, reintroduced at the root.
  */
  it('redirects rather than rendering a market at the root', async () => {
    resolvesTo('AU', 'chosen');

    await expect(RootPage()).resolves.toBeUndefined();
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
