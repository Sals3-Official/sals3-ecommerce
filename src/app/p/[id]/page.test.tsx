import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { STOREFRONT_PRODUCTS_PATH } from '@/services/products';
import renderWithCart from '../../../../test/render-with-cart';
import ProductPage, { generateMetadata } from './page';

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();

  return {
    ...actual,
    useRouter: () => ({ push: vi.fn() }),
  };
});

function productFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'air-cooler',
    slug: 'air-cooler',
    title: 'Quiet tower air cooler',
    priceMinor: 199900,
    oldPriceMinor: 249900,
    imageUrl: 'https://cf.cjdropshipping.com/product-images/air-cooler.webp',
    imageAlt: 'Quiet tower air cooler',
    ratingLine: 'Rating 4.5, 2 reviews',
    shipLine: 'Bulky, ships in 3-5 business days',
    category: 'home-living',
    ...overrides,
  };
}

function productsPage(products: unknown[] = []) {
  return {
    products,
    total: products.length,
    page: 1,
    limit: 30,
    totalPages: 1,
  };
}

function mockFetch({
  found = true,
  productOverrides = {},
}: {
  found?: boolean;
  productOverrides?: Partial<Record<string, unknown>>;
} = {}) {
  const product = productFixture(productOverrides);
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const requestUrl = new URL(String(url));

    if (requestUrl.pathname.startsWith(`${STOREFRONT_PRODUCTS_PATH}/`)) {
      if (found) {
        return new Response(JSON.stringify({ product }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not found', { status: 404 });
    }

    if (requestUrl.pathname === STOREFRONT_PRODUCTS_PATH) {
      return new Response(JSON.stringify(productsPage()), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  });

  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Product page', () => {
  it('renders the product title, price, and rating line', async () => {
    mockFetch();

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /quiet tower air cooler/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/rating 4\.5, 2 reviews/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
  });

  it('adds the product to the cart when Add to Cart is clicked', async () => {
    mockFetch();

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(screen.getByText(/added to your cart/i)).toBeInTheDocument();
  });

  it('renders notFound for a missing product', async () => {
    mockFetch({ found: false });

    await expect(
      ProductPage({ params: Promise.resolve({ id: 'does-not-exist' }) }),
    ).rejects.toThrow();
  });

  it('builds metadata from the product title and rating', async () => {
    mockFetch();

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'air-cooler' }),
    });

    expect(metadata.title).toMatch(/quiet tower air cooler/i);
    expect(metadata.description).toMatch(/rating 4\.5, 2 reviews/i);
  });
});
