import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryRowSkeleton from './CategoryRowSkeleton';

describe('CategoryRowSkeleton', () => {
  it('renders 10 tiles at the real tile geometry so the layout does not shift on swap', () => {
    const { container } = render(<CategoryRowSkeleton />);

    const iconPlaceholders = container.querySelectorAll(
      '.h-14.w-14.rounded-2xl',
    );

    expect(iconPlaceholders).toHaveLength(10);
  });

  it('is hidden from assistive tech — it carries no information of its own', () => {
    const { container } = render(<CategoryRowSkeleton />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('matches the band shell styling so it swaps in place, not below/above it', () => {
    const { container } = render(<CategoryRowSkeleton />);

    expect(container.firstChild).toHaveClass(
      'border-y',
      'border-border',
      'bg-white',
    );
  });
});
