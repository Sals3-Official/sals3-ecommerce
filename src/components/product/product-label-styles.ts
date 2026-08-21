/**
 * The product page's micro-label — 11px, letterspaced, uppercase.
 *
 * Three elements share it: each named option axis ("Colour", "Size"), the
 * unnamed-tier "Choose an option" heading, and the evidence ledger's "What we
 * know". They are the same label doing the same job in the same panel, so they
 * live in one string rather than three copies. Three copies is how the portal's
 * two Variant Matrix forms drifted apart, and the same class list had already
 * been pasted three times here.
 *
 * ## Why the display face
 *
 * `PDP_REDESIGN_V3_1_BUILD_SPEC.md` puts Outfit in the display role and Plus
 * Jakarta Sans in the body role, and a micro-label is body type by that reading
 * — which is what shipped, and what measured on production: Plus Jakarta Sans
 * 11px/700. The owner looked at the live page on 2026-08-22 and asked for these
 * labels to carry the PDP's display face instead, so they read as part of the
 * same type system as the title and the price directly above them rather than
 * as body text set small.
 *
 * That is a deliberate deviation from the spec, and the reason it is recorded
 * here: the next agent to reconcile the code against the spec must not quietly
 * put these back to the body face.
 *
 * Outfit at 600 rather than the old 700, because 600 is the weight the display
 * role uses everywhere else on this page (title, price, section headings). One
 * weight utility per element on purpose — two in the same cascade layer let
 * Tailwind's own property order pick the winner instead of the author.
 */
export const PRODUCT_MICRO_LABEL =
  'font-display text-[11px] font-semibold tracking-[0.08em] text-ink-subtle uppercase';

/**
 * The chosen value riding on the end of an axis label ("COLOUR Black").
 *
 * Family and weight are inherited from the label, so this only has to undo the
 * three things that mark the label as a label: the letter-spacing, the case,
 * and the subdued ink. Restating the family here would be a second declaration
 * to keep in step for no rendered difference.
 */
export const PRODUCT_MICRO_LABEL_VALUE =
  'ml-1.5 tracking-normal text-ink normal-case';
