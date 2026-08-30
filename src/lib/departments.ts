import {
  categories as TAXONOMY_DEPARTMENTS,
  type Category,
} from '@/lib/home-placeholder-data';

const DEPARTMENT_IDS = new Set(
  TAXONOMY_DEPARTMENTS.map((department) => department.id),
);

/** Display name to `/c/[slug]` segment, from the one department list. */
const DEPARTMENT_ID_BY_NAME = new Map(
  TAXONOMY_DEPARTMENTS.map((department) => [department.name, department.id]),
);

export function isDepartmentId(id: string): boolean {
  return DEPARTMENT_IDS.has(id);
}

/**
 * The `id` — which is the `/c/[slug]` segment — for a department's display name.
 *
 * Built from the same `TAXONOMY_DEPARTMENTS` list as `isDepartmentId`, so a
 * taxonomy change moves both directions in one commit or neither. That is the
 * whole reason this lives here rather than being a slugifier at the call site:
 * `sals3-portal`'s `slugBaseFromTitle` is the forward direction on its side and
 * its own doc says no expression inverts it, so a second slug implementation
 * over here would be a drift generator rather than a shortcut.
 *
 * ## Why this is a lookup and not a guess
 *
 * It doubles as the allow-list for turning a breadcrumb *name* into a link (code
 * rule 33). A name that is not one of the 21 departments returns `undefined` and
 * the caller renders text — which is what keeps a CJ-mirrored product, whose
 * whole supplier path sits in one segment, from being pointed at a route that
 * would 404.
 */
export function departmentIdForName(name: string): string | undefined {
  return DEPARTMENT_ID_BY_NAME.get(name.trim());
}

/**
 * The department list to browse by, from a feed response we do not fully
 * trust.
 *
 * Every browse surface speaks one vocabulary — the taxonomy's 21 main
 * categories. A feed response is used only if it speaks that vocabulary too;
 * anything else is treated as stale and replaced by the taxonomy list. That
 * is not cosmetic: the portal shipped leaf categories ("Aquarium Lighting",
 * "Rangefinders") until the rollup deployed, and a storefront that renders
 * whatever arrives shows buyers a different set of categories per deploy
 * order of two repositories.
 *
 * A genuinely new department therefore needs one line added to
 * `home-placeholder-data.ts` — the same commit discipline the producer's own
 * `SALS3_TAXONOMY_DEPARTMENTS` whitelist has, and the reason a taxonomy
 * replacement is a deliberate change on both sides rather than a surprise on
 * the home page.
 */
export function departmentsOrTaxonomy(
  feedCategories: Category[] | null,
): Category[] {
  if (feedCategories === null || feedCategories.length === 0) {
    return [...TAXONOMY_DEPARTMENTS];
  }

  const speaksDepartments = feedCategories.every((category) =>
    isDepartmentId(category.id),
  );

  return speaksDepartments ? feedCategories : [...TAXONOMY_DEPARTMENTS];
}

export default TAXONOMY_DEPARTMENTS;
