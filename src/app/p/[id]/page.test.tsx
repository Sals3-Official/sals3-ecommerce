import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    id: 1,
    title: 'Essence Mascara Lash Princess',
    description: 'A popular mascara for everyday wear.',
    category: 'beauty',
    price: 9.99,
    discountPercentage: 10.48,
    rating: 4.5,
    stock: 12,
    tags: ['beauty', 'mascara'],
    brand: 'Essence',
    sku: 'BEA-ESS-001',
    weight: 4,
    dimensions: { width: 15, height: 13, depth: 22 },
    warrantyInformation: '1 week warranty',
    shippingInformation: 'Ships in 3-5 business days',
    availabilityStatus: 'In Stock',
    reviews: [
      {
        rating: 5,
        comment: 'Great product!',
        date: '2026-01-15T00:00:00.000Z',
        reviewerName: 'Test Buyer',
        reviewerEmail: 'buyer@example.com',
      },
    ],
    returnPolicy: 'No return policy',
    minimumOrderQuantity: 1,
    meta: {
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      barcode: '1234567890',
      qrCode: 'https://assets.dummyjson.com/public/qr-code.png',
    },
    images: ['https://cdn.dummyjson.com/product-images/beauty/1/1.webp'],
    thumbnail:
      'https://cdn.dummyjson.com/product-images/beauty/1/thumbnail.webp',
    ...overrides,
  };
}

function mockFetch({ productStatus = 200 }: { productStatus?: number } = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const requestUrl = new URL(String(url));

    if (requestUrl.pathname === '/products/1') {
      if (productStatus === 404) {
        return new Response('Not found', { status: 404 });
      }
      return new Response(JSON.stringify(productFixture()), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (requestUrl.pathname === '/products/category/beauty') {
      return new Response(
        JSON.stringify({ products: [], total: 0, skip: 0, limit: 7 }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not found', { status: 404 });
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Product page', () => {
  it('renders the product title, price, and reviews', async () => {
    mockFetch();

    renderWithCart(await ProductPage({ params: Promise.resolve({ id: '1' }) }));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /essence mascara lash princess/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /reviews/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/great product!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
  });

  it('adds the product to the cart when Add to Cart is clicked', async () => {
    mockFetch();

    renderWithCart(await ProductPage({ params: Promise.resolve({ id: '1' }) }));

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(screen.getByText(/added to your cart/i)).toBeInTheDocument();
  });

  it('throws a not-found error for a missing product', async () => {
    mockFetch({ productStatus: 404 });

    await expect(
      ProductPage({ params: Promise.resolve({ id: '999999' }) }),
    ).rejects.toThrow();
  });

  it('throws a not-found error for an invalid id', async () => {
    mockFetch();

    await expect(
      ProductPage({ params: Promise.resolve({ id: 'not-a-number' }) }),
    ).rejects.toThrow();
  });

  it('builds metadata from the product title and description', async () => {
    mockFetch();

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: '1' }),
    });

    expect(metadata.title).toMatch(/essence mascara lash princess/i);
    expect(metadata.description).toMatch(/popular mascara/i);
  });
});
