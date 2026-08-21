import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  categories as placeholderCategories,
  type Category,
} from '@/lib/home-placeholder-data';
import CATEGORY_ICON_PATHS from './category-icons';
import categoryImageSrc from './category-images';
import CategorySection from './CategorySection';

/** The grid's own links, excluding the section's "See all categories". */
function tiles(): HTMLElement[] {
  return within(screen.getByRole('navigation')).getAllByRole('link');
}

function category(id: string, code: string, name: string): Category {
  return { id, code, name };
}

// The live feed's own vocabulary: main (L1) taxonomy categories.
const liveCategories: Category[] = [
  category('home-garden', 'HG', 'Home & Garden'),
  category('electronics', 'EL', 'Electronics'),
  category('luggage-bags', 'LB', 'Luggage & Bags'),
  category('furniture', 'FU', 'Furniture'),
];

describe('CategorySection', () => {
  it('heads the block with "Shop by category" and the live count', () => {
    render(<CategorySection categories={liveCategories} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Shop by category' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 categories')).toBeInTheDocument();
  });

  it('says "1 category", not "1 categories", when the feed publishes one', () => {
    render(<CategorySection categories={[liveCategories[0]!]} />);

    expect(screen.getByText('1 category')).toBeInTheDocument();
  });

  it("renders the department's photograph when there is one", () => {
    render(<CategorySection categories={[liveCategories[0]!]} />);

    const link = screen.getByRole('link', { name: /Home & Garden/ });
    const photo = link.querySelector('img');

    // Substring, not equality: this render path uses Next's default loader
    // (vitest does not read `next.config.ts`), while production goes through
    // the custom loader, which returns a local `/public` path untouched.
    expect(decodeURIComponent(photo?.getAttribute('src') ?? '')).toContain(
      '/categories/home-garden.webp',
    );
    // Decorative: the tile prints the name below it.
    expect(photo).toHaveAttribute('alt', '');
    expect(link.querySelector('svg')).not.toBeInTheDocument();
    expect(link).not.toHaveTextContent('HG');
  });

  it('falls back to the line icon for a department with no photograph yet', () => {
    render(
      <CategorySection
        categories={[category('toys-games', 'TG', 'Toys & Games')]}
      />,
    );

    const link = screen.getByRole('link', { name: /Toys & Games/ });

    expect(link.querySelector('img')).not.toBeInTheDocument();
    expect(link.querySelector('svg')).toBeInTheDocument();
    expect(link).not.toHaveTextContent('TG');
  });

  it('falls back to the real feed code when it has neither photo nor icon', () => {
    render(
      <CategorySection
        categories={[category('aquarium-lighting', 'AL', 'Aquarium Lighting')]}
      />,
    );

    const link = screen.getByRole('link', { name: /Aquarium Lighting/ });

    expect(link.querySelector('img')).not.toBeInTheDocument();
    expect(link.querySelector('svg')).not.toBeInTheDocument();
    expect(link).toHaveTextContent('AL');
  });

  it('clamps a long category name at 2 lines instead of truncating line 1', () => {
    render(
      <CategorySection
        categories={[
          category('food-beverages-tobacco', 'FB', 'Food, Beverages & Tobacco'),
        ]}
      />,
    );

    const label = screen.getByText('Food, Beverages & Tobacco');

    expect(label).toHaveClass('line-clamp-2', 'text-pretty');
    expect(label.className).not.toMatch(/truncate/);
  });

  it('keeps the brand colour off the tile — navigation, not an action (spec §11.4)', () => {
    render(<CategorySection categories={[liveCategories[0]!]} />);

    const plate = tiles()[0]?.querySelector('span');

    expect(plate?.className).not.toMatch(/brand-600/);
    // White behind a photograph shot on white, not the sunken grey plate.
    expect(plate).toHaveClass('bg-white');
  });

  it('keeps the sunken plate where the media is an icon, not a photo', () => {
    render(
      <CategorySection
        categories={[category('toys-games', 'TG', 'Toys & Games')]}
      />,
    );

    const plate = tiles()[0]?.querySelector('span');

    expect(plate).toHaveClass('bg-surface-sunken', 'text-ink-muted');
  });

  it('lays the tiles out as a 5-column grid at md and 3 columns below it', () => {
    render(<CategorySection categories={liveCategories} />);

    expect(screen.getByRole('navigation')).toHaveClass(
      'grid',
      'grid-cols-3',
      'md:grid-cols-5',
    );
  });

  it('fills the unfinished last row at each breakpoint so no grey slab shows', () => {
    // 10 tiles: even at 5 columns (no desktop filler), 1 over at 3 columns
    // (2 mobile fillers).
    const ten = Array.from({ length: 10 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    const { container } = render(<CategorySection categories={ten} />);

    expect(container.querySelectorAll('.hidden.md\\:block')).toHaveLength(0);
    expect(container.querySelectorAll('.md\\:hidden')).toHaveLength(2);
  });

  it('caps the grid at 10 categories (spec section 15.1)', () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    render(<CategorySection categories={many} />);

    expect(tiles()).toHaveLength(10);
    expect(screen.getByText('10 categories')).toBeInTheDocument();
  });

  it('states the empty catalogue plainly instead of dropping the heading', () => {
    render(<CategorySection categories={[]} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Shop by category' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No categories are listed yet/),
    ).toBeInTheDocument();
    // The "See all" link stays: an empty stocked grid is exactly when a
    // buyer most needs the department list.
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText(/^\d+ categor/)).not.toBeInTheDocument();
  });

  it('links to the full department list, since the grid caps at 10', () => {
    render(<CategorySection categories={liveCategories} />);

    expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute(
      'href',
      '/categories',
    );
  });

  it('exposes the grid as a labelled navigation region', () => {
    render(<CategorySection categories={liveCategories} />);

    expect(screen.getByRole('navigation')).toHaveAccessibleName('Categories');
  });

  it('shows the first 10 of the real fallback departments', () => {
    render(<CategorySection categories={placeholderCategories} />);

    expect(placeholderCategories.length).toBe(21);
    expect(tiles()).toHaveLength(10);
    expect(screen.getByRole('link', { name: /Electronics/ })).toHaveAttribute(
      'href',
      '/c/electronics',
    );
  });

  it('has an icon for every department except the two left to initials', () => {
    const unmapped = placeholderCategories
      .map((department) => department.id)
      .filter((id) => CATEGORY_ICON_PATHS[id] === undefined);

    expect(unmapped).toEqual(['mature', 'religious-ceremonial']);
  });
});

describe('department photographs', () => {
  it('covers every department except the one whose asset is missing', () => {
    const missing = placeholderCategories
      .map((department) => department.id)
      .filter((id) => categoryImageSrc(id) === undefined);

    expect(missing).toEqual(['toys-games']);
  });

  it('never claims a photo for a leaf category id', () => {
    expect(categoryImageSrc('aquarium-lighting')).toBeUndefined();
    expect(categoryImageSrc('cat-ggl-5079')).toBeUndefined();
  });
});
