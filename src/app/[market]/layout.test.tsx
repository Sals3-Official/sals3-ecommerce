import { describe, expect, it, vi } from 'vitest';

import { MARKET_SEGMENTS } from '@/lib/destination/markets';
import MarketLayout, { generateMetadata, generateStaticParams } from './layout';

/*
  `notFound()` throws in the app — that is how it unwinds to the boundary — so
  the stand-in throws too. A mock that returned quietly would let a layout that
  had stopped rejecting bad segments still pass this file.
*/
class NotFoundError extends Error {}

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundError('NEXT_NOT_FOUND');
  },
}));

function render(market: string) {
  return MarketLayout({
    children: 'shopfront',
    params: Promise.resolve({ market }),
  });
}

describe('market layout', () => {
  it('renders each published market', async () => {
    await Promise.all(
      MARKET_SEGMENTS.map(async (market) => {
        await expect(render(market)).resolves.toBe('shopfront');
      }),
    );
  });

  /*
    The whole reason the check lives in the layout rather than in a middleware
    rewrite: an unrecognised segment must be a **404, not a redirect to
    Australia**. A redirect would make `/xx/p/123` and `/au/p/123` both work,
    turning every typo into an Australian page and handing a crawler an
    unbounded set of URLs that all serve the same content.
  */
  it('404s an unknown market segment rather than falling back to a market', async () => {
    await expect(render('xx')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('404s a destination code that has no shopfront of its own', async () => {
    // `US` is priced and is a valid destination; it is not a market.
    await expect(render('us')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('404s a segment that only differs in case', async () => {
    // The segment is lower case and the ISO code is upper; `/AU` is neither.
    await expect(render('AU')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('pre-declares every market and nothing else', () => {
    expect(generateStaticParams()).toEqual(
      MARKET_SEGMENTS.map((market) => ({ market })),
    );
  });

  /*
    `getSiteUrl()` answers `undefined` while `NEXT_PUBLIC_SITE_URL` is unset,
    which is still true in production. A canonical is then omitted rather than
    guessed from a hard-coded domain — the rule this layout must not break when
    it gained a per-market canonical.
  */
  it('omits the canonical and the alternates when the site URL is unset', async () => {
    /*
      Deleted rather than stubbed with `''`: `getSiteUrl()` returns exactly what
      the variable holds, and this layout branches on `undefined`. Stubbing an
      empty string would exercise a different branch and quietly assert nothing
      about the case that is live in production today.
    */
    const original = process.env.NEXT_PUBLIC_SITE_URL;

    delete process.env.NEXT_PUBLIC_SITE_URL;

    try {
      await expect(
        generateMetadata({ params: Promise.resolve({ market: 'au' }) }),
      ).resolves.toEqual({});
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = original;
      }
    }
  });

  it('gives each market a self-referential canonical and the full hreflang set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sals3.example');

    const metadata = await generateMetadata({
      params: Promise.resolve({ market: 'ph' }),
    });

    expect(metadata.alternates?.canonical).toBe('https://sals3.example/ph');
    expect(metadata.alternates?.languages).toMatchObject({
      'en-AU': 'https://sals3.example/au',
      'en-PH': 'https://sals3.example/ph',
      'en-FJ': 'https://sals3.example/fj',
      'x-default': 'https://sals3.example/au',
    });

    vi.unstubAllEnvs();
  });
});
