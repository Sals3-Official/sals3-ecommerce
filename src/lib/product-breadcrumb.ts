import type { ProductDetail } from '@/lib/product-detail';

/**
 * The breadcrumb trail, as data, so the visible `<nav>` and the
 * `BreadcrumbList` JSON-LD are built from one source and cannot disagree.
 *
 * ## Why almost nothing is a link
 *
 * `href` is present only where a real URL exists. Today that is Home and the
 * product itself:
 *
 * - `/c/[category]` and `/categories` do not exist as routes.
 * - `categoryPath` is a **display string** ("Apparel > Outerwear > Men's
 *   Jackets"). It carries no slug for any ancestor — only the leaf category has
 *   an id, and that id is a CJ mirror code, not a route segment.
 *
 * So an ancestor link would have to be guessed, and a guessed `ListItem.item`
 * is precisely the fabricated structured-data field the code rules forbid: it
 * risks a manual action against the whole domain, not just one wrong link.
 * Ancestors therefore render as plain text and are omitted from the JSON-LD
 * rather than pointed at a 404.
 *
 * When `/c/[category]` ships, give the leaf entry an `href` here and both the
 * nav and the schema pick it up with no further change.
 */

export type BreadcrumbEntry = {
  name: string;
  /** Absent when no real URL exists for this level — never a guess. */
  href?: string;
};

const PATH_SEPARATOR = '>';

/**
 * Splits the portal's display path. Mirrors the producer's own `categoryLeafName`
 * handling: trim every segment, drop empties, so a stray separator cannot
 * produce a blank crumb.
 */
function pathSegments(categoryPath: string): string[] {
  return categoryPath
    .split(PATH_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/**
 * `Home` → the category trail → the product.
 *
 * Falls back to `categoryName`, then the raw `category` code, when no
 * `categoryPath` arrives. For a CJ-mirrored product the path is a single
 * segment, so the real trail is three levels with one link.
 */
export function breadcrumbTrail(detail: ProductDetail): BreadcrumbEntry[] {
  const middle =
    detail.categoryPath !== undefined &&
    pathSegments(detail.categoryPath).length > 0
      ? pathSegments(detail.categoryPath)
      : [detail.categoryName ?? detail.category];

  return [
    { name: 'Home', href: '/' },
    ...middle.map((name) => ({ name })),
    { name: detail.title },
  ];
}
