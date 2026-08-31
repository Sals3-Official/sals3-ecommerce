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
 * ## It is exactly as wide as its own content, and no wider
 *
 * Every other block in `DescriptionBlockList` is held to `max-w-[70ch]`,
 * because that is the width prose is readable at. A grid is the opposite case:
 * a six-column size chart squeezed into a column sized for sentences collapses
 * — every heading wraps onto three lines and the numbers stop lining up, which
 * is the entire property that made it worth being a table. So this component
 * does not apply the 70ch measure, exactly as `DescriptionImageRow` does not.
 *
 * It does not fill the section either, and it carries no width number of its
 * own. `w-fit max-w-full` on the wrapper with no `w-full` on the table: the
 * grid measures itself from its columns, the bordered box shrink-wraps that
 * measurement, and the whole thing stops at the section edge. A five-column
 * chart draws narrow, a nine-column chart draws wide, and neither was told a
 * pixel figure to aim for.
 *
 * A fixed cap was tried here (`max-w-[760px] mx-auto`) and removed the same
 * day. Two things were wrong with it. It is a magic number the content knows
 * nothing about, so the moment a real chart measured wider than it — the live
 * harem-pants size chart measures ~843px — the cap did not make the table
 * tidier, it just started a horizontal scrollbar on a desktop screen with
 * three hundred spare pixels beside it. And centering the box detached the
 * chart from the copy above it: every other block in the description starts at
 * the same left edge, so a centered island reads as a different document
 * rather than as part of this one. Flush-left and content-width keeps the
 * chart aligned with the paragraphs and headings it belongs to.
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
    <div className="w-fit max-w-full overflow-x-auto rounded-xl border border-border">
      <table className="border-separate border-spacing-0 text-sm">
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
