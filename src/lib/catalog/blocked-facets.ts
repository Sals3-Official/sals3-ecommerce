/**
 * Facets the sidebar deliberately does not offer, with the real reason why —
 * shown in `BlockedFacetsNote` so the absence reads as a decision, not a bug.
 *
 * `Buyer rating` belongs here rather than as a real filter: `ratingLine` is
 * deprecated on the wire (see `services/storefront/schemas.ts`) and no
 * product on the storefront carries a rating today. A "4 stars & up" control
 * with nothing behind it would be a fabricated claim, the same category of
 * defect ADR-003 already forbids for price and delivery.
 */
export type BlockedFacet = { name: string; reason: string };

export const BLOCKED_FACETS: readonly BlockedFacet[] = [
  {
    name: 'Buyer rating',
    reason:
      'Sals3 has no reviews yet — no product on the storefront carries a rating.',
  },
  {
    name: 'Brand',
    reason:
      "The card feed carries no brand yet — it lives only in a product's supplier specs, not on the catalogue record shown here.",
  },
  {
    name: 'Ships from',
    reason:
      'Origin is resolved per package when delivery is quoted at checkout, not on the catalogue record. There is nothing to filter on before then.',
  },
  {
    name: 'Discount',
    reason:
      'No comparison price is published, so a percentage off would have to be derived from the current price — the one number it cannot honestly come from.',
  },
];
