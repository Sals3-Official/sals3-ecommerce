import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryBreadcrumb from './CategoryBreadcrumb';

/**
 * The browse page's own breadcrumb. It carried `Home / All categories / <name>`
 * and nothing else, which was right while only the 21 departments were
 * addressable — a department's parents *are* Home and All categories.
 *
 * Now that a level below a department can be browsed, that shape would let a
 * buyer reach `/c/paper-products-956` and have no way to climb out of it.
 */
describe('CategoryBreadcrumb', () => {
  it('shows only Home and All categories above a department', () => {
    render(<CategoryBreadcrumb categoryName="Office Supplies" />);

    expect(
      [...screen.getAllByRole('link')].map((link) => [
        link.textContent,
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['Home', '/'],
      ['All categories', '/categories'],
    ]);
    expect(screen.getByText('Office Supplies')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('links every ancestor of a deeper level, so a buyer can climb out', () => {
    render(
      <CategoryBreadcrumb
        categoryName="Notebooks & Notepads"
        ancestors={[
          { name: 'Office Supplies', slug: 'office-supplies' },
          {
            name: 'General Office Supplies',
            slug: 'general-office-supplies-932',
          },
          { name: 'Paper Products', slug: 'paper-products-956' },
        ]}
      />,
    );

    expect(
      [...screen.getAllByRole('link')].map((link) => link.getAttribute('href')),
    ).toEqual([
      '/',
      '/categories',
      '/c/office-supplies',
      '/c/general-office-supplies-932',
      '/c/paper-products-956',
    ]);
    // The level being browsed is the current page, never a link to itself.
    expect(screen.getByText('Notebooks & Notepads')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders an unaddressable ancestor as text rather than a dead link', () => {
    // The producer omits a slug it cannot address — a CJ-mirrored path, or a
    // level the seeded taxonomy does not carry. A guessed link would 404.
    render(
      <CategoryBreadcrumb
        categoryName="Wide Leg Jeans"
        ancestors={[{ name: 'Men Clothing' }, { name: 'Pants' }]}
      />,
    );

    expect(
      [...screen.getAllByRole('link')].map((link) => link.getAttribute('href')),
    ).toEqual(['/', '/categories']);
    expect(screen.getByText('Men Clothing')).toBeVisible();
    expect(screen.getByText('Pants')).toBeVisible();
  });

  it('keeps one separator per level, so the trail reads as a path', () => {
    const { container } = render(
      <CategoryBreadcrumb
        categoryName="Pants"
        ancestors={[
          { name: 'Apparel & Accessories', slug: 'apparel-accessories' },
        ]}
      />,
    );

    // Home / All categories / Apparel & Accessories / Pants — three separators.
    expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(
      3,
    );
  });
});
