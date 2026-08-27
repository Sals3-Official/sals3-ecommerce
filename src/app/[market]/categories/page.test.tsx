import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { categories as fallbackDepartments } from '@/lib/home-placeholder-data';
import renderWithCart from '../../../../test/render-with-cart';
import CategoriesPage, { generateMetadata } from './page';

/*
  `HeaderDestination` reads `cookies()` to resolve the buyer's shipping
  destination, so it is an async Server Component and React refuses to render it
  outside RSC. Left alone it would log an error into every assertion in this
  file without failing one, which is the worst of both. The picker it renders
  has its own tests.
*/
vi.mock('@/components/layout/HeaderDestination', () => ({
  default: () => null,
}));

function mockDepartmentsFetch(
  payload: unknown = [
    { id: 'animals-pet-supplies', code: 'AP', name: 'Animals & Pet Supplies' },
    { id: 'apparel-accessories', code: 'AA', name: 'Apparel & Accessories' },
    { id: 'mature', code: 'MA', name: 'Mature' },
  ],
) {
  vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    if (String(url) === '/api/auth/session') {
      return new Response(JSON.stringify({ signedIn: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

/**
 * The exact list the owner signed off, in order. Pinned on the page that
 * shows it: if the feed or the fallback ever drops one, this fails rather
 * than quietly shipping a shorter department list to buyers.
 */
const DEPARTMENTS = [
  'Animals & Pet Supplies',
  'Apparel & Accessories',
  'Arts & Entertainment',
  'Baby & Toddler',
  'Business & Industrial',
  'Cameras & Optics',
  'Electronics',
  'Food, Beverages & Tobacco',
  'Furniture',
  'Hardware',
  'Health & Beauty',
  'Home & Garden',
  'Luggage & Bags',
  'Mature',
  'Media',
  'Office Supplies',
  'Religious & Ceremonial',
  'Software',
  'Sporting Goods',
  'Toys & Games',
  'Vehicles & Parts',
];

describe('All departments page', () => {
  it('lists all 21 departments, in order, from the live feed', async () => {
    mockDepartmentsFetch(
      DEPARTMENTS.map((name) => ({
        id: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        code: name.slice(0, 2).toUpperCase(),
        name,
      })),
    );

    renderWithCart(
      await CategoriesPage({ params: Promise.resolve({ market: 'au' }) }),
    );

    const list = screen.getByRole('navigation', { name: /all departments/i });

    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim()),
    ).toEqual(DEPARTMENTS);
    expect(screen.getByText('21 departments')).toBeInTheDocument();
  });

  it('still lists all 21 when the feed is down', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (url) =>
        String(url) === '/api/auth/session'
          ? new Response(JSON.stringify({ signedIn: false }), {
              headers: { 'Content-Type': 'application/json' },
            })
          : new Response('Server error', { status: 500 }),
      ),
    );

    renderWithCart(
      await CategoriesPage({ params: Promise.resolve({ market: 'au' }) }),
    );

    const list = screen.getByRole('navigation', { name: /all departments/i });

    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim()),
    ).toEqual(DEPARTMENTS);
  });

  it('titles itself for the department list', () => {
    expect(generateMetadata().title).toMatch(/all departments/i);
  });

  it('asks the portal for every department, not only the stocked ones', async () => {
    const fetchMock = mockDepartmentsFetch();

    renderWithCart(
      await CategoriesPage({ params: Promise.resolve({ market: 'au' }) }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/storefront/categories?scope=all',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('lists each department as a link to its category page', async () => {
    mockDepartmentsFetch();

    renderWithCart(
      await CategoriesPage({ params: Promise.resolve({ market: 'au' }) }),
    );

    const list = screen.getByRole('navigation', { name: /all departments/i });

    expect(within(list).getAllByRole('link')).toHaveLength(3);
    expect(
      within(list).getByRole('link', { name: /apparel & accessories/i }),
    ).toHaveAttribute('href', '/au/c/apparel-accessories');
  });

  it('counts the departments it actually shows', async () => {
    mockDepartmentsFetch();

    renderWithCart(
      await CategoriesPage({ params: Promise.resolve({ market: 'au' }) }),
    );

    expect(screen.getByText('3 departments')).toBeInTheDocument();
  });

  it('falls back to the taxonomy departments when the feed fails', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (url) =>
        String(url) === '/api/auth/session'
          ? new Response(JSON.stringify({ signedIn: false }), {
              headers: { 'Content-Type': 'application/json' },
            })
          : new Response('Server error', { status: 500 }),
      ),
    );

    renderWithCart(
      await CategoriesPage({ params: Promise.resolve({ market: 'au' }) }),
    );

    const list = screen.getByRole('navigation', { name: /all departments/i });

    expect(within(list).getAllByRole('link')).toHaveLength(
      fallbackDepartments.length,
    );
    expect(
      within(list).getByRole('link', { name: /^religious & ceremonial$/i }),
    ).toHaveAttribute('href', '/au/c/religious-ceremonial');
  });
});
