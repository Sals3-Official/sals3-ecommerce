import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategorySectionSkeleton from './CategorySectionSkeleton';

describe('CategorySectionSkeleton', () => {
  it('renders a full page of tiles at the real tile geometry so the layout does not shift on swap', () => {
    const { container } = render(<CategorySectionSkeleton />);

    const iconPlaceholders = container.querySelectorAll(
      '.h-14.w-14.rounded-xl',
    );

    expect(iconPlaceholders).toHaveLength(12);
  });

  it('is hidden from assistive tech — it carries no information of its own', () => {
    const { container } = render(<CategorySectionSkeleton />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('matches the carousel track so it swaps in place, not above or below it', () => {
    const { container } = render(<CategorySectionSkeleton />);

    expect(container.querySelector('[aria-busy="true"]')).toHaveClass(
      'grid',
      'grid-cols-3',
      'grid-rows-4',
      'md:grid-cols-6',
      'md:grid-rows-2',
      'rounded-xl',
      'border-border',
    );
  });
});
