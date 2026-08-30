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

/**
 * The two-column fact table shared by Product specifications and Supplier
 * details — the `dl` and one row of it.
 *
 * Exported rather than written twice because the requirement is that the two
 * tables **match**, and two copies of a class string is how they stop matching.
 * They were identical by coincidence until 2026-08-31 and still rendered at
 * different column widths, which is the other half of this note.
 *
 * ## `auto-fill`, never `auto-fit`
 *
 * `auto-fit` removes tracks with nothing in them and lets the survivors
 * stretch, so a table's column width ends up depending on how many facts the
 * payload happened to carry: six specification attributes filled three columns
 * at 347px, while two supplier rows collapsed the third track and stretched the
 * remaining two to 536px. Same class, same page, two visibly different tables.
 *
 * `auto-fill` keeps the empty track, so two rows sit in the first two columns
 * of three at the width every other table uses. Below `sm` both rules collapse
 * to a single column and neither applies.
 */
export const PRODUCT_FACT_GRID =
  'mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]';

/**
 * One label/value pair. `8.625rem` is the label column both tables share.
 *
 * ## No rule under the row
 *
 * There was one, and it could not be kept. The columns are filled by the
 * browser, so the last one is orphaned whenever the attribute count does not
 * divide by the column count — thirteen specifications across three columns
 * leaves `Waist Height` alone on a fifth row, with a rule under it hanging a
 * row lower than its neighbours and a third of the width. That is the line the
 * owner kept seeing.
 *
 * Every rule scheme has the same flaw somewhere, because the raggedness is in
 * the data rather than the styling: put the rule on top instead and the short
 * segment moves above the orphan; drop it only from each column's last cell and
 * the row above goes ragged instead; and no column count divides thirteen. The
 * only arrangement that cannot go ragged is the one with nothing to go ragged —
 * so the rows are separated by rhythm, and the band's own bottom border is what
 * closes the table.
 *
 * `py-3` rather than the old `py-2.5`: the rule was doing part of the
 * separating, and taking it away without giving the space back leaves the pairs
 * running together.
 */
export const PRODUCT_FACT_ROW =
  'grid grid-cols-[minmax(0,8.625rem)_minmax(0,1fr)] gap-4 py-3';
