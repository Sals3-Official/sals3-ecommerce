import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { homePromoSlides } from '@/lib/home-promo-slides';
import { SITE_TAGLINE } from '@/lib/site';
import renderWithCart from '../../test/render-with-cart';
import Home from './page';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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
    currency: 'USD',
    priceMinor: 99900 + id,
    oldPriceMinor: 129900 + id,
    imageUrl: null,
    imageAlt: `Live product ${id}`,
    ratingLine: 'Rating 4.5, 1 review',
    shipLine: 'Standard',
    category: 'beauty',
  };
}

function mockProductsFetch(
  total = 21,
  sessionResponse: Record<string, unknown> = { signedIn: false },
) {
  vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    if (String(url) === '/api/auth/session') {
      return new Response(JSON.stringify(sessionResponse), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const requestUrl = new URL(String(url));

    if (requestUrl.pathname === '/api/storefront/categories') {
      return new Response(
        JSON.stringify([
          {
            id: 'health-beauty',
            code: 'HB',
            name: 'Health & Beauty',
          },
          {
            id: 'electronics',
            code: 'EL',
            name: 'Electronics',
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

    renderWithCart(await Home({}));

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

    renderWithCart(await Home({}));

    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
  });

  it('renders the guest utility bar with Log In and Sign Up links', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home({}));

    expect(
      await screen.findByRole('link', { name: /^log in$/i }),
    ).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^sign up$/i })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.queryByRole('link', { name: /track my order/i })).toBeNull();
  });

  it('hides Log In and Sign Up when the server session verifies', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch(21, { signedIn: true, fullName: 'AJ Shopper' });

    renderWithCart(await Home({}));

    expect(
      await screen.findByRole('button', { name: /aj shopper account menu/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^log in$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^sign up$/i })).toBeNull();
  });

  it('renders the category grid below the promo banner', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home({}));

    const categories = screen.getByRole('navigation', { name: /categories/i });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Shop by category' }),
    ).toBeInTheDocument();
    // Scoped to the grid: the footer lists the same main categories, so a
    // page-wide query matches twice.
    expect(
      within(categories).getByRole('link', { name: /electronics/i }),
    ).toHaveAttribute('href', '/c/electronics');

    // Order matters here — the grid used to be a full-bleed band above the
    // banner. They are siblings inside <main>, so the comparison is exactly
    // DOCUMENT_POSITION_FOLLOWING with no containment bit mixed in.
    const banner = screen.getByRole('region', { name: /featured deals/i });

    expect(banner.compareDocumentPosition(categories)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows every department, stocked ones first', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      if (String(url) === '/api/auth/session') {
        return new Response(JSON.stringify({ signedIn: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const requestUrl = new URL(String(url));

      if (requestUrl.pathname === '/api/storefront/categories') {
        // `scope=all` is the department list; the bare call is the stocked one.
        const payload =
          requestUrl.searchParams.get('scope') === 'all'
            ? [
                { id: 'animals-pet-supplies', code: 'AP', name: 'Animals' },
                { id: 'electronics', code: 'EL', name: 'Electronics' },
                { id: 'furniture', code: 'FU', name: 'Furniture' },
              ]
            : [{ id: 'furniture', code: 'FU', name: 'Furniture' }];

        return new Response(JSON.stringify(payload), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ products: [], total: 0, page: 1, limit: 14 }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    renderWithCart(await Home({}));

    const grid = screen.getByRole('navigation', { name: /categories/i });
    const names = within(grid)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    // Furniture is the only stocked department, so it leads; the two with no
    // published product still appear rather than being hidden.
    expect(names).toEqual([
      '/c/furniture',
      '/c/animals-pet-supplies',
      '/c/electronics',
    ]);
  });

  it('shows departments even while the portal still sends leaf categories', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

    // Exactly what production served before the portal's rollup deployed.
    const leafFeed = [
      { id: 'aquarium-lighting', code: 'AL', name: 'Aquarium Lighting' },
      { id: 'rangefinders', code: 'RA', name: 'Rangefinders' },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (url) => {
        if (String(url) === '/api/auth/session') {
          return new Response(JSON.stringify({ signedIn: false }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const requestUrl = new URL(String(url));

        if (requestUrl.pathname === '/api/storefront/categories') {
          return new Response(JSON.stringify(leafFeed), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ products: [], total: 0, page: 1, limit: 14 }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    renderWithCart(await Home({}));

    const grid = screen.getByRole('navigation', { name: /categories/i });

    expect(
      within(grid).getByRole('link', { name: /animals & pet supplies/i }),
    ).toHaveAttribute('href', '/c/animals-pet-supplies');
    expect(
      within(grid).queryByRole('link', { name: /aquarium lighting/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the promo carousel instead of the old shipping banner', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home({}));

    expect(screen.queryByText(/free shipping this weekend/i)).toBeNull();
    expect(
      screen.getByRole('region', { name: /featured deals/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /one clear price/i }),
    ).toHaveAttribute('href', '/categories');
    expect(
      screen.getByAltText(/one clear price promotion/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /show featured deal/i }),
    ).toHaveLength(homePromoSlides.length);
  });

  /*
    Every slide used to link to `/deals?promo=<id>`, a route that has never
    existed — so the most prominent click on the home page 404'd, seven times
    out of seven, for as long as the carousel had been shipping. Assert the
    destinations instead of trusting them: a hero that lands on a missing page
    costs more trust than the hero was ever going to buy.
  */
  it('points every promo slide at a route that exists', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home({}));

    const shippedRoutes = ['/categories', '/orders', '/c/apparel-accessories'];

    homePromoSlides.forEach((slide) => {
      expect(shippedRoutes).toContain(slide.href);
      expect(
        screen.getByRole('link', { name: new RegExp(slide.title, 'i') }),
      ).toHaveAttribute('href', slide.href);
    });
  });

  it('fetches 14 for-you products so the ad grid has no desktop gap', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchMock = mockProductsFetch(30);

    renderWithCart(await Home({}));

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

    // A string, not a `URL` instance: every read now goes through one request
    // helper that serialises the URL.
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/storefront/categories',
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

  /**
   * A successful feed with zero published products is a real, reachable state
   * now that the upstream reads the Sals3 catalogue — and it must NOT fall back
   * to placeholder products, because a working upstream is not an outage.
   * Rendering a blank grid is the one case where showing nothing is worse than
   * saying the true thing.
   */
  it('says the catalogue is empty rather than rendering a blank grid', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (url) => {
        const requestUrl = new URL(String(url));

        if (requestUrl.pathname === '/api/storefront/products') {
          return new Response(
            JSON.stringify({
              products: [],
              total: 0,
              page: 1,
              limit: 14,
              totalPages: 1,
            }),
            { headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    renderWithCart(await Home({}));

    expect(screen.getByText(/no products are listed yet/i)).toBeInTheDocument();
    // Not the placeholder fallback: those only appear when the feed throws.
    expect(screen.queryByText('Live product 1')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^deals$/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps live deals when only the for-you page fails', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      const requestUrl = new URL(String(url));

      if (requestUrl.pathname === '/api/storefront/categories') {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const section = requestUrl.searchParams.get('section');

      if (section === 'for-you') {
        return new Response('Server error', { status: 500 });
      }

      return new Response(
        JSON.stringify({
          products: [productFixture(1)],
          total: 1,
          page: 1,
          limit: 5,
          totalPages: 1,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    renderWithCart(await Home({}));

    expect(screen.getByText('Live product 1')).toBeInTheDocument();
    expect(screen.getByText(/live products unavailable/i)).toBeInTheDocument();
  });

  it('renders an h1 heading with the site tagline', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home({}));

    expect(
      screen.getByRole('heading', { level: 1, name: SITE_TAGLINE }),
    ).toBeInTheDocument();
  });

  /*
    The invariant left after the markets were removed on 2026-08-28, and the one
    worth guarding: **no shopping link carries a country.** A prefix creeping
    back is how a buyer who chose the Philippines ends up on Australia's cart,
    which is exactly what the owner reported from `/checkout` that day.

    The Fiji cannot-order notice this file used to assert went with the markets:
    it was a statement about the shopfront being read, and `/fj` was the only
    reason a home page had to make one. The cart still says it, for the buyer's
    own destination.
  */
  it('points every shopping link at one storefront, with no country in it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    renderWithCart(await Home({}));

    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute(
      'href',
      '/cart',
    );
    expect(screen.getByRole('search')).toHaveAttribute('action', '/search');
    expect(
      screen.getAllByRole('link', { name: /^Electronics$/ })[0],
    ).toHaveAttribute('href', '/c/electronics');

    const prefixed = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => /^\/(au|ph|fj)(\/|$)/.test(href));

    expect(prefixed).toEqual([]);

    /*
      Account routes were never market-scoped and still are not. Awaited because
      the utility bar renders neither identity until the session check answers —
      it must never flash the wrong one.
    */
    expect(
      await screen.findByRole('link', { name: /log in/i }),
    ).toHaveAttribute('href', '/login');
  });
});
