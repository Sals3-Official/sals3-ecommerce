import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  MARKET_SEGMENTS,
  isMarketSegment,
  marketDestination,
} from '@/lib/destination/markets';
import { getSiteUrl } from '@/lib/site';

/**
 * The market shopfront shell.
 *
 * ## Why a dynamic segment rather than three folders
 *
 * `[market]` matches any string, so this layout is the gate: an unrecognised
 * segment is a **404, not a redirect to Australia**. That distinction is the
 * whole reason the check lives here. A redirect would make `/xx/p/123` and
 * `/au/p/123` both "work", which quietly turns every typo into an Australian
 * page and hands a crawler an unbounded set of URLs that all serve the same
 * content.
 *
 * ## What is NOT under here
 *
 * `/login`, `/signup`, `/checkout/*` and `/orders/*` stay at the root. They
 * belong to a person, not to a country: an order placed from `/ph` is the same
 * order when the buyer opens it later, and putting a market in its URL would
 * imply an account can be scoped to one.
 */

export function generateStaticParams() {
  return MARKET_SEGMENTS.map((market) => ({ market }));
}

/**
 * `hreflang` across the markets, from day one rather than later.
 *
 * Today `/au` and `/ph` serve the same products at the same USD prices in the
 * same language, which is precisely the duplicate-content case Google's
 * localized-versions guidance addresses. Without these, Google picks one of
 * them to index and we do not get to choose which.
 *
 * `x-default` points at Australia, matching where a bare `/` sends someone who
 * has expressed no preference. Every version lists itself and all the others,
 * because a non-reciprocal set is ignored entirely.
 *
 * The canonical is deliberately **self-referential per market**: these are
 * genuinely different pages for different buyers, not one page with alternates.
 * They are only omitted when `NEXT_PUBLIC_SITE_URL` is unset — `getSiteUrl()`
 * returns `undefined` rather than guessing a domain, which is still true in
 * production today.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market } = await params;

  if (!isMarketSegment(market)) return {};

  const siteUrl = getSiteUrl();

  if (siteUrl === undefined) return {};

  return {
    alternates: {
      canonical: `${siteUrl}/${market}`,
      languages: {
        ...Object.fromEntries(
          MARKET_SEGMENTS.map((segment) => [
            `en-${segment.toUpperCase()}`,
            `${siteUrl}/${segment}`,
          ]),
        ),
        'x-default': `${siteUrl}/au`,
      },
    },
  };
}

export default async function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;

  if (!isMarketSegment(market)) {
    notFound();
  }

  // Resolved here so an unknown segment cannot reach a page, and so adding a
  // market without a destination behind it throws at the boundary.
  marketDestination(market);

  return children;
}
