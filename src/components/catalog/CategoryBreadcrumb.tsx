import Link from 'next/link';

type CategoryBreadcrumbProps = {
  categoryName: string;
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
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink">
          {categoryName}
        </li>
      </ol>
    </nav>
  );
}
