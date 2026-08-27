import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MARKET,
  MARKET_SEGMENTS,
  destinationCodeToMarket,
  isMarketSegment,
  marketCanCheckOut,
  marketDestination,
  marketHref,
  marketToDestinationCode,
} from './markets';

/**
 * `marketHref` is the only place a market segment is put in front of a path, so
 * it is the one function that can put a market-less link on the site. A
 * market-less shopping link does not 404 — `next.config.ts` redirects it to
 * `/au` — which means the failure it guards against is silent by construction
 * and has to be caught here rather than in the browser.
 */
describe('marketHref', () => {
  it('puts the market in front of a shopping path', () => {
    expect(marketHref('au', '/p/air-cooler')).toBe('/au/p/air-cooler');
    expect(marketHref('ph', '/c/electronics')).toBe('/ph/c/electronics');
    expect(marketHref('fj', '/cart')).toBe('/fj/cart');
  });

  it('turns the site root into the market home, with no trailing slash', () => {
    expect(marketHref('au', '/')).toBe('/au');
    expect(marketHref('ph', '/')).toBe('/ph');
  });

  it('accepts a path with no leading slash', () => {
    expect(marketHref('au', 'categories')).toBe('/au/categories');
  });

  /*
    Query strings arrive already built by `categoryHref` and `searchHref`, which
    know about list state and deliberately nothing about markets. The prefix is
    applied to their output, so it has to survive one.
  */
  it('keeps a query string intact', () => {
    expect(marketHref('ph', '/search?q=lamp&page=2')).toBe(
      '/ph/search?q=lamp&page=2',
    );
    expect(marketHref('au', '/c/electronics?view=list')).toBe(
      '/au/c/electronics?view=list',
    );
  });
});

describe('market segments', () => {
  it('recognises exactly the published markets', () => {
    MARKET_SEGMENTS.forEach((segment) => {
      expect(isMarketSegment(segment)).toBe(true);
    });

    expect(isMarketSegment('us')).toBe(false);
    expect(isMarketSegment('AU')).toBe(false);
    expect(isMarketSegment('')).toBe(false);
  });

  it('maps a segment to its ISO destination code and back', () => {
    expect(marketToDestinationCode('au')).toBe('AU');
    expect(destinationCodeToMarket('AU')).toBe('au');
  });

  /*
    The two lists are deliberately different sizes: `US` is somewhere an order
    can be priced, not somewhere Sals3 puts a shopfront. `undefined` is what
    the `/` dispatcher and the market switcher both branch on.
  */
  it('answers undefined for a destination with no shopfront', () => {
    expect(destinationCodeToMarket('US')).toBeUndefined();
    expect(destinationCodeToMarket('GLOBAL')).toBeUndefined();
  });

  it('has a destination behind every market', () => {
    MARKET_SEGMENTS.forEach((segment) => {
      expect(marketDestination(segment).code).toBe(
        marketToDestinationCode(segment),
      );
    });
  });

  /*
    The gap this feature exists to show: `fj` is a published shopfront that
    cannot take an order. If this ever flips silently, `/fj`'s notice would
    disappear with it.
  */
  it('knows Fiji is published but cannot be ordered to', () => {
    expect(marketCanCheckOut('au')).toBe(true);
    expect(marketCanCheckOut('ph')).toBe(true);
    expect(marketCanCheckOut('fj')).toBe(false);
  });

  it('defaults to a market that actually exists', () => {
    expect(isMarketSegment(DEFAULT_MARKET)).toBe(true);
  });
});
