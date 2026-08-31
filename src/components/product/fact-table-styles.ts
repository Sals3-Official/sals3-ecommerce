/**
 * The two-column fact table shared by Product specifications and Supplier
 * details: the clip, the grid, and one row of it.
 *
 * Exported rather than written twice because the requirement is that the two
 * tables **match**, and two copies of a class string is how they stop matching.
 * They were identical by coincidence until 2026-08-31 and still rendered at
 * different column widths, which is the first note below.
 */

/**
 * `auto-fill`, never `auto-fit`.
 *
 * `auto-fit` removes tracks with nothing in them and lets the survivors
 * stretch, so a table's column width ended up depending on how many facts the
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
 * ## The rule stays, and what it costs
 *
 * These rules were deleted once, on 2026-08-31, to kill a short line under the
 * last row of a table whose attribute count does not divide by the column
 * count — thirteen specifications across three columns leaves one cell alone on
 * a fifth row, and its rule ends a third of the way across.
 *
 * That was the wrong line to chase. The one the owner was pointing at turned
 * out to be the seam between the two bands, fixed separately; deleting these
 * left both tables sparse and unbound, which is not what the approved design
 * showed. They are back at `py-2.5`, exactly as drawn.
 *
 * So the short rule under an orphaned last row is a **known, accepted**
 * artefact, not an oversight. It is worth writing down what does *not* fix it,
 * because each looks reasonable for about a minute:
 *
 * - a different column count — thirteen divides by nothing useful, and the next
 *   product carries a different number;
 * - the rule on `border-top` instead — the short segment moves above the orphan;
 * - dropping it from each column's last cell — the row above goes ragged, and
 *   `auto-fill` picks the column count from the viewport, so no `nth-child`
 *   rule can identify those cells anyway;
 * - clipping the grid's last pixel — this works, and it also swallows the
 *   closing rule of every table whose cells all sit on that pixel, which is any
 *   table with a single row of them. Supplier details is usually exactly that,
 *   so it would lose its rules entirely. Built, measured, and rejected for it.
 */
export const PRODUCT_FACT_ROW =
  'grid grid-cols-[minmax(0,8.625rem)_minmax(0,1fr)] gap-4 border-b border-border py-2.5';
