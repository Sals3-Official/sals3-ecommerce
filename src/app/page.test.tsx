import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { homePromoSlides } from '@/lib/home-promo-slides';
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
    id,
    title: `Live product ${id}`,
    description: 'A live product from the API.',
    category: 'beauty',
    price: 9.99,
    discountPercentage: 10,
    rating: 4.5,
    stock: 12,
    tags: ['beauty'],
    brand: 'Sals3',
    sku: `SKU-${id}`,
    weight: 1,
    dimensions: {
      width: 1,
      height: 1,
      depth: 1,
    },
    warrantyInformation: '1 week warranty',
    shippingInformation: 'Ships in 3 to 5 days',
    availabilityStatus: 'In Stock',
    reviews: [
      {
        rating: 5,
        comment: 'Good item.',
        date: '2026-08-05T00:00:00.000Z',
        reviewerName: 'Test Buyer',
        reviewerEmail: 'buyer@example.com',
      },
    ],
    returnPolicy: 'No return policy',
    minimumOrderQuantity: 1,
    meta: {
      createdAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
      barcode: '1234567890',
      qrCode: 'https://assets.dummyjson.com/public/qr-code.png',
    },
    images: ['https://cdn.dummyjson.com/product-images/beauty/1/1.webp'],
    thumbnail:
      'https://cdn.dummyjson.com/product-images/beauty/1/thumbnail.webp',
  };
}

function mockProductsFetch(total = 21) {
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const requestUrl = new URL(String(url));

    if (requestUrl.pathname === '/products/categories') {
      return new Response(
        JSON.stringify([
          {
            slug: 'beauty',
            name: 'Beauty',
            url: 'https://dummyjson.com/products/category/beauty',
          },
          {
            slug: 'mobile-accessories',
            name: 'Mobile Accessories',
            url: 'https://dummyjson.com/products/category/mobile-accessories',
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
    const skip = Number(requestUrl.searchParams.get('skip') ?? 0);

    return new Response(
      JSON.stringify({
        products: Array.from(
          { length: Math.max(0, Math.min(limit, total - skip)) },
          (_, index) => productFixture(skip + index + 1),
        ),
        total,
        skip,
        limit,
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
  vi.restoreAllMocks();
});

describe('Home page', () => {
  it('renders the deals and for-you sections', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    render(await Home());

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

    render(await Home());

    expect(
      screen.getByPlaceholderText(/search 240,000 products/i),
    ).toBeInTheDocument();
  });

  it('renders the category navigation', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockProductsFetch();

    render(await Home());

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

    render(await Home());

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

    render(await Home());

    expect(fetchMock).toHaveBeenCalledWith(
      'https://dummyjson.com/products?limit=14&skip=0',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(screen.getByText('Live product 14')).toBeInTheDocument();
  });

  it('uses the products API page and renders pagination links', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchMock = mockProductsFetch(45);

    render(
      await Home({
        searchParams: Promise.resolve({ page: '2' }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://dummyjson.com/products/categories',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dummyjson.com/products?limit=14&skip=14',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dummyjson.com/products?limit=5&skip=0',
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
});
