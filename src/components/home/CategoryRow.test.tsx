import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  categories as placeholderCategories,
  type Category,
} from '@/lib/home-placeholder-data';
import CategoryRow from './CategoryRow';

function category(id: string, code: string, name: string): Category {
  return { id, code, name };
}

const liveCategories: Category[] = [
  category('home-living', 'HL', 'Home and living'),
  category('fashion', 'FA', 'Fashion'),
  category('bags', 'BG', 'Bags'),
  category('footwear', 'FW', 'Footwear'),
];

describe('CategoryRow', () => {
  it('renders an SVG icon for a mapped category id, not its code initials', () => {
    render(<CategoryRow categories={[liveCategories[0]!]} />);

    const link = screen.getByRole('link', { name: /Home and living/ });

    expect(link.querySelector('svg')).toBeInTheDocument();
    expect(link).not.toHaveTextContent('HL');
  });

  it('falls back to the real feed code when the category id has no icon', () => {
    render(
      <CategoryRow
        categories={[category('pet-supplies', 'PS', 'Pet supplies')]}
      />,
    );

    const link = screen.getByRole('link', { name: /Pet supplies/ });

    expect(link.querySelector('svg')).not.toBeInTheDocument();
    expect(link).toHaveTextContent('PS');
  });

  it('lets the label wrap to 2 lines instead of clipping a real CJ category name', () => {
    render(
      <CategoryRow
        categories={[
          category(
            'outdoor-camping-gear',
            'OC',
            'Outdoor Camping and Hiking Gear',
          ),
        ]}
      />,
    );

    const label = screen.getByText('Outdoor Camping and Hiking Gear');

    expect(label).toHaveClass('text-pretty', 'max-w-[90px]');
    expect(label.className).not.toMatch(/truncate/);
  });

  it('keeps the label regular weight and quiet neutral', () => {
    render(<CategoryRow categories={[liveCategories[1]!]} />);

    const label = screen.getByText('Fashion');

    expect(label).toHaveClass('text-[11.5px]', 'text-ink-muted');
    expect(label.className).not.toMatch(/font-bold|font-semibold/);
  });

  it('keeps the brand colour off the tile — navigation, not an action (spec §11.4)', () => {
    render(<CategoryRow categories={[liveCategories[0]!]} />);

    const iconHolder = screen.getByRole('link').querySelector('span');

    expect(iconHolder?.className).not.toMatch(/brand-600/);
    expect(iconHolder).toHaveClass('bg-surface-sunken', 'text-ink-muted');
  });

  it('hides the native scrollbar on the scroll track', () => {
    const { container } = render(<CategoryRow categories={liveCategories} />);

    expect(container.querySelector('.no-scrollbar')).toBeInTheDocument();
  });

  it('caps the row at 10 categories (spec section 15.1)', () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    render(<CategoryRow categories={many} />);

    expect(screen.getAllByRole('link')).toHaveLength(10);
  });

  it('renders nothing when the live feed returns no categories', () => {
    const { container } = render(<CategoryRow categories={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders no scroll or chevron controls — the grid has no overflow at md+', () => {
    render(<CategoryRow categories={liveCategories} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('exposes the row as a labelled navigation region', () => {
    render(<CategoryRow categories={liveCategories} />);

    expect(screen.getByRole('navigation')).toHaveAccessibleName('Categories');
  });

  it('renders the real fallback catalogue from home-placeholder-data.ts (9 categories)', () => {
    render(<CategoryRow categories={placeholderCategories} />);

    expect(screen.getAllByRole('link')).toHaveLength(
      placeholderCategories.length,
    );
    expect(screen.getByRole('link', { name: /Home & Living/ })).toHaveAttribute(
      'href',
      '/c/home-living',
    );
  });
});
