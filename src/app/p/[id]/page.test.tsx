import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CART_STORAGE_KEY } from '@/lib/cart';
import { KLAVIYO_CONSENT_ACCEPTED } from '@/lib/klaviyo/consent';
import { STOREFRONT_PRODUCTS_PATH } from '@/services/products';
import { resetRateMemoForTests } from '@/lib/fx/rates';
import renderWithCart from '../../../../test/render-with-cart';
import ProductPage, { generateMetadata } from './page';

/*
  The buffer is the second half of the local figure: without one, no local price
  renders at all (see `toIndicativePrice`). Mocked to the live 1.5% so this suite
  exercises the rate path for real without also reaching the Portal.
*/
vi.mock('@/lib/fx/buffer', () => ({
  default: vi.fn().mockResolvedValue(1.5),
}));

/*
  `HeaderDestination` reads `cookies()` to resolve the buyer's shipping
  destination, so it is an async Server Component and React refuses to render it
  outside RSC. Left alone it would log an error into every assertion in this
  file without failing one, which is the worst of both. The picker it renders
  has its own tests.
*/
/*
  `resolveDestination` reads `cookies()`, which jsdom has no request for. The
  page itself stopped asking when the approximate local price was removed, but
  the header still does, so the mock stays.
*/
vi.mock('@/lib/destination/resolve', () => ({
  resolveDestination: vi
    .fn()
    .mockResolvedValue({ code: 'AU', label: 'Australia', isGlobal: false }),
}));

vi.mock('@/components/layout/HeaderDestination', () => ({
  default: () => null,
}));

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

/** The FX host. Its own constant so the assertions can count its requests. */
const FX_HOST = 'api.frankfurter.dev';

function mockFetch({
  found = true,
  status,
  productOverrides = {},
  indicativeRate = null,
}: {
  found?: boolean;
  /** A non-404 failure, to exercise the error path. */
  status?: number;
  productOverrides?: Partial<Record<string, unknown>>;
  /**
   * Units of the local currency per USD, or `null` for a host that answers
   * nothing usable. `null` is the default: no local price is the state every
   * other test in this file already assumes.
   */
  indicativeRate?: number | null;
} = {}) {
  const product = productFixture(productOverrides);
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    const requestUrl = new URL(String(url));

    if (requestUrl.hostname === FX_HOST) {
      if (indicativeRate === null) {
        return new Response('Not found', { status: 404 });
      }

      // Today's date, not a literal: the rate module refuses anything older
      // than seven days, so a pinned date would turn this test into a
      // time bomb that passes the week it was written.
      const date = new Date().toISOString().slice(0, 10);
      const currency = requestUrl.pathname.split('/').pop() ?? 'AUD';

      /*
        The real shape of `/v2/rate/{base}/{quote}`: a scalar `rate` and a
        `quote`, NOT a `rates` object. This fixture said `rates` until
        2026-08-28, and it was wrong in exactly the way the module under test
        was wrong — both written from the same misreading of the docs, so the
        pair agreed with each other while neither agreed with the API. Copied
        from a live response; `rates.contract.test.ts` keeps them honest.
      */
      return new Response(
        JSON.stringify({
          date,
          base: 'USD',
          quote: currency,
          rate: indicativeRate,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

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
  /*
    The rate module remembers a failure for five minutes so an outage does not
    cost a live request per render. That state is module-scoped, so a case here
    that stubs a 404 would otherwise silence every case after it in this file —
    which is exactly how the two FX cases below started failing once the memo
    landed. Test-order coupling is the price of the memo, and this is where it
    is paid.
  */
  beforeEach(() => {
    resetRateMemoForTests();
  });

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
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
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
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    expect(
      screen.queryByRole('heading', { name: /about this product/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /specifications/i }),
    ).not.toBeInTheDocument();
    // The reviews section is the one deliberate exception to the rule above:
    // it renders on every product, because a buyer who scrolls to where reviews
    // live and finds nothing cannot tell "none yet" from a broken page. What it
    // must never do is invent a figure — no average, and no nought out of five.
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(screen.queryByText(/\d\.\d out of 5/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it("renders description, supplier details, and the ledger's stock row when the portal sends them", async () => {
    mockFetch({
      productOverrides: {
        availability: 'AVAILABLE',
        description: {
          blocks: [{ type: 'paragraph', text: 'A quiet tower cooler.' }],
        },
        specs: { sku: 'S3V-2268B366F762', weightGrams: 4200, condition: 'NEW' },
      },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    expect(screen.getByText('A quiet tower cooler.')).toBeInTheDocument();
    expect(screen.getByText('4,200 g')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    // The stock claim now lives in the evidence ledger rather than in a separate
    // notice, and a filled mark there means "the payload supports this".
    expect(
      screen.getByText(/reported available by the supplier/i),
    ).toBeInTheDocument();
    // The lead paragraph is promoted out of the description, so it appears
    // exactly once on the page.
    expect(screen.getAllByText('A quiet tower cooler.')).toHaveLength(1);
  });

  /**
   * This page used to hide the Sals3 SKU from every readable string. The owner
   * reversed that 2026-08-30: the code is how a listing is quoted between the
   * Portal, an order line and a support thread, and search now finds a product
   * by it, so a buyer who cannot see it cannot use any of that.
   *
   * What did not change is *where* it may appear. It is printed once, as the
   * identity line above the specifications grid, and nowhere else — above all
   * not as an option chip's name, where a digest replaces the supplier's own
   * words for a colour. So this asserts the count, not the absence.
   *
   * `<script>` is still excluded from the readable clone: JSON-LD carries `sku`
   * for machines and always did, and folding that into the visible count would
   * make this test pass for the wrong reason.
   */
  it('prints the Sals3 SKU exactly once, and keeps it in structured data', async () => {
    mockFetch({
      productOverrides: {
        specs: { sku: 'S3V-2268B366F762', weightGrams: 4200 },
        variants: [
          {
            id: 'v1',
            sku: 'S3V-AAAABBBBCCCC',
            currency: 'USD',
            priceMinor: 199900,
            availability: 'AVAILABLE',
            options: [{ name: 'Colour', value: 'Black' }],
          },
          {
            id: 'v2',
            sku: 'S3V-DDDDEEEEFFFF',
            currency: 'USD',
            priceMinor: 209900,
            availability: 'AVAILABLE',
            options: [{ name: 'Colour', value: 'White' }],
          },
        ],
      },
    });

    const { container } = renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );
    function visibleCodes(): string[] {
      const readable = container.cloneNode(true) as HTMLElement;

      readable.querySelectorAll('script').forEach((node) => node.remove());

      return (readable.textContent ?? '').match(/S3V-[0-9A-F]{12}/g) ?? [];
    }

    /*
      Nothing is chosen on arrival since 2026-08-31, and every variant carries
      its own code — so there is no honest one to print yet. Printing either of
      these two would be right for one colour and quietly wrong for the other.
    */
    expect(visibleCodes()).toEqual([]);
    expect(screen.queryByText('Sals3 SKU')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Black' }));

    // One code on the page: the chosen variant's, on the identity line.
    expect(visibleCodes()).toEqual(['S3V-AAAABBBBCCCC']);
    expect(screen.getByText('Sals3 SKU')).toBeInTheDocument();

    // Never as a chip. The chips carry the supplier's words for the option.
    screen.getAllByRole('link').forEach((link) => {
      expect(link.textContent ?? '').not.toMatch(/S3V-/);
    });

    // Still in the machine-readable payload, which is where it always belonged.
    expect(container.innerHTML).toContain('S3V-2268B366F762');
  });

  /**
   * Two sections, two provenance lines. One footnote cannot cover both: "as
   * reported by the supplier" becomes false the moment a seller-entered
   * attribute appears under it.
   */
  it('separates seller declarations from supplier-reported facts', async () => {
    mockFetch({
      productOverrides: {
        specs: { weightGrams: 4200 },
        specification: [{ label: 'Material', value: 'ABS plastic' }],
      },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    expect(
      screen.getByRole('heading', { name: /product specifications/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /supplier details/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABS plastic')).toBeInTheDocument();
    expect(
      screen.getByText(/entered by the seller against this category/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/as reported by the supplier/i),
    ).toBeInTheDocument();
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
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    // Named axes are the one case where a row may carry its name, because the
    // name comes from the database rather than from parsing a supplier string.
    // Links, not radios: selection lives in the URL so the price stays
    // server-rendered (ADR-016).
    const colour = screen.getByRole('list', { name: /colour/i });

    expect(colour).toBeVisible();
    // Black is available and links; White is UNAVAILABLE and is rendered
    // unpickable rather than removed from the DOM.
    expect(screen.getByRole('link', { name: 'Black' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'White' }),
    ).not.toBeInTheDocument();
    expect(colour.textContent).toContain('White');
    /*
      Nothing arrives chosen (owner decision 2026-08-31, reversing 2026-08-21):
      no chip is current, purchase is blocked, and the block is stated in words
      naming the axis in the seller's own term for it.
    */
    expect(screen.getByRole('link', { name: 'Black' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    expect(
      screen.getByText('Choose a colour to continue.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Black' }));

    expect(screen.getByRole('link', { name: 'Black' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
    expect(screen.queryByText(/choose a colour/i)).not.toBeInTheDocument();
  });

  it('renders option links and chooses none of them for the buyer', async () => {
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
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    // Options are links, not radios: selection lives in the URL so the price is
    // server-rendered, which is what keeps the page clear of client-side price
    // mutation after paint (ADR-016). `aria-current` replaces `aria-checked`.
    expect(
      screen.getByRole('list', { name: /choose an option/i }),
    ).toBeVisible();

    // These variants carry no supplier label, so chips are positional. A SKU
    // hash is never a chip label, a fallback, or a title attribute.
    const base = screen.getByRole('link', { name: /option 2/i });

    // No chip is current: the buyer has not chosen, and the page no longer
    // chooses the base-priced one for them (owner decision 2026-08-31).
    expect(base).not.toHaveAttribute('aria-current');
    expect(base.getAttribute('href')).toContain('?variant=v-base');
    expect(
      screen.getByRole('list', { name: /choose an option/i }).textContent,
    ).not.toMatch(/S3V-/);
    // The floor price is qualified rather than presented as the product's price.
    // `US$4.51` itself appears twice on purpose — once in the price block and
    // once on its own chip — so this asserts the qualifier and the count instead.
    expect(screen.getByText('From')).toBeVisible();
    expect(
      screen.getByText(/one of the two options cost more than this/i),
    ).toBeVisible();
    // With no axis to name, the sentence falls back to the generic noun.
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    expect(
      screen.getByText('Choose an option to continue.'),
    ).toBeInTheDocument();
  });

  /**
   * The shape **every** real published product has, and which no fixture in this
   * file modelled before: many variants, zero option axes. The portal has no
   * writer for `product_options`, so the axis-based fixtures below exercise a
   * path production never takes. That gap is why the floor-price defect shipped.
   */
  function manyVariants() {
    return [451, 530, 610, 690, 780, 900, 1100, 1400, 1700, 2000].map(
      (priceMinor, index) => ({
        id: `v-${index}`,
        sku: `S3V-${String(index).padStart(12, '0')}`,
        currency: 'USD',
        priceMinor,
        availability: 'AVAILABLE',
      }),
    );
  }

  it('qualifies the floor price and keeps the high price out of the price block', async () => {
    mockFetch({
      productOverrides: {
        priceMinor: 451,
        availability: 'AVAILABLE',
        publishedAt: '2026-08-14T13:49:37.000Z',
        variants: manyVariants(),
      },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    expect(screen.getByText('From')).toBeVisible();
    expect(
      screen.getByText(/nine of the ten options cost more than this/i),
    ).toBeVisible();
    // The floor appears twice on purpose: the price block, and its own chip.
    expect(screen.getAllByText('US$4.51')).toHaveLength(2);
    // The high price exists only as a chip. If it ever appears twice, it has
    // reached the price block and a price extractor can pick it over the floor
    // the feed reports — the ADR-016 mismatch this design exists to prevent.
    expect(screen.getAllByText('US$20')).toHaveLength(1);
    /*
      Purchase is blocked until one of the ten is picked. That is the point of
      the gate on a page like this one: the ten options run from US$4.51 to
      US$20, so a default would have decided a four-fold price difference on the
      buyer's behalf and shown them the answer as though they had chosen it.
    */
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /buy now/i })).toBeDisabled();
    expect(
      screen.getByText(/fixed when published, 14 august 2026/i),
    ).toBeVisible();
  });

  it('server-renders the exact price for a ?variant= selection', async () => {
    mockFetch({
      productOverrides: { priceMinor: 451, variants: manyVariants() },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
        searchParams: Promise.resolve({ variant: 'v-9' }),
      }),
    );

    // No "From": the figure is now a chosen variant's exact price, so the
    // qualifier would be false.
    expect(screen.queryByText('From')).not.toBeInTheDocument();
    expect(screen.getAllByText('US$20')).toHaveLength(2);
    expect(screen.getByText(/the exact price for this option/i)).toBeVisible();
  });

  it('switches same-page variants without another product read', async () => {
    const fetchMock = mockFetch({
      productOverrides: { priceMinor: 451, variants: manyVariants() },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    fetchMock.mockClear();
    fireEvent.click(screen.getByRole('link', { name: /option 10/i }));

    expect(window.location.pathname).toBe('/p/air-cooler');
    expect(window.location.search).toBe('?variant=v-9');
    expect(screen.queryByText('From')).not.toBeInTheDocument();
    expect(screen.getAllByText('US$20')).toHaveLength(2);
    expect(screen.getByText(/the exact price for this option/i)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('syncs the selected variant when browser history changes', async () => {
    mockFetch({
      productOverrides: { priceMinor: 451, variants: manyVariants() },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
        searchParams: Promise.resolve({ variant: 'v-9' }),
      }),
    );

    expect(screen.queryByText('From')).not.toBeInTheDocument();

    window.history.pushState(null, '', '/p/air-cooler');
    window.dispatchEvent(new Event('popstate'));

    await waitFor(() => {
      expect(screen.getByText('From')).toBeVisible();
    });
    expect(
      screen.getByText(/nine of the ten options cost more than this/i),
    ).toBeVisible();
  });

  it('falls back to the default variant when ?variant= is unrecognised', async () => {
    mockFetch({
      productOverrides: { priceMinor: 451, variants: manyVariants() },
    });

    // A stale or hand-edited link is a normal way to arrive at a crawlable URL.
    // It must not 404 and must not throw.
    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
        searchParams: Promise.resolve({ variant: 'no-such-variant' }),
      }),
    );

    expect(screen.getByText('From')).toBeVisible();
    expect(
      screen.getByText(/nine of the ten options cost more than this/i),
    ).toBeVisible();
  });

  /**
   * The real corduroy jacket: two colours by five sizes, labels straight from the
   * supplier. Ten variants collapse to seven chips in two unnamed rows.
   */
  function griddedVariants() {
    const labels = ['Black', 'Army Green'].flatMap((colour) =>
      ['S', 'M', 'L', 'XL', 'XXL'].map((size) => `${colour}-${size}`),
    );

    return labels.map((label, index) => ({
      id: `v-${index}`,
      sku: `S3V-${String(index).padStart(12, '0')}`,
      currency: 'USD',
      // Black-S is the floor, so it is the price the unchosen page quotes.
      priceMinor: label === 'Black-S' ? 451 : 780,
      availability: 'AVAILABLE',
      label,
    }));
  }

  it('renders supplier labels as two unnamed token rows, with no prices and no hashes', async () => {
    mockFetch({
      productOverrides: { priceMinor: 451, variants: griddedVariants() },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    const rows = screen.getAllByRole('list', { name: /choose an option/i });

    expect(rows).toHaveLength(2);

    const optionArea = rows.map((row) => row.textContent ?? '').join(' ');

    // Seven chips for ten variants: 2 colours + 5 sizes.
    expect(
      rows.flatMap((row) => [...row.querySelectorAll('a,span.line-through')]),
    ).toHaveLength(7);
    // A token spans several variants, so it carries no price — which also empties
    // the option area of currency tokens entirely.
    expect(optionArea).not.toMatch(/US\$/);
    // And never a digest.
    expect(optionArea).not.toMatch(/S3V-/);

    /*
      The rows render with nothing chosen, which is the state a buyer now
      arrives in. Before 2026-08-31 this branch required a selection to render
      at all, so an unchosen product fell through to the flat one-chip-per-
      variant list and then changed shape under the buyer's first click.
    */
    expect(screen.getByRole('link', { name: 'Black' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByRole('link', { name: 'S' })).not.toHaveAttribute(
      'aria-current',
    );

    fireEvent.click(screen.getByRole('link', { name: 'Black' }));

    expect(screen.getByRole('link', { name: 'Black' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Swapping one token keeps the other: Army Green + S is v-5.
    expect(
      screen.getByRole('link', { name: 'Army Green' }).getAttribute('href'),
    ).toContain('?variant=v-5');
  });

  /**
   * The real tactical pants, trimmed to the same shape: a sparse grid. Four
   * colour-and-gender values by four sizes describes 16 combinations and the
   * supplier stocks 12 — the `Men`/`Male` values carry `5XL` and no `M`, the
   * `Female`/`Women` values the reverse.
   *
   * On the live product this is 8 x 8 over 52 variants, and until sparse grids
   * were offered the buyer met all 52 labels in one flat wall. What matters here
   * is that the four absent combinations reach them as disabled chips rather than
   * as links that go nowhere.
   */
  function sparseGriddedVariants() {
    const labels = [
      ...['Black Men', 'Gray Male'].flatMap((group) =>
        ['L', 'XL', '5XL'].map((size) => `${group}-${size}`),
      ),
      ...['Black Female', 'Khaki Women'].flatMap((group) =>
        ['M', 'L', 'XL'].map((size) => `${group}-${size}`),
      ),
    ];

    return labels.map((label, index) => ({
      id: `v-${index}`,
      sku: `S3V-${String(index).padStart(12, '0')}`,
      currency: 'USD',
      // `Black Men-L` is the floor, so it is the price the unchosen page quotes.
      priceMinor: label === 'Black Men-L' ? 451 : 780,
      availability: 'AVAILABLE',
      label,
    }));
  }

  it('offers a sparse grid as two rows and disables the combinations that do not exist', async () => {
    mockFetch({
      productOverrides: { priceMinor: 451, variants: sparseGriddedVariants() },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    const rows = screen.getAllByRole('list', { name: /choose an option/i });

    // Two rows rather than twelve chips in one.
    expect(rows).toHaveLength(2);

    /*
      With nothing chosen every size is still reachable, because two of the four
      groups stock `M`. The dead chips are a consequence of a choice, so they
      appear once one has been made — not before it.
    */
    expect(screen.getByRole('link', { name: 'M' })).toBeVisible();

    fireEvent.click(screen.getByRole('link', { name: 'Black Men' }));

    // `M` is unreachable from the chosen `Black Men`, so it is not a link.
    expect(screen.queryByRole('link', { name: 'M' })).toBeNull();

    // It is still shown, as a dead chip naming itself. Scoped to the size row,
    // because plenty of other page text begins with an M.
    const deadChips = [
      ...(rows[1]?.querySelectorAll(':scope > li > span') ?? []),
    ].map((chip) => chip.textContent ?? '');

    expect(deadChips).toEqual(['MUnavailable']);

    // Every size the selected group does stock still navigates.
    expect(screen.getByRole('link', { name: 'XL' })).toBeVisible();
    expect(screen.getByRole('link', { name: '5XL' })).toBeVisible();

    // And swapping the group keeps the chosen size: Gray Male + L is v-3.
    expect(
      screen.getByRole('link', { name: 'Gray Male' }).getAttribute('href'),
    ).toContain('?variant=v-3');
  });

  /*
   * The panel stopped printing a "label · count" line under the price when the
   * default preselection landed, so the supplier's own words for the chosen
   * variant now reach the buyer through the chips (and the cart line). A SKU
   * digest still must not reach either — the identity line below the fold is
   * the one place the code is spelled out, and a chip named `S3V-2268B366F762`
   * would tell a shopper nothing about the colour they are picking.
   */
  it('marks the chosen variant by its supplier label, not its SKU', async () => {
    mockFetch({
      productOverrides: { priceMinor: 451, variants: griddedVariants() },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
        searchParams: Promise.resolve({ variant: 'v-8' }),
      }),
    );

    expect(screen.getByRole('link', { name: 'Army Green' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'XL' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    screen.getAllByRole('link').forEach((link) => {
      expect(link.textContent ?? '').not.toMatch(/S3V-/);
    });
  });

  it('links only Home in the breadcrumb and never guesses a BreadcrumbList URL', async () => {
    mockFetch({
      productOverrides: {
        categoryPath: "Apparel > Outerwear > Men's Jackets",
      },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });

    // `/c/[category]` does not exist and `categoryPath` carries no ancestor
    // slug, so every level except Home is text rather than a dead link.
    expect(nav.querySelectorAll('a')).toHaveLength(1);
    expect(nav.querySelector('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Outerwear')).toBeVisible();

    const breadcrumb = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ]
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .find((entry) => entry['@type'] === 'BreadcrumbList');

    expect(breadcrumb.itemListElement).toHaveLength(5);
    // No NEXT_PUBLIC_SITE_URL in tests, so no absolute URL can be built and no
    // `item` is emitted at all — rather than pointing one at a guess.
    expect(
      breadcrumb.itemListElement.every(
        (item: { item?: string }) => item.item === undefined,
      ),
    ).toBe(true);
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
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain('v-base');
    });
    // The SKU is still stored — it is the fulfilment identifier and downstream
    // needs it. What must not exist is a buyer-facing label built from it: with no
    // supplier label there is no `optionSummary` at all, rather than a digest
    // shown in the cart row.
    const stored = window.localStorage.getItem(CART_STORAGE_KEY) ?? '';

    expect(stored).toContain('v-base');
    expect(stored).not.toContain('optionSummary');
  });

  it('adds the product to the cart when Add to Cart is clicked', async () => {
    mockFetch();

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(screen.getByText(/added to your cart/i)).toBeInTheDocument();
  });

  it('renders notFound for a missing product', async () => {
    mockFetch({ found: false });

    await expect(
      ProductPage({
        params: Promise.resolve({ id: 'does-not-exist' }),
      }),
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
      ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
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

  it("prefers the seller's own meta description over the assembled fallback", async () => {
    mockFetch({
      productOverrides: {
        metaDescription: 'Cools a bedroom without the fan noise.',
      },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'air-cooler' }),
    });

    expect(metadata.description).toBe('Cools a bedroom without the fan noise.');
    expect(metadata.openGraph?.description).toBe(
      'Cools a bedroom without the fan noise.',
    );
  });

  /**
   * Hidden metadata is hidden. Rendering it would put the seller's search
   * snippet in the page body next to the description they wrote for a reader —
   * two different pieces of writing for two different audiences.
   */
  it('never renders the meta description in the page body', async () => {
    mockFetch({
      productOverrides: {
        metaDescription: 'Cools a bedroom without the fan noise.',
      },
    });

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    expect(
      screen.queryByText('Cools a bedroom without the fan noise.'),
    ).not.toBeInTheDocument();
  });

  /**
   * The visible description is deliberately **not** in the fallback chain: a
   * seller who wrote body copy but no meta description gets the assembled
   * fallback, not their first paragraph truncated at 155 characters.
   */
  it('falls back to the assembled description rather than the visible one', async () => {
    mockFetch({
      productOverrides: {
        description: {
          blocks: [{ type: 'paragraph', text: 'A quiet tower cooler.' }],
        },
      },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: 'air-cooler' }),
    });

    expect(metadata.description).toMatch(/home and living/i);
    expect(metadata.description).not.toMatch(/a quiet tower cooler/i);
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
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );

    // Ends at the slug: `/products/air-cooler/reviews` is a different read on
    // a nested path, and counting it here would make this assert "one request
    // under the product path" rather than "one product read", which is not what
    // it is for.
    const productReads = fetchMock.mock.calls.filter((call) => {
      const url = new URL(String(call[0]), 'https://portal.example.com');

      return url.pathname === `${STOREFRONT_PRODUCTS_PATH}/air-cooler`;
    });

    expect(productReads).toHaveLength(1);
  });

  it('tracks a viewed product only after analytics consent', async () => {
    const track = vi.fn();
    const trackViewedItem = vi.fn();

    acceptAnalytics();
    window.klaviyo = { track, trackViewedItem };
    mockFetch();

    renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
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

  /**
   * The page used to resolve an indicative rate on every render and hand it to
   * the record panel, which drew an approximate local figure under the USD
   * price. The owner removed that block 2026-08-30.
   *
   * Two things are asserted here, not one. The figure is gone from the page,
   * and the upstream rate host is never called — the fetch went with the panel
   * that consumed it, so a page still paying for a rate it cannot show would be
   * a silent regression rather than a visible one.
   */
  it('shows no approximate local price and asks no rate host for one', async () => {
    const fetchMock = mockFetch({ indicativeRate: 2 });

    const { container } = renderWithCart(
      await ProductPage({
        params: Promise.resolve({ id: 'air-cooler' }),
      }),
    );
    const text = container.textContent ?? '';

    expect(screen.getByText('US$1,999')).toBeInTheDocument();
    expect(text).not.toMatch(/A\$/);
    expect(text).not.toMatch(/approximate/i);
    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]).includes(FX_HOST)),
    ).toHaveLength(0);
  });
});
