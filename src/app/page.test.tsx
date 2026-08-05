import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { homePromoSlides } from '@/lib/home-promo-slides';
import { SITE_TAGLINE } from '@/lib/site';
import renderWithCart from '../../test/render-with-cart';
import Home from './page';

vi.mock('embla-carousel-react', () => {
  const emblaApi = {
    canScrollNext: () => true,
    canScrollPrev: () => true,
    off: vi.fn(),
    on: vi.fn(),
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
    scrollSnapList: () => [0, 1, 2, 3, 4, 5, 6],
    scrollTo: vi.fn(),
    selectedScrollSnap: () => 0,
  };

  return {
    default: () => [vi.fn(), emblaApi],
  };
});

function productFixture(id: number) {
  return {
    id: `live-product-${id}`,
    slug: `live-product-${id}`,
    title: `Live product ${id}`,
    priceMinor: 99900 + id,
    oldPriceMinor: 129900 + id,
    imageUrl: null,
    imageAlt: `Live product ${id}`,
    ratingLine: 'Rating 4.5, 1 review',
    shipLine: 'Standard',
    category: 'beauty',
  };
}

function mockProductsFetch(total = 21) {
  vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const requestUrl = new URL(String(url));

    if (requestUrl.pathname === '/api/storefront/categories') {
      return new Response(
        JSON.stringify([
          {
            id: 'beauty',
            code: 'BE',
            name: 'Beauty',
          },
          {
            id: 'mobile-accessories',
            code: 'MA',
            name: 'Mobile Accessories',
          },
        ]),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const limit = Number(requestUrl.searchParams.get('limit') ?? 10);
    const page = Number(requestUrl.searchParams.get('page') ?? 1);
    const start = (page - 1) * limit;

    return new Response(
      JSON.stringify({
        products: Array.from(
          { length: Math.max(0, Math.min(limit, total - start)) },
          (_, index) => productFixture(start + index + 1),
        ),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Home page', () => {
  it('renders the deals and for-you sections', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home());

    expect(
      screen.getByRole('heading', { level: 2, name: /deals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /for you/i }),
    ).toBeInTheDocument();
  });

  it('renders the search box', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home());

    expect(
      screen.getByPlaceholderText(/search 240,000 products/i),
    ).toBeInTheDocument();
  });

  it('renders the guest utility bar with Log In and Sign Up links', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home());

    expect(screen.getByRole('link', { name: /^log in$/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: /^sign up$/i })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.queryByRole('link', { name: /track my order/i })).toBeNull();
  });

  it('renders the category navigation', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home());

    expect(
      screen.getByRole('navigation', { name: /categories/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /mobile accessories/i }),
    ).toHaveAttribute('href', '/c/mobile-accessories');
  });

  it('renders the promo carousel instead of the old shipping banner', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home());

    expect(screen.queryByText(/free shipping this weekend/i)).toBeNull();
    expect(
      screen.getByRole('region', { name: /featured deals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /portable air cooler/i }),
    ).toHaveAttribute('href', '/deals?promo=air-cooler');
    expect(
      screen.getByAltText(/portable hydrocooling air cooler promotion/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /show featured deal/i }),
    ).toHaveLength(homePromoSlides.length);
  });

  it('fetches 14 for-you products so the ad grid has no desktop gap', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchMock = mockProductsFetch(30);

    renderWithCart(await Home());

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/storefront/products?section=for-you&page=1&limit=14',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(screen.getByText('Live product 14')).toBeInTheDocument();
  });

  it('uses the products API page and renders pagination links', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchMock = mockProductsFetch(45);

    renderWithCart(
      await Home({
        searchParams: Promise.resolve({ page: '2' }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3001/api/storefront/categories'),
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/storefront/products?section=for-you&page=2&limit=14',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/storefront/products?section=deals&page=1&limit=5',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(screen.getByText('Live product 1')).toBeInTheDocument();
    expect(screen.getByText('Live product 15')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(
      screen.getByRole('link', { name: /go to previous product page/i }),
    ).toHaveAttribute('href', '/#for-you');
    expect(
      screen.getByRole('link', { name: /go to next product page/i }),
    ).toHaveAttribute('href', '/?page=3#for-you');
  });

  it('renders an h1 heading with the site tagline', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home());

    expect(
      screen.getByRole('heading', { level: 1, name: SITE_TAGLINE }),
    ).toBeInTheDocument();
  });
});
