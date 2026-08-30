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
 * ## Every level is linked when the producer addresses it
 *
 * `categoryTrail` arrives with one entry per level, each carrying its own
 * `/c/[slug]` where the taxonomy can address it — owner decision 2026-08-31,
 * because a breadcrumb that shows four levels and links one is not a
 * breadcrumb. The producer resolves those addresses from the seeded taxonomy,
 * which is the only place they exist: a level's id is on its own
 * `sals3_categories` row, and no slug can be inverted back to it here.
 *
 * An entry with no `slug` renders as text. That is what keeps a CJ-mirrored
 * product — whose entire supplier path sits in one segment, never seeded — off a
 * route that would 404.
 *
 * ## The fallback is the old behaviour, deliberately kept
 *
 * A producer that predates `categoryTrail` sends `categoryPath` alone, and this
 * still links the L1 department from it by looking the name up in the
 * 21-department list. Not defensiveness: the two repositories deploy
 * independently, so there is always a window where the storefront is ahead, and
 * during it a breadcrumb should keep the one link it already had rather than
 * lose it.
 *
 * In that path only the **first** middle segment is eligible, because that is
 * the only position an L1 department can occupy — a deeper segment sharing a
 * department's name is a different category, and linking it would send a buyer
 * somewhere the product is not.
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
 * The category levels, from the producer's addresses when it sends them.
 *
 * Two sources, and the newer one wins whole rather than per-level: mixing them
 * would mean a page whose first crumb came from one contract and whose second
 * came from another, and a disagreement between them would be invisible.
 */
function categoryEntries(
  detail: ProductDetail,
  fallbackNames: string[],
): BreadcrumbEntry[] {
  const trail = detail.categoryTrail;

  if (trail !== undefined && trail.length > 0) {
    return trail.map((entry) =>
      entry.slug === undefined
        ? { name: entry.name }
        : { name: entry.name, href: `/c/${entry.slug}` },
    );
  }

  return fallbackNames.map((name, index) => {
    // First segment only — see the note above.
    const departmentId = index === 0 ? departmentIdForName(name) : undefined;

    return departmentId === undefined
      ? { name }
      : { name, href: `/c/${departmentId}` };
  });
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
    ...categoryEntries(detail, middle),
    { name: detail.title },
  ];
}
