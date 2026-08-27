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
    render(<CategorySection market="au" categories={liveCategories} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Shop by category' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 categories')).toBeInTheDocument();
  });

  it('says "1 category", not "1 categories", when the feed publishes one', () => {
    render(<CategorySection market="au" categories={[liveCategories[0]!]} />);

    expect(screen.getByText('1 category')).toBeInTheDocument();
  });

  it("renders the department's photograph when there is one", () => {
    render(<CategorySection market="au" categories={[liveCategories[0]!]} />);

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

  it('photographs every department, Toys & Games included', () => {
    render(
      <CategorySection
        market="au"
        categories={[category('toys-games', 'TG', 'Toys & Games')]}
      />,
    );

    const link = screen.getByRole('link', { name: /Toys & Games/ });

    expect(
      decodeURIComponent(link.querySelector('img')?.getAttribute('src') ?? ''),
    ).toContain('/categories/toys-games.webp');
    expect(link.querySelector('svg')).not.toBeInTheDocument();
  });

  it('falls back to the real feed code when it has neither photo nor icon', () => {
    render(
      <CategorySection
        market="au"
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
        market="au"
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
    render(<CategorySection market="au" categories={[liveCategories[0]!]} />);

    const plate = tiles()[0]?.querySelector('span');

    expect(plate?.className).not.toMatch(/brand-600/);
    // White behind a photograph shot on white, not the sunken grey plate.
    expect(plate).toHaveClass('bg-white');
  });

  it('keeps the sunken plate where the media is an icon or initials, not a photo', () => {
    // A leaf id: no photograph and no icon, so the plate stays grey behind the
    // code initials.
    render(
      <CategorySection
        market="au"
        categories={[category('aquarium-lighting', 'AL', 'Aquarium Lighting')]}
      />,
    );

    const plate = tiles()[0]?.querySelector('span');

    expect(plate).toHaveClass('bg-surface-sunken', 'text-ink-muted');
  });

  it('scrolls one snapped page at a time', () => {
    render(<CategorySection market="au" categories={liveCategories} />);

    expect(screen.getByRole('navigation')).toHaveClass(
      'flex',
      'snap-x',
      'snap-mandatory',
      'overflow-x-auto',
    );
  });

  it('fills each page row-major: 3 columns below md, 6 above, always 12 cells', () => {
    const { container } = render(
      <CategorySection market="au" categories={liveCategories} />,
    );
    const page = container.querySelector('nav > div');

    expect(page).toHaveClass(
      'grid',
      'grid-cols-3',
      'grid-rows-4',
      'md:grid-cols-6',
      'md:grid-rows-2',
      'w-full',
      'snap-start',
    );
    // Four real tiles, eight blanks — the page always holds 12 cells so no
    // leftover cell shows the track's border colour.
    expect(page?.children).toHaveLength(12);
  });

  it('breaks 21 categories into two pages, in order', () => {
    const many = Array.from({ length: 21 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    const { container } = render(
      <CategorySection market="au" categories={many} />,
    );
    const pages = container.querySelectorAll('nav > div');

    expect(pages).toHaveLength(2);
    expect(pages[0]?.querySelectorAll('a')[0]?.getAttribute('href')).toBe(
      '/au/c/live-0',
    );
    expect(pages[1]?.querySelectorAll('a')[0]?.getAttribute('href')).toBe(
      '/au/c/live-12',
    );
  });

  it('fills the last page out to 12 cells', () => {
    const many = Array.from({ length: 21 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    const { container } = render(
      <CategorySection market="au" categories={many} />,
    );
    const lastPage = [...container.querySelectorAll('nav > div')].at(-1);

    // 21 categories: 12 on page one, 9 on page two, so three blanks.
    expect(lastPage?.querySelectorAll('a')).toHaveLength(9);
    expect(lastPage?.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(
      3,
    );
  });

  it('adds no filler when the categories fill their pages exactly', () => {
    const exact = Array.from({ length: 24 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    const { container } = render(
      <CategorySection market="au" categories={exact} />,
    );

    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(
      0,
    );
  });

  it('shows every category and counts every one — no top-N slice', () => {
    const many = Array.from({ length: 21 }, (_, index) =>
      category(`live-${index}`, `L${index}`, `Live category ${index}`),
    );

    render(<CategorySection market="au" categories={many} />);

    expect(tiles()).toHaveLength(21);
    expect(screen.getByText('21 categories')).toBeInTheDocument();
  });

  it('states the empty catalogue plainly instead of dropping the heading', () => {
    render(<CategorySection market="au" categories={[]} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Shop by category' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No categories are listed yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ categor/)).not.toBeInTheDocument();
  });

  it('offers no "see all" link — the carousel already reaches every category', () => {
    render(<CategorySection market="au" categories={liveCategories} />);

    expect(
      screen.queryByRole('link', { name: /see all/i }),
    ).not.toBeInTheDocument();
    expect(tiles()).toHaveLength(liveCategories.length);
  });

  it('exposes the grid as a labelled navigation region', () => {
    render(<CategorySection market="au" categories={liveCategories} />);

    expect(screen.getByRole('navigation')).toHaveAccessibleName('Categories');
  });

  it('shows all 21 of the real fallback departments', () => {
    render(<CategorySection market="au" categories={placeholderCategories} />);

    expect(placeholderCategories.length).toBe(21);
    expect(tiles()).toHaveLength(21);
    expect(screen.getByRole('link', { name: /Electronics/ })).toHaveAttribute(
      'href',
      '/au/c/electronics',
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
  it('covers all 21 departments, none missing', () => {
    const missing = placeholderCategories
      .map((department) => department.id)
      .filter((id) => categoryImageSrc(id) === undefined);

    expect(missing).toEqual([]);
    expect(placeholderCategories).toHaveLength(21);
  });

  it('never claims a photo for a leaf category id', () => {
    expect(categoryImageSrc('aquarium-lighting')).toBeUndefined();
    expect(categoryImageSrc('cat-ggl-5079')).toBeUndefined();
  });
});
