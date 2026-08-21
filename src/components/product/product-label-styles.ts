/**
 * The product page's option label — 13.5px, sentence case, body face.
 *
 * Four elements share it: each named option axis ("Colour", "Size"), the
 * unnamed-tier "Choose an option" heading, and the evidence ledger's "What we
 * know". They are the same label doing the same job in the same panel, so they
 * live in one string rather than four copies. Four copies is how the portal's
 * two Variant Matrix forms drifted apart until one of them had reorder arrows
 * and the other did not.
 *
 * ## How this treatment was chosen
 *
 * The owner reported the label twice. The first report read as a font-family
 * complaint and was answered as one — the labels went from Plus Jakarta Sans
 * 700 to Outfit 600, which measured correctly on production and was still
 * wrong to look at. **The family was never the problem.** An 11px label in
 * caps with `0.08em` of tracking is thin and small in any face, and the chosen
 * value sat against it in sentence case, so one short line carried two
 * different letter cases and read as a mistake before it read as information.
 *
 * The second round put seven treatments side by side at real size in the real
 * faces, and the owner picked this one: no caps, no tracking, 13.5px, the body
 * face, the axis name in muted ink and the chosen value in full-strength ink
 * beside it. It reads as a sentence — question on the left, answer on the right
 * — which is also how the marketplaces this catalogue competes with set the
 * same row.
 *
 * ## What this deviates from
 *
 * `PDP_REDESIGN_V3_1_BUILD_SPEC.md` puts Outfit in the display role and Plus
 * Jakarta Sans in the body role, and the `.dc.html` prototype sets this label
 * at `11px / 700 / 0.08em / uppercase` in the body face. The face here is back
 * to the spec's choice; **the size and the case are not**, and the prototype
 * has no equivalent of the chosen value riding on the label line at all.
 *
 * That is deliberate, decided by the owner against the rendered page rather
 * than the document. The next agent to reconcile the code against the spec
 * must not put the caps back.
 *
 * One weight utility per element on purpose: two of them in the same cascade
 * layer let Tailwind's own property order pick the winner instead of the
 * author, which is how `font-bold` silently lost to `font-medium` on this page
 * during the v3.1 build.
 */
export const PRODUCT_MICRO_LABEL = 'text-[13.5px] font-medium text-ink-muted';

/**
 * The chosen value riding on the end of an axis label ("Colour: Pink").
 *
 * Family and size are inherited from the label, so this carries only the two
 * things that make it the answer rather than the question: full weight and
 * full-strength ink. The separating colon belongs to the label's own text
 * rather than to this class, because a label with nothing chosen yet must not
 * render a dangling colon.
 */
export const PRODUCT_MICRO_LABEL_VALUE = 'font-bold text-ink';
