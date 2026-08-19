import { screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBuyerSession } from '@/lib/auth/dal';
import { retrieveStripeCheckoutSession } from '@/services/stripe/checkout';
import renderWithCart from '../../../../test/render-with-cart';
import CheckoutSuccessPage, { generateMetadata } from './page';

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

function renderPage(sessionId = 'cs_test_123') {
  return CheckoutSuccessPage({
    searchParams: Promise.resolve({ session_id: sessionId }),
  });
}

describe('Checkout success page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetBuyerSession.mockResolvedValue({
      uid: 'buyer-123',
      email: BUYER_EMAIL,
    });
    mockedRetrieveSession.mockResolvedValue(stripeSession());
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
