import { screen, waitFor } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBuyerSession } from '@/lib/auth/dal';
import {
  addCartItem,
  CART_STORAGE_KEY,
  CLEARED_CHECKOUTS_STORAGE_KEY,
  EMPTY_CART,
  parseCartState,
} from '@/lib/cart';
import { usd } from '@/lib/money';
import { retrieveStripeCheckoutSession } from '@/services/stripe/checkout';
import renderWithCart from '../../../../test/render-with-cart';
import CheckoutSuccessPage, { generateMetadata } from './page';

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

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/dal', () => ({
  getBuyerSession: vi.fn(),
}));

vi.mock('@/services/stripe/checkout', () => ({
  retrieveStripeCheckoutSession: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  /*
   * Next's `redirect` throws `NEXT_REDIRECT` to unwind the render. A mock that
   * returned normally would let the component keep running past the guard, so
   * the test would pass against code that never actually stops.
   */
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const mockedGetBuyerSession = vi.mocked(getBuyerSession);
const mockedRetrieveSession = vi.mocked(retrieveStripeCheckoutSession);
const mockedRedirect = vi.mocked(redirect);

const BUYER_EMAIL = 'buyer@example.com';

function stripeSession(overrides: Record<string, unknown> = {}) {
  return {
    payment_status: 'paid',
    status: 'complete',
    amount_total: 3335,
    currency: 'usd',
    customer_details: { email: BUYER_EMAIL },
    metadata: {
      sals3_line_count: '1',
      sals3_shipping_total_minor: '409',
      sals3_shipping_options: 'pkg_1:opt_1:chan_1:409:12-20',
    },
    line_items: {
      data: [
        {
          id: 'li_hat',
          description: "Men's Cold-proof Woolen Hat",
          quantity: 2,
          amount_total: 1312,
          currency: 'usd',
        },
        {
          id: 'li_ship',
          description: 'Shipping - CJPacket Postal',
          quantity: 1,
          amount_total: 409,
          currency: 'usd',
        },
      ],
    },
    payment_intent: {
      shipping: {
        name: 'Buyer Example',
        phone: '+639171234567',
        address: {
          line1: '123 Main Street',
          city: 'Manila',
          state: 'National Capital Region (NCR)',
          postal_code: '1000',
          country: 'PH',
        },
      },
    },
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof retrieveStripeCheckoutSession>>;
}

function seedCart() {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(
      addCartItem(
        EMPTY_CART,
        {
          productId: 'hat',
          title: 'Woolen hat',
          imageAlt: 'Woolen hat',
          tone: 'ocean',
          unitPrice: usd(656),
        },
        2,
      ),
    ),
  );
}

function storedCartCount() {
  return parseCartState(window.localStorage.getItem(CART_STORAGE_KEY)).items
    .length;
}

function renderPage(sessionId = 'cs_test_123') {
  return CheckoutSuccessPage({
    searchParams: Promise.resolve({ session_id: sessionId }),
  });
}

describe('Checkout success page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedGetBuyerSession.mockResolvedValue({
      uid: 'buyer-123',
      email: BUYER_EMAIL,
    });
    mockedRetrieveSession.mockResolvedValue(stripeSession());
  });

  it('empties the cart once the order is paid', async () => {
    seedCart();
    expect(storedCartCount()).toBe(1);

    renderWithCart(await renderPage());

    await waitFor(() => expect(storedCartCount()).toBe(0));
  });

  /*
   * The receipt is a page buyers come back to — Back after shopping on, a link
   * out of history, a second tab. Emptying again would wipe a cart filled after
   * the purchase, which reads as the app losing the buyer's data.
   */
  it('leaves a cart filled after the purchase alone on a return visit', async () => {
    renderWithCart(await renderPage());
    await waitFor(() =>
      expect(
        window.localStorage.getItem(CLEARED_CHECKOUTS_STORAGE_KEY),
      ).toContain('cs_test_123'),
    );

    seedCart();
    renderWithCart(await renderPage());

    await waitFor(() =>
      expect(
        screen.getAllByRole('heading', { name: /payment received/i }).length,
      ).toBeGreaterThan(0),
    );
    expect(storedCartCount()).toBe(1);
  });

  /* A declined payment leaves the buyer needing their cart to retry with. */
  it('keeps the cart when the checkout did not complete', async () => {
    mockedRetrieveSession.mockResolvedValue(
      stripeSession({ payment_status: 'unpaid', status: 'open' }),
    );
    seedCart();

    renderWithCart(await renderPage());

    await screen.findByRole('heading', { name: /checkout not completed/i });
    expect(storedCartCount()).toBe(1);
  });

  it('keeps the cart when the receipt belongs to another account', async () => {
    mockedGetBuyerSession.mockResolvedValue({
      uid: 'other-buyer',
      email: 'someone.else@example.com',
    });
    seedCart();

    renderWithCart(await renderPage());

    await screen.findByRole('heading', { name: /checkout not verified/i });
    expect(storedCartCount()).toBe(1);
  });

  it('is not indexed', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('sends a signed-out visitor to sign in', async () => {
    mockedGetBuyerSession.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/login?next=checkout');
    expect(mockedRetrieveSession).not.toHaveBeenCalled();
  });

  it('shows the purchased items, shipping address, and delivery option', async () => {
    renderWithCart(await renderPage());

    expect(
      screen.getByRole('heading', { name: /payment received/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/men's cold-proof woolen hat/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/qty 2/i)).toBeInTheDocument();
    expect(screen.getByText('US$13.12')).toBeInTheDocument();

    expect(screen.getByText('Buyer Example')).toBeInTheDocument();
    expect(screen.getByText(/123 Main Street, Manila/)).toBeInTheDocument();

    expect(screen.getByText('CJPacket Postal')).toBeInTheDocument();
    expect(screen.getByText(/arrives in 12-20 days/i)).toBeInTheDocument();
    expect(screen.getByText(/shipping us\$4\.09/i)).toBeInTheDocument();
  });

  it('keeps the shipping line out of the item list', async () => {
    renderWithCart(await renderPage());

    expect(screen.getByRole('heading', { name: /^1 item$/i })).toBeVisible();
    expect(screen.queryByText(/shipping - cjpacket/i)).not.toBeInTheDocument();
  });

  /*
   * A session id is not a credential: it rides in the URL, into history and
   * anything the buyer pastes. Holding one must not reveal another customer's
   * name, phone, and street address.
   */
  it('refuses a session that belongs to another account', async () => {
    mockedGetBuyerSession.mockResolvedValue({
      uid: 'other-buyer',
      email: 'someone.else@example.com',
    });

    renderWithCart(await renderPage());

    expect(
      screen.getByRole('heading', { name: /checkout not verified/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Buyer Example')).not.toBeInTheDocument();
    expect(screen.queryByText(/123 Main Street/)).not.toBeInTheDocument();
    expect(screen.getByText('Amount unavailable')).toBeInTheDocument();
  });

  it('refuses when the account has no verified email to compare', async () => {
    mockedGetBuyerSession.mockResolvedValue({ uid: 'buyer-123' });

    renderWithCart(await renderPage());

    expect(screen.queryByText('Buyer Example')).not.toBeInTheDocument();
  });

  it('offers one way forward and no route back to the empty cart', async () => {
    renderWithCart(await renderPage());

    const cta = screen.getByRole('link', {
      name: /check out more of our products/i,
    });

    expect(cta).toHaveAttribute('href', '/');
    expect(cta).toHaveClass('text-white');
    expect(
      screen.queryByRole('link', { name: /back to cart/i }),
    ).not.toBeInTheDocument();
  });

  it('reports an unverifiable session without leaking why', async () => {
    mockedRetrieveSession.mockRejectedValue(new Error('stripe is down'));

    renderWithCart(await renderPage());

    expect(
      screen.getByRole('heading', { name: /checkout not verified/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stripe is down/i)).not.toBeInTheDocument();
  });

  it('still shows the order when payment is only processing', async () => {
    mockedRetrieveSession.mockResolvedValue(
      stripeSession({ payment_status: 'unpaid', status: 'complete' }),
    );

    renderWithCart(await renderPage());

    expect(
      screen.getByRole('heading', { name: /payment processing/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/men's cold-proof woolen hat/i),
    ).toBeInTheDocument();
  });
});

/**
 * The 2026-08-28 failure: a buyer paid, the order was created and paid at the
 * supplier seven seconds later, and this page told them the checkout was not
 * theirs — because it compared their account address with the contact address
 * they had typed into the checkout form, and those differed.
 */
describe('Checkout success page buyer identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedGetBuyerSession.mockResolvedValue({
      uid: 'buyer-123',
      email: BUYER_EMAIL,
    });
  });

  it('shows the receipt when the uid matches, whatever address was typed', async () => {
    mockedRetrieveSession.mockResolvedValue(
      stripeSession({
        customer_details: { email: 'typed-at-checkout@example.com' },
        metadata: { sals3_buyer_uid: 'buyer-123' },
      }),
    );

    renderWithCart(await renderPage());

    expect(screen.getByText('Payment received')).toBeInTheDocument();
  });

  /**
   * Once a session carries a uid, the email is not a fallback: allowing one
   * would mean anyone who got a receipt's contact address onto their own
   * account could read it.
   */
  it('refuses a matching address when the uid belongs to someone else', async () => {
    mockedRetrieveSession.mockResolvedValue(
      stripeSession({
        customer_details: { email: BUYER_EMAIL },
        metadata: { sals3_buyer_uid: 'someone-else' },
      }),
    );

    renderWithCart(await renderPage());

    expect(screen.getByText('Checkout not verified')).toBeInTheDocument();
  });

  /** Sessions created before the uid existed still verify by address. */
  it('still verifies a pre-uid session by its contact address', async () => {
    mockedRetrieveSession.mockResolvedValue(
      stripeSession({ customer_details: { email: BUYER_EMAIL } }),
    );

    renderWithCart(await renderPage());

    expect(screen.getByText('Payment received')).toBeInTheDocument();
  });
});
