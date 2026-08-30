import { Fragment } from 'react';
import Link from 'next/link';

type CategoryBreadcrumbProps = {
  categoryName: string;
  /**
   * The levels above this one, nearest-last, so a buyer can climb out of a
   * category below a department.
   *
   * Empty for a department: its parents are Home and All categories, which this
   * already renders. An ancestor with no `slug` renders as text — the producer
   * omits one it cannot address, and a guessed link would 404.
   */
  ancestors?: { name: string; slug?: string }[];
};

/** Every link here is real — `/categories` and `/c/[slug]` both exist — so
 * this can safely pair with `BreadcrumbList` JSON-LD.
 *
 * The PDP's breadcrumb now shares that shape: `product-breadcrumb.ts` links
 * Home, `All categories` and the L1 department, and leaves the levels below it as
 * text because only departments are routable. This note used to say only `Home`
 * was linkable over there, which stopped being true the day this route shipped.
 *
 * Home is `/`. It was the market's own home for the day the markets existed,
 * because `/` was then a dispatcher that re-resolved the destination and could
 * walk the buyer out of the shopfront they were standing in. */
export default function CategoryBreadcrumb({
  categoryName,
  ancestors = [],
}: CategoryBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-xs text-ink-subtle">
        <li>
          <Link href="/" className="text-brand-600">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/categories" className="text-brand-600">
            All categories
          </Link>
        </li>
        {ancestors.map((ancestor) => (
          <Fragment key={`${ancestor.name}-${ancestor.slug ?? 'text'}`}>
            <li aria-hidden="true">/</li>
            <li>
              {ancestor.slug === undefined ? (
                ancestor.name
              ) : (
                <Link href={`/c/${ancestor.slug}`} className="text-brand-600">
                  {ancestor.name}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink">
          {categoryName}
        </li>
      </ol>
    </nav>
  );
}
