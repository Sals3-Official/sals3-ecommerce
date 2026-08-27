'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { marketHref } from '@/lib/destination/markets';
import useMarket from '@/lib/destination/use-market';

type MarketLinkProps = {
  /** A shopping path with no market on it, e.g. `/` or `/categories`. */
  path: string;
  className?: string;
  children: ReactNode;
};

/**
 * A shopping link for the boundaries Next renders without `params`.
 *
 * `not-found.tsx` and `error.tsx` take fixed signatures and receive no route
 * params, so a `Link` inside one cannot be given its market by the page. This
 * reads it from the client router instead — the one place `useMarket()` is not
 * a shortcut but the only route available.
 *
 * Deliberately narrow: it takes a path, not an `href`, so nothing can pass an
 * account route (`/login`, `/checkout`, `/orders`) through it by accident.
 * Those belong to a person rather than to a country and must stay unprefixed.
 */
export default function MarketLink({
  path,
  className,
  children,
}: MarketLinkProps) {
  const market = useMarket();

  return (
    <Link href={marketHref(market, path)} className={className}>
      {children}
    </Link>
  );
}
