import { departmentIdForName } from '@/lib/departments';
import type { ProductDetail } from '@/lib/product-detail';

/**
 * The breadcrumb trail, as data, so the visible `<nav>` and the
 * `BreadcrumbList` JSON-LD are built from one source and cannot disagree.
 *
 * ## `href` is present only where a real URL exists
 *
 * That rule has not changed. What changed is which levels have one.
 *
 * `/categories` and `/c/[slug]` are both live routes now — `/c/apparel-accessories`
 * answers 200 with 107 published products behind it — so **Home, All categories
 * and the L1 department are linked**, and the JSON-LD built from this same trail
 * picks them up with no further change, exactly as this comment used to predict.
 *
 * This file previously said "`/c/[category]` and `/categories` do not exist as
 * routes". That was true when it was written and stopped being true when the
 * department page shipped, which is why the breadcrumb rendered three dead
 * spans on a live page for as long as it did. A doc comment asserting a fact
 * about another module is a claim with an expiry date.
 *
 * ## What still is not a link, and why
 *
 * The deeper levels. `categoryPath` is a **display string** ("Apparel &
 * Accessories > Clothing > Pants"): it carries no slug for any ancestor, and
 * only the leaf category has an id — a CJ mirror code, not a route segment.
 * `/c/clothing` and `/c/pants` were both verified to answer **404**, because
 * only the 21 L1 departments are routable.
 *
 * So a deeper link would have to be guessed, and a guessed `ListItem.item` is
 * precisely the fabricated structured-data field the code rules forbid — it
 * risks a manual action against the whole domain, not one wrong link. Those
 * levels render as text and are omitted from the JSON-LD rather than pointed at
 * a 404.
 *
 * ## Only the first segment is eligible, and it is a lookup
 *
 * `departmentIdForName` resolves a name against the 21-department list — the same
 * list every other browse surface uses, so there is no second slug
 * implementation to drift. It is applied to the **first** middle segment alone,
 * because that is the only position an L1 department can occupy; a deeper
 * segment that happened to share a department's name would be a different
 * category, and linking it would send a buyer somewhere the product is not.
 *
 * A name that resolves to nothing renders as text. That is what keeps a
 * CJ-mirrored product — whose entire supplier path sits in one segment — off a
 * route that would 404.
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
 * `Home` → `All categories` → the category trail → the product.
 *
 * `All categories` sits between them so this matches `CategoryBreadcrumb`, which
 * the department page has always rendered. Two breadcrumbs over one hierarchy
 * disagreeing about its shape is the kind of small inconsistency a buyer reads
 * as two different sites.
 *
 * Falls back to `categoryName`, then the raw `category` code, when no
 * `categoryPath` arrives. That fallback is left eligible for the department
 * lookup on purpose — it costs nothing, and the allow-list is what decides.
 *
 * `Home` is `/`. It was the market's own home for the day the per-country
 * shopfronts existed, because `/` was then a dispatcher that re-resolved the
 * destination and could have walked a buyer out of the shopfront they were
 * standing in — and put a cross-market URL into the JSON-LD built from this
 * same trail.
 */
export function breadcrumbTrail(detail: ProductDetail): BreadcrumbEntry[] {
  const middle =
    detail.categoryPath !== undefined &&
    pathSegments(detail.categoryPath).length > 0
      ? pathSegments(detail.categoryPath)
      : [detail.categoryName ?? detail.category];

  return [
    { name: 'Home', href: '/' },
    { name: 'All categories', href: '/categories' },
    ...middle.map((name, index) => {
      // First segment only — see the note above.
      const departmentId = index === 0 ? departmentIdForName(name) : undefined;

      return departmentId === undefined
        ? { name }
        : { name, href: `/c/${departmentId}` };
    }),
    { name: detail.title },
  ];
}
