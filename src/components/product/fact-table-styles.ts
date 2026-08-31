/**
 * The fact table on the product page: the grid, and one label/value row of it.
 *
 * Shared by the seller's declared specifications and the supplier's reported
 * facts, which sit in one band as two groups. Exported rather than written
 * twice because the requirement is that the two groups **match**, and two
 * copies of a class string is how they stop matching — they were identical by
 * coincidence until 2026-08-31 and still rendered at different column widths.
 */

/**
 * Two columns above `sm`, one below. A fixed count, not `auto-fill`.
 *
 * ## Why not three, and why not `auto-fill`
 *
 * It was `repeat(auto-fill, minmax(280px, 1fr))`, which gave three columns at
 * 1104px. Two things came out of that and neither was worth keeping:
 *
 * - **The values were starved.** A 347px track less a 138px label left 209px
 *   for the answer, so `Full Elastic Waistband` and `Loose / Baggy` wrapped
 *   while two thirds of the band sat empty on the short rows.
 * - **The column count moved with the viewport**, which is why no `nth-child`
 *   rule could ever reach "the last cell in each column" — the count is not a
 *   breakpoint, it is arithmetic on the width.
 *
 * Two columns give the value 400px and the label 176px, and the count is now
 * something the code knows. `auto-fit` is what it started as; that one deleted
 * empty tracks and let the survivors stretch, so a two-row supplier table came
 * out 536px wide against a six-row table's 347px. Neither belongs here again.
 *
 * ## The orphan is still real, and smaller
 *
 * The browser fills these left to right, so the last row is short whenever the
 * attribute count is odd — thirteen specifications leave one cell alone on a
 * seventh row, with a rule under it half the width of the others. Nothing
 * removes that: the count belongs to the seller, and no column count divides
 * every product. Three columns made it a third of the page; two make it a half,
 * which is the trade the owner picked on 2026-08-31 after seeing both.
 *
 * What was tried and rejected is recorded on `PRODUCT_FACT_ROW`.
 */
export const PRODUCT_FACT_GRID =
  'mt-4 grid grid-cols-1 gap-x-10 sm:grid-cols-2';

/**
 * One label/value pair. `11rem` is the label track both groups share.
 *
 * ## The rule stays, and what it costs
 *
 * These rules were deleted once, on 2026-08-31, to kill the orphan's short
 * line. That was the wrong line to chase — the one being reported was the seam
 * between two bands — and deleting them left the table sparse and unbound,
 * which is not what the approved design showed.
 *
 * So the short rule under an odd last row is a **known, accepted** artefact.
 * Worth writing down what does not fix it, because each looks reasonable for
 * about a minute:
 *
 * - a different column count — the count belongs to the seller, and the next
 *   product carries a different one;
 * - the rule on `border-top` instead — the short segment moves above the orphan;
 * - dropping it from each column's last cell — the row above goes ragged;
 * - clipping the grid's last pixel — this works, and it also swallows the
 *   closing rule of every table whose cells all sit on that pixel, which is the
 *   supplier group on most products. Built, measured, and rejected for it.
 */
export const PRODUCT_FACT_ROW =
  'grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-4 border-b border-border py-2.5';
