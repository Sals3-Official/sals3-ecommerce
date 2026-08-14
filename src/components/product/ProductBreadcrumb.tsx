import Link from 'next/link';
import type { BreadcrumbEntry } from '@/lib/product-breadcrumb';

type ProductBreadcrumbProps = {
  trail: BreadcrumbEntry[];
};

/**
 * The breadcrumb as a real `<nav><ol>` rather than the plain `<p>` of slashes it
 * replaced — so a crawler and a screen reader both read it as a hierarchy, which
 * is half the point of shipping `BreadcrumbList` alongside it.
 *
 * Entries without an `href` render as text, not as dead links. See
 * `product-breadcrumb.ts` for why that is almost all of them.
 */
export default function ProductBreadcrumb({ trail }: ProductBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-subtle">
        {trail.map((entry, index) => {
          const last = index === trail.length - 1;
          // The cumulative path, not the array index: unique per level, stable
          // across renders, and it does not rely on position the way an index
          // key does.
          const key = trail
            .slice(0, index + 1)
            .map((step) => step.name)
            .join(' / ');

          return (
            <li key={key} className="flex items-center">
              {index > 0 ? (
                <span aria-hidden="true" className="mr-1.5 text-ink-faint">
                  /
                </span>
              ) : null}
              {entry.href === undefined ? (
                <span
                  className={last ? 'text-ink' : undefined}
                  aria-current={last ? 'page' : undefined}
                >
                  {entry.name}
                </span>
              ) : (
                <Link href={entry.href} className="hover:underline">
                  {entry.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
