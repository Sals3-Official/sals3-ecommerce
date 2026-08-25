import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProductDescriptionBlock } from '@/lib/product-detail';
import DescriptionBlockList from './DescriptionBlockList';

/**
 * The seller's emphasis, on the page.
 *
 * The portal has stored `runs` on a paragraph since the designed layout
 * shipped; this renderer had no way to use them, so every bold and italic a
 * seller applied arrived and was flattened. Same silent-drop shape as the
 * `image` block before it: authored in the Portal, dropped here, no error
 * anywhere.
 */
function paragraph(
  text: string,
  runs?: { text: string; marks?: ('strong' | 'em')[] }[],
): ProductDescriptionBlock {
  return runs === undefined
    ? { type: 'paragraph', text }
    : { type: 'paragraph', text, runs };
}

describe('DescriptionBlockList', () => {
  it('renders a plain paragraph unchanged', () => {
    render(<DescriptionBlockList blocks={[paragraph('Soft cotton twill.')]} />);

    expect(screen.getByText('Soft cotton twill.')).toBeInTheDocument();
  });

  it('renders the emphasis a seller applied inside a paragraph', () => {
    render(
      <DescriptionBlockList
        blocks={[
          paragraph('Machine washable at 30°C.', [
            { text: 'Machine washable' },
            { text: ' at 30°C.', marks: ['strong'] },
          ]),
        ]}
      />,
    );

    const strong = screen.getByText('at 30°C.', { exact: false });

    // An element, not a font weight: a screen reader should hear the emphasis
    // the seller wrote.
    expect(strong.closest('strong')).not.toBeNull();
  });

  it('nests both marks when a run carries them together', () => {
    render(
      <DescriptionBlockList
        blocks={[
          paragraph('Limited run.', [
            { text: 'Limited run.', marks: ['strong', 'em'] },
          ]),
        ]}
      />,
    );

    const node = screen.getByText('Limited run.');

    expect(node.closest('em')).not.toBeNull();
    expect(node.closest('strong')).not.toBeNull();
  });

  it('falls back to the stored text when the runs do not join to it', () => {
    // A payload from an older deployment, or one that drifted. Rendering the
    // runs anyway would put different words on the page than the ones stored,
    // which is worse than losing the emphasis.
    render(
      <DescriptionBlockList
        blocks={[
          paragraph('The canonical sentence.', [
            { text: 'Something else entirely.', marks: ['strong'] },
          ]),
        ]}
      />,
    );

    expect(screen.getByText('The canonical sentence.')).toBeInTheDocument();
    expect(screen.queryByText('Something else entirely.')).toBeNull();
  });

  it('keeps the line breaks a seller typed inside one paragraph', () => {
    // The portal keeps single newlines inside a paragraph on purpose — "a
    // heading line, then one line per feature" — so a features list arrives
    // here as one block with a newline in it. HTML collapses those to spaces
    // unless the element says otherwise, which is how a features list rendered
    // as one
    // run-on line while a size chart on the same page came out right (that one
    // is written with blank lines, so it becomes separate blocks).
    //
    // Asserted on the class rather than on rendered layout: jsdom does not
    // compute `white-space`, so there is no measurable line box to read here.
    render(
      <DescriptionBlockList
        blocks={[
          paragraph('Product details\nMaterial: viscose fibre\nColours: black'),
        ]}
      />,
    );

    const p = screen.getByText(/Product details/).closest('p');

    expect(p).not.toBeNull();
    expect(p?.className).toContain('whitespace-pre-line');
    // `pre-line`, never `pre-wrap`: runs of spaces still collapse, so an
    // accidental double space or a leading indent is not published as typed.
    expect(p?.className).not.toContain('whitespace-pre-wrap');
  });

  it('keeps blank-line separation as separate paragraphs, not one block', () => {
    // The existing behaviour this must not disturb: a blank line already
    // becomes its own block in the portal, and the list's `gap-4.5` is what
    // spaces them. If those collapsed into one element the fix above would
    // have produced double spacing instead.
    render(
      <DescriptionBlockList
        blocks={[paragraph('First size.'), paragraph('Second size.')]}
      />,
    );

    expect(screen.getByText('First size.').closest('p')).not.toBe(
      screen.getByText('Second size.').closest('p'),
    );
  });

  it('renders the paragraph when the run list is empty', () => {
    render(<DescriptionBlockList blocks={[paragraph('No marks here.', [])]} />);

    expect(screen.getByText('No marks here.')).toBeInTheDocument();
  });
});
