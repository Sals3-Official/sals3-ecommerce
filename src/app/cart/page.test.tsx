import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addCartItem, CART_STORAGE_KEY, EMPTY_CART } from '@/lib/cart';
import { findDestination } from '@/lib/destination/destinations';
import { resolveDestination } from '@/lib/destination/resolve';
import { fetchIndicativeRate } from '@/lib/fx/rates';
import fetchFreeShippingThresholds from '@/lib/fx/free-shipping-thresholds';
import { KLAVIYO_CONSENT_ACCEPTED } from '@/lib/klaviyo/consent';
import { usd } from '@/lib/money';
import renderWithCart from '../../../test/render-with-cart';
import CartPage, { generateMetadata } from './page';

/*
  `resolveDestination` reads `cookies()`, and jsdom has no request. Australia is
  a destination checkout accepts, so `DestinationNotice` renders nothing here
  and these assertions stay about the cart; the notice has its own tests.
*/
/*
  The cart reprices through a Server Action now. Next turns a `'use server'`
  import from a client component into a reference; under vitest it is a real
  import, and this module's own imports are `server-only`. Same mock the
  checkout flow test uses, for the same reason.

  It answers `ok: false`, which is the do-nothing branch: the cart keeps the
  prices it has. Repricing has its own coverage in `reprice.test.ts`; these
  cases are about the cart.
*/
vi.mock('@/app/checkout/actions', () => ({
  repriceCartAction: vi.fn(async () => ({ ok: false, message: 'no' })),
}));

vi.mock('@/lib/destination/resolve', () => ({
  resolveDestination: vi.fn().mockResolvedValue(findDestination('AU')),
}));

/*
  The header's half of the same feature. It is an async Server Component, which
  React refuses to render outside RSC — left alone it would log an error into
  every assertion below without failing one, which is the worst of both.
*/
vi.mock('@/components/layout/HeaderDestination', () => ({
  default: () => null,
}));

/*
  The FX fetch. Mocked rather than left to run: unmocked it would put a real
  request to a third party into every assertion in this file, and the rate it
  returned would change what the page renders from one day to the next. `null`
  is the default because it is the state that must render nothing extra — the
  tests that want a rate opt in.
*/
vi.mock('@/lib/fx/rates', () => ({
  fetchIndicativeRate: vi.fn().mockResolvedValue(null),
}));

/*
  The buffer is the second half of the local figure: without one, no local price
  renders at all (see `toIndicativePrice`). Mocked to a live-shaped 1.5% so the
  cases that opt into a rate still get a figure, and so this suite does not
  reach the Portal.
*/
vi.mock('@/lib/fx/buffer', () => ({
  default: vi.fn().mockResolvedValue(1.5),
}));

/*
  Same reasoning as the FX mocks above: unmocked, this would put a real
  request to the Portal into every assertion in this file. `{}` is the
  default because it is the state that must render the original amount-free
  copy — the tests that want a destination-scoped estimate opt in.
*/
vi.mock('@/lib/fx/free-shipping-thresholds', () => ({
  default: vi.fn().mockResolvedValue({}),
  EMPTY_FREE_SHIPPING_THRESHOLDS: {},
}));

describe('Cart page', () => {
  function acceptAnalytics() {
    window.localStorage.setItem(
      'sals3_klaviyo_consent_v1',
      JSON.stringify({
        decision: KLAVIYO_CONSENT_ACCEPTED,
        decidedAt: '2026-08-08T00:00:00.000Z',
      }),
    );
  }

  it('shows an empty-cart message with no saved items', async () => {
    renderWithCart(await CartPage());

    expect(
      screen.getByRole('heading', { level: 1, name: /your cart is empty/i }),
    ).toBeInTheDocument();
  });

  it('renders line items and the subtotal from a saved cart', async () => {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: '1',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(99900),
      },
      2,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(await CartPage());

    expect(
      await screen.findByText(/essence mascara lash princess/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /cart \(2 items\)/i }),
    ).toBeInTheDocument();
    // One line at qty 2, so the line total and the cart subtotal match.
    expect(screen.getAllByText('US$1,998')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: /proceed to checkout/i }),
    ).toHaveAttribute('href', '/checkout');
  });

  /**
   * `addCartItem` appends, so storage order is oldest-first — correct for
   * finding the same line again on a repeat add. Display order is the
   * opposite on purpose: a buyer expects the thing they just added to be the
   * first row they see, not the last.
   */
  it('shows the most recently added line first', async () => {
    const firstAdded = addCartItem(
      EMPTY_CART,
      {
        productId: 'first-added',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(1000),
      },
      1,
    );
    const bothAdded = addCartItem(
      firstAdded,
      {
        productId: 'second-added',
        title: 'Quiet Tower Air Cooler',
        imageAlt: 'Quiet tower air cooler',
        tone: 'meadow',
        unitPrice: usd(2000),
      },
      1,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(bothAdded));

    renderWithCart(await CartPage());

    await screen.findByText(/essence mascara/i);

    const titles = screen
      .getAllByText(/essence mascara|quiet tower air cooler/i)
      .map((el) => el.textContent);

    expect(titles).toEqual([
      'Quiet Tower Air Cooler',
      'Essence Mascara Lash Princess',
    ]);
  });

  /**
   * "Only what's checked gets checked out" is the whole feature, so the panel
   * that answers "what am I about to pay for" has to move the moment a line
   * is unchecked — the heading above it stays the cart's own total on purpose,
   * since it answers a different question.
   */
  describe('selecting which lines to check out', () => {
    function seedTwoLines() {
      const withFirst = addCartItem(
        EMPTY_CART,
        {
          productId: '1',
          title: 'Essence Mascara Lash Princess',
          imageAlt: 'Essence Mascara Lash Princess product image',
          tone: 'ocean',
          unitPrice: usd(10000),
        },
        1,
      );
      const withBoth = addCartItem(
        withFirst,
        {
          productId: '2',
          title: 'Quiet Tower Air Cooler',
          imageAlt: 'Quiet tower air cooler',
          tone: 'meadow',
          unitPrice: usd(5000),
        },
        1,
      );

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(withBoth));
    }

    it('starts with every line checked and the summary reading the whole cart', async () => {
      seedTwoLines();

      renderWithCart(await CartPage());

      await screen.findByText(/essence mascara/i);
      expect(
        screen.getByRole('checkbox', {
          name: /select essence mascara lash princess/i,
        }),
      ).toBeChecked();
      expect(
        screen.getByRole('checkbox', {
          name: /select quiet tower air cooler/i,
        }),
      ).toBeChecked();
      expect(screen.getByText('US$150')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /proceed to checkout/i }),
      ).toBeInTheDocument();
    });

    it('narrows the summary to what stays checked', async () => {
      seedTwoLines();

      renderWithCart(await CartPage());

      await screen.findByText(/essence mascara/i);
      fireEvent.click(
        screen.getByRole('checkbox', {
          name: /select quiet tower air cooler/i,
        }),
      );

      // One US$100 line left selected out of the US$150 cart — its own price
      // and the new summary subtotal now read the same figure, same as the
      // single-line seed above.
      expect(screen.getAllByText('US$100')).toHaveLength(2);
      expect(screen.queryByText('US$150')).not.toBeInTheDocument();
    });

    it('replaces "Proceed to Checkout" with a disabled control once nothing is selected', async () => {
      seedTwoLines();

      renderWithCart(await CartPage());

      await screen.findByText(/essence mascara/i);
      fireEvent.click(
        screen.getByRole('checkbox', { name: /deselect all items/i }),
      );

      expect(
        screen.queryByRole('link', { name: /proceed to checkout/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /select an item to check out/i }),
      ).toBeDisabled();
    });

    it('the "select all" checkbox re-checks every line', async () => {
      seedTwoLines();

      renderWithCart(await CartPage());

      await screen.findByText(/essence mascara/i);
      fireEvent.click(
        screen.getByRole('checkbox', {
          name: /select quiet tower air cooler/i,
        }),
      );
      fireEvent.click(
        screen.getByRole('checkbox', { name: /select all items/i }),
      );

      expect(screen.getByText('US$150')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /proceed to checkout/i }),
      ).toBeInTheDocument();
    });
  });

  /**
   * Added 2026-09-01, updated the same day once the badge replaced the
   * original grey teaser line. No dollar figure and no named country: this
   * page does not know the buyer's destination (see `CartPageClient`'s own
   * comment), so the notice states that the mechanism exists without
   * anchoring a specific threshold to a guess.
   */
  it('shows the free-shipping notice without naming a country or an amount', async () => {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: '1',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(99900),
      },
      1,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(await CartPage());

    const notice = await screen.findByText(
      'Free Standard delivery on qualifying orders',
    );

    expect(notice).toBeInTheDocument();
    // The page legitimately shows real prices elsewhere (the subtotal); the
    // assertion is that the notice's OWN text carries no dollar figure.
    expect(notice.textContent ?? '').not.toMatch(/\$\d/);
  });

  /**
   * Two reversals on the same day. The 2026-09-01 morning change let the
   * notice name the resolved destination alongside the amount, on the
   * reasoning that `IndicativePriceLine` already trusted the same geo-IP
   * guess for a priced figure. The afternoon reversed just the naming: a
   * specific country stated out loud reads as a claim about *where this
   * buyer is*, a stronger assertion than "here is roughly what this could
   * cost" — see `FreeShippingNotice`'s own doc comment. The dollar amount
   * stays; only the country is gone from the sentence.
   */
  it('shows the amount remaining once a threshold resolves, without naming the destination', async () => {
    vi.mocked(fetchFreeShippingThresholds).mockResolvedValueOnce({
      AU: 2500,
    });
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: '1',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(1000),
      },
      1,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(await CartPage());

    expect(
      await screen.findByText('Add US$15 more for free Standard delivery'),
    ).toBeInTheDocument();
  });

  it('is not indexed', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('tracks cart view, quantity change, and removal after analytics consent', async () => {
    const track = vi.fn();
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: '1',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(99900),
      },
      1,
    );

    acceptAnalytics();
    window.klaviyo = { track };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(await CartPage());

    await screen.findByText(/essence mascara lash princess/i);
    await waitFor(() => {
      expect(track).toHaveBeenCalledWith(
        'Cart Viewed',
        expect.objectContaining({
          ItemNames: ['Essence Mascara Lash Princess'],
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    expect(track).toHaveBeenCalledWith(
      'Cart Quantity Changed',
      expect.objectContaining({ ProductID: '1', NextQuantity: 2 }),
    );
    expect(track).toHaveBeenCalledWith(
      'Cart Item Removed',
      expect.objectContaining({ ProductID: '1', Quantity: 2 }),
    );
  });

  /**
   * The approximate local total. USD is what is charged and stays present and
   * prominent in every case below; the local figure is the extra that is either
   * right or absent.
   */
  describe('the approximate local total', () => {
    function seedOneLine() {
      const seeded = addCartItem(
        EMPTY_CART,
        {
          productId: '1',
          title: 'Essence Mascara Lash Princess',
          imageAlt: 'Essence Mascara Lash Princess product image',
          tone: 'ocean',
          unitPrice: usd(99900),
        },
        2,
      );

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));
    }

    it('renders the local total and its note beside the USD subtotal', async () => {
      vi.mocked(fetchIndicativeRate).mockResolvedValueOnce({
        currency: 'AUD',
        rate: 2,
        asOf: '2026-08-27',
      });
      seedOneLine();

      renderWithCart(await CartPage());

      // The line total and the subtotal, unchanged: the charge is still USD.
      expect(await screen.findAllByText('US$1,998')).toHaveLength(2);
      // One conversion, against the subtotal only — never per line, and
      // carrying the Portal's 1.5% buffer: 199800 x 2 x 1.015.
      expect(screen.getByText(/A\$4,055\.94/)).toBeInTheDocument();
      expect(
        screen.getByText(/you are charged in us dollars/i),
      ).toBeInTheDocument();
    });

    /*
      The currency follows the destination the buyer chose. Until 2026-08-28 it
      followed the shopfront in the URL, which showed AUD to a reader in Manila
      because `/au` said so; there is no shopfront in a URL any more, and the
      buyer's own choice is the only honest answer to "local to whom".
    */
    it("asks for the currency of the buyer's destination", async () => {
      vi.mocked(resolveDestination).mockResolvedValueOnce(
        findDestination('PH'),
      );
      seedOneLine();

      renderWithCart(await CartPage());

      expect(fetchIndicativeRate).toHaveBeenCalledWith('PHP');
    });

    /*
      `rates.ts` pins each currency to a named central bank, and New Zealand, the
      United States, Canada and Global have no such entry. No provider means no
      figure — never one converted through a rate nobody named.
    */
    it('asks for no rate at all where none can be sourced', async () => {
      vi.mocked(resolveDestination).mockResolvedValueOnce(
        findDestination('NZ'),
      );
      seedOneLine();
      // Nothing resets this mock between tests in this file, and "was never
      // called" is the whole assertion.
      vi.mocked(fetchIndicativeRate).mockClear();

      const { container } = renderWithCart(await CartPage());

      expect(await screen.findAllByText('US$1,998')).toHaveLength(2);
      expect(fetchIndicativeRate).not.toHaveBeenCalled();
      expect(container.textContent ?? '').not.toMatch(/approximate/i);
    });

    /** No rate means nothing extra — not a dash, not a placeholder. */
    it('renders nothing extra when there is no rate', async () => {
      seedOneLine();

      const { container } = renderWithCart(await CartPage());

      expect(await screen.findAllByText('US$1,998')).toHaveLength(2);

      const text = container.textContent ?? '';

      expect(text).not.toMatch(/approximate/i);
      expect(text).not.toMatch(/A\$/);
      expect(text).not.toMatch(/≈/);
    });
  });
});
