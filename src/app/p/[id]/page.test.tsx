import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CART_STORAGE_KEY } from '@/lib/cart';
import { KLAVIYO_CONSENT_ACCEPTED } from '@/lib/klaviyo/consent';
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
    currency: 'USD',
    priceMinor: 199900,
    imageUrl: 'https://cf.cjdropshipping.com/product-images/air-cooler.webp',
    imageAlt: 'Quiet tower air cooler',
    category: 'home-living',
    categoryName: 'Home and living',
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
  status,
  productOverrides = {},
}: {
  found?: boolean;
  /** A non-404 failure, to exercise the error path. */
  status?: number;
  productOverrides?: Partial<Record<string, unknown>>;
} = {}) {
  const product = productFixture(productOverrides);
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const requestUrl = new URL(String(url));

    if (requestUrl.pathname.startsWith(`${STOREFRONT_PRODUCTS_PATH}/`)) {
      if (status !== undefined) {
        return new Response('Upstream failure', { status });
      }

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
  function acceptAnalytics() {
    window.localStorage.setItem(
      'sals3_klaviyo_consent_v1',
      JSON.stringify({
        decision: KLAVIYO_CONSENT_ACCEPTED,
        decidedAt: '2026-08-08T00:00:00.000Z',
      }),
    );
  }

  it('renders the product title and price', async () => {
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
    expect(screen.getByText('US$1,999')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
  });

  /**
   * Absent means absent: with no description, no specs, and no comparison
   * price, the page shows no headings for them rather than empty sections.
   */
  it('renders no section for data the portal did not send', async () => {
    mockFetch();

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    expect(
      screen.queryByRole('heading', { name: /about this product/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /specifications/i }),
    ).not.toBeInTheDocument();
    // No rating line at all — the portal no longer sends one, and inventing one
    // would be a Sals3 rating that does not exist.
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it('renders description, specs, and a stock notice when the portal sends them', async () => {
    mockFetch({
      productOverrides: {
        availability: 'AVAILABLE',
        description: {
          blocks: [{ type: 'paragraph', text: 'A quiet tower cooler.' }],
        },
        specs: { sku: 'SALS3-AC-1', weightGrams: 4200, condition: 'NEW' },
      },
    });

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    expect(screen.getByText('A quiet tower cooler.')).toBeInTheDocument();
    expect(screen.getByText('SALS3-AC-1')).toBeInTheDocument();
    expect(screen.getByText('4,200 g')).toBeInTheDocument();
    expect(screen.getByText(/in stock with the supplier/i)).toBeInTheDocument();
  });

  it('renders a variant selector only when there is a choice to make', async () => {
    mockFetch({
      productOverrides: {
        variants: [
          {
            id: 'v1',
            sku: 'AC-BLACK',
            currency: 'USD',
            priceMinor: 199900,
            availability: 'AVAILABLE',
            options: [{ name: 'Colour', value: 'Black' }],
          },
          {
            id: 'v2',
            sku: 'AC-WHITE',
            currency: 'USD',
            priceMinor: 209900,
            availability: 'UNAVAILABLE',
            options: [{ name: 'Colour', value: 'White' }],
          },
        ],
      },
    });

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    expect(screen.getByRole('radiogroup', { name: /colour/i })).toBeVisible();
    // Nothing chosen yet, so purchase is blocked with a reason a buyer can act
    // on rather than a silently grey button.
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    expect(screen.getByText(/choose a colour/i)).toBeInTheDocument();
  });

  it('renders a fallback Variant selector and preselects a no-option variant', async () => {
    mockFetch({
      productOverrides: {
        priceMinor: 451,
        variants: [
          {
            id: 'v-expensive',
            sku: 'S3V-12D76F1B5376',
            currency: 'USD',
            priceMinor: 780,
            availability: 'AVAILABLE',
          },
          {
            id: 'v-base',
            sku: 'S3V-2268B366F762',
            currency: 'USD',
            priceMinor: 451,
            availability: 'AVAILABLE',
          },
        ],
      },
    });

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    expect(
      screen.getByRole('radiogroup', { name: /^variant$/i }),
    ).toBeVisible();
    expect(
      screen.getByRole('radio', { name: /s3v-2268b366f762 · us\$4\.51/i }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
  });

  it('adds the selected no-option variant id to the cart', async () => {
    mockFetch({
      productOverrides: {
        priceMinor: 451,
        variants: [
          {
            id: 'v-base',
            sku: 'S3V-2268B366F762',
            currency: 'USD',
            priceMinor: 451,
            availability: 'AVAILABLE',
          },
        ],
      },
    });

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain('v-base');
    });
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain(
      'S3V-2268B366F762 · US$4.51',
    );
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

  /**
   * The fix this replaces: every failure used to become `notFound()`, so an
   * unreachable catalogue looked like a deleted product. An upstream failure
   * must now propagate to `error.tsx`.
   */
  it('propagates an upstream failure instead of reporting not-found', async () => {
    mockFetch({ status: 503 });

    await expect(
      ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    ).rejects.toMatchObject({ name: 'ProductsApiError' });
  });

  it('builds metadata from the product title and category', async () => {
    mockFetch();

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'air-cooler' }),
    });

    expect(metadata.title).toMatch(/quiet tower air cooler/i);
    expect(metadata.description).toMatch(/home and living/i);
  });

  /**
   * One product read per page render.
   *
   * The cross-call half of this — `generateMetadata` and the page sharing one
   * read — is what `cache()` provides, and it cannot be asserted here: React's
   * cache scope is per render, and these two run outside one in Vitest. What
   * this does catch is the regression that is testable: a future edit that
   * fetches the product twice while building the page.
   */
  it('reads the product once while rendering the page', async () => {
    const fetchMock = mockFetch();

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    const productReads = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes(`${STOREFRONT_PRODUCTS_PATH}/air-cooler`),
    );

    expect(productReads).toHaveLength(1);
  });

  it('tracks a viewed product only after analytics consent', async () => {
    const track = vi.fn();
    const trackViewedItem = vi.fn();

    acceptAnalytics();
    window.klaviyo = { track, trackViewedItem };
    mockFetch();

    renderWithCart(
      await ProductPage({ params: Promise.resolve({ id: 'air-cooler' }) }),
    );

    await waitFor(() => {
      expect(track).toHaveBeenCalledWith(
        'Viewed Product',
        expect.objectContaining({
          ProductID: 'air-cooler',
          ProductName: 'Quiet tower air cooler',
          Categories: ['home-living'],
        }),
      );
    });
    expect(trackViewedItem).toHaveBeenCalledWith(
      expect.objectContaining({
        ItemId: 'air-cooler',
        Title: 'Quiet tower air cooler',
      }),
    );
  });
});
