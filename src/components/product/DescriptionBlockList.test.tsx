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

  it('renders the paragraph when the run list is empty', () => {
    render(<DescriptionBlockList blocks={[paragraph('No marks here.', [])]} />);

    expect(screen.getByText('No marks here.')).toBeInTheDocument();
  });
});
