import {
  categories as TAXONOMY_DEPARTMENTS,
  type Category,
} from '@/lib/home-placeholder-data';

const DEPARTMENT_IDS = new Set(
  TAXONOMY_DEPARTMENTS.map((department) => department.id),
);

export function isDepartmentId(id: string): boolean {
  return DEPARTMENT_IDS.has(id);
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
