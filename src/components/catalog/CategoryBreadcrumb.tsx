import Link from 'next/link';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';

type CategoryBreadcrumbProps = {
  categoryName: string;
  market: MarketSegment;
};

/** Every link here is real — `/categories` and `/c/[slug]` both exist — so
 * this can safely pair with `BreadcrumbList` JSON-LD, unlike the PDP's
 * breadcrumb (only `Home` is linkable there; see the PDP redesign notes).
 *
 * Home is the market's own home, not the bare `/` dispatcher: a crumb that
 * re-resolves the destination would walk the buyer out of the market they are
 * standing in. */
export default function CategoryBreadcrumb({
  categoryName,
  market,
}: CategoryBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-xs text-ink-subtle">
        <li>
          <Link href={marketHref(market, '/')} className="text-brand-600">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            href={marketHref(market, '/categories')}
            className="text-brand-600"
          >
            All categories
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink">
          {categoryName}
        </li>
      </ol>
    </nav>
  );
}
