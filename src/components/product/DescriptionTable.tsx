/* eslint-disable react/no-array-index-key -- A column is its position and a
   row is its order; neither carries an id, this table is never reordered or
   filtered, and it is re-rendered whole from one payload. Giving a cell an id
   would mean storing one in the description document the portal writes. */

import type { ProductDescriptionBlock } from '@/lib/product-detail';

type DescriptionTableBlock = Extract<
  ProductDescriptionBlock,
  { type: 'table' }
>;

type DescriptionTableProps = {
  block: DescriptionTableBlock;
};

/**
 * A seller-authored table inside a product description — a size chart, mostly.
 *
 * ## It breaks out of the reading measure, the same way an image does — but
 * not all the way to the section's own edge
 *
 * Every other block in `DescriptionBlockList` is held to `max-w-[70ch]`,
 * because that is the width prose is readable at. A grid is the opposite case:
 * a six-column size chart squeezed into a column sized for sentences collapses
 * — every heading wraps onto three lines and the numbers stop lining up, which
 * is the entire property that made it worth being a table. So this component
 * does not apply the 70ch measure, exactly as `DescriptionImageRow` does not.
 *
 * Unlike an image row, it does not simply fill the section either. An image
 * is meant to run the full section width — that is a deliberate, already-
 * correct decision this component does not touch. A table left with no cap
 * at all inherits the section's full width by default and sits flush-left
 * against the same edge the narrower 70ch text above it uses, so every pixel
 * it gains over that text column lands on the right only — it reads as
 * lopsided, not as a deliberate wide breakout. `max-w-[760px] mx-auto` caps it
 * short of the section edge and centers it, so it bulges out symmetrically on
 * both sides of the text column instead. 760px matches the portal's own
 * Description Studio canvas (`StudioCanvas.tsx`'s `IMAGE_SIZES` full-width
 * figure) — the same number the editor already treats as "as wide as this
 * content ever needs to draw," not a value invented for this one case, and
 * keeping the two repositories' numbers identical is what keeps the studio's
 * preview from quietly drifting out of sync with what a buyer actually sees.
 * The cap does not fight the horizontal scroll below: an 8-column chart still
 * scrolls inside this now-narrower, now-centered box exactly as it did in the
 * wider one.
 *
 * ## It scrolls sideways rather than squeezing
 *
 * `overflow-x-auto` on the wrapper with the table free to exceed it. On a
 * phone a six-column chart cannot fit and there are only two honest outcomes —
 * scroll it, or shrink the text until nobody can read it. The first column is
 * `sticky left-0`, so the size code stays on screen while the measurements
 * scroll past it; without that, a buyer scrolled right and lost which row they
 * were reading, which is the specific way size charts fail on phones.
 *
 * `border-separate` with zero spacing rather than `border-collapse`: a
 * collapsed border belongs to the table, not the cell, so it does not travel
 * with a sticky cell and the first column's edge disappears mid-scroll.
 *
 * There is no sticky header row, deliberately. The table has no height cap, so
 * `sticky top-0` would stick to the *viewport* and collide with the site
 * header — the editor's copy of this grid does have a capped container and
 * does stick its header there, which is where sticking has something to stick
 * within.
 *
 * ## `<caption>` is the accessible name, and it is the only one
 *
 * A heading block above the table is a sibling element, not a label, so
 * without this the table announces as an unnamed grid. It is also where the
 * seller states the units — a column of bare numbers does not say centimetres.
 * Rendered when present and omitted when not; nothing is invented for it.
 *
 * Every cell is placed by React and escapes. There is no `html` block in the
 * union and no `dangerouslySetInnerHTML` here, and there must never be — the
 * same rule the rest of this renderer keeps.
 */
export default function DescriptionTable({ block }: DescriptionTableProps) {
  return (
    <div className="mx-auto max-w-[760px] overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        {block.caption === undefined ? null : (
          <caption className="border-b border-border bg-white px-3 py-2 text-left text-xs text-ink-muted">
            {block.caption}
          </caption>
        )}
        <thead>
          <tr>
            {block.headers.map((header, index) => (
              <th
                // Index keys: a column is its position, and this table is
                // re-rendered whole from one payload, never reordered.
                key={`header-${index}`}
                scope="col"
                className={`border-b border-border bg-surface-sunken px-3 py-2 text-center font-semibold whitespace-nowrap text-ink ${
                  index === 0 ? 'sticky left-0 z-10' : ''
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => {
            // One value per row, not per cell: every cell in a row shares the
            // same top border (only the first row has none), so it is
            // computed once here rather than re-selected in each cell below.
            const rowBorder = rowIndex === 0 ? '' : 'border-t border-border';

            return (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, columnIndex) =>
                  /*
                    The first cell of a row is its name, not one of its values
                    — in a size chart it is the size, and it identifies every
                    number beside it. `<th scope="row">` is what tells a
                    screen reader that, so a cell is announced as
                    "Hips, XL, 100" rather than as a bare number in a grid.
                  */
                  columnIndex === 0 ? (
                    <th
                      key={`cell-${columnIndex}`}
                      scope="row"
                      className={`sticky left-0 z-10 bg-white px-3 py-2 text-center font-medium whitespace-nowrap text-ink ${rowBorder}`}
                    >
                      {cell}
                    </th>
                  ) : (
                    <td
                      key={`cell-${columnIndex}`}
                      className={`px-3 py-2 text-center text-ink-muted ${rowBorder}`}
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
