import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProductDescriptionBlock } from '@/lib/product-detail';
import DescriptionBlockList from './DescriptionBlockList';

/**
 * A seller-authored table on the product page.
 *
 * The block replaces a workaround, and the workaround is what the assertions
 * are calibrated against: a size chart used to be written as a `keyValueList`
 * with every measurement for a size joined into one comma-separated string,
 * then set as prose inside the 70ch reading measure. So the two things that
 * must be true here are that it is a real `<table>` and that it is not held to
 * that measure — a grid squeezed into a column sized for sentences is the wall
 * of text this exists to stop being.
 */

const SIZE_CHART: ProductDescriptionBlock = {
  type: 'table',
  caption: 'Body measurements in centimetres',
  headers: ['Size', 'Waist', 'Hips'],
  rows: [
    ['M', '65', '100'],
    ['L', '69', ''],
  ],
};

describe('DescriptionTable', () => {
  it('renders a real table, not a definition list', () => {
    render(<DescriptionBlockList blocks={[SIZE_CHART]} />);

    const table = screen.getByRole('table');

    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('names the table with its caption, which is its only accessible name', () => {
    // A heading block above the table is a sibling element, not a label, so
    // without this a screen reader announces an unnamed grid — and the caption
    // is also the only place the units are stated.
    render(<DescriptionBlockList blocks={[SIZE_CHART]} />);

    expect(
      screen.getByRole('table', { name: 'Body measurements in centimetres' }),
    ).toBeInTheDocument();
  });

  it('omits the caption element when the seller wrote none', () => {
    const withoutCaption: ProductDescriptionBlock = {
      type: 'table',
      headers: ['Size', 'Waist'],
      rows: [['M', '65']],
    };

    // An empty `<caption>` would be a blank strip above the table, so the
    // element is absent rather than present and empty.
    render(<DescriptionBlockList blocks={[withoutCaption]} />);

    expect(screen.getByRole('table').querySelector('caption')).toBeNull();
  });

  it("makes each row's first cell its row header, not another value", () => {
    // In a size chart the leftmost column is the size, and it names every
    // number beside it — that pairing is what a screen reader reads a grid by.
    render(<DescriptionBlockList blocks={[SIZE_CHART]} />);

    const rowHeaders = screen.getAllByRole('rowheader');

    expect(rowHeaders.map((cell) => cell.textContent)).toEqual(['M', 'L']);
  });

  it('escapes the reading measure and scrolls sideways instead of squeezing', () => {
    render(<DescriptionBlockList blocks={[SIZE_CHART]} />);

    const scroller = screen.getByRole('table').parentElement;

    // Not `max-w-[70ch]`: every other block in this list carries it and a table
    // must not, for the same reason `DescriptionImageRow` does not.
    expect(scroller?.className).not.toContain('max-w-[70ch]');
    // On a phone a six-column chart cannot fit, and there are only two honest
    // outcomes — scroll it, or shrink the text until nobody can read it.
    expect(scroller?.className).toContain('overflow-x-auto');
  });

  it('renders a blank cell as an empty cell rather than closing the gap', () => {
    render(<DescriptionBlockList blocks={[SIZE_CHART]} />);

    const rows = screen.getAllByRole('row');
    const lastRow = rows[rows.length - 1];

    // `L`'s hips are blank on purpose. Collapsing the cell would shift `69`
    // under `Hips`, which is how a buyer ends up ordering the wrong size.
    expect(within(lastRow as HTMLElement).getAllByRole('cell')).toHaveLength(2);
    expect(
      within(lastRow as HTMLElement).getAllByRole('cell')[1]?.textContent,
    ).toBe('');
  });
});
