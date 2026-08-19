import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addCartItem, CART_STORAGE_KEY, EMPTY_CART } from '@/lib/cart';
import { usd } from '@/lib/money';
import {
  createCheckoutSessionAction,
  quoteCheckoutShippingAction,
} from '@/app/checkout/actions';
import CheckoutDeliveryStep from '@/components/checkout/CheckoutDeliveryStep';
import CheckoutFlowChrome from '@/components/checkout/CheckoutFlowChrome';
import { CheckoutFlowProvider } from '@/components/checkout/CheckoutFlowProvider';
import CheckoutInformationStep from '@/components/checkout/CheckoutInformationStep';
import CheckoutPaymentStep from '@/components/checkout/CheckoutPaymentStep';
import renderWithCart from '../../../test/render-with-cart';

vi.mock('@/app/checkout/actions', () => ({
  createCheckoutSessionAction: vi.fn(),
  quoteCheckoutShippingAction: vi.fn(),
}));

vi.mock('@/services/stripe/browser', () => ({
  getStripePromise: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  EmbeddedCheckoutProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="embedded-checkout-provider">{children}</div>
  ),
  EmbeddedCheckout: () => <div data-testid="embedded-checkout" />,
}));

/*
 * A stand-in router.
 *
 * The three steps are separate routes now, so the thing worth testing is the
 * journey across them: state has to survive each hop, and each step has to
 * refuse to render when entered without it. `push`/`replace` move a real piece
 * of React state in the harness below, which re-renders the same
 * provider-and-layout tree Next would keep mounted. The module-level `path` is
 * updated first because `CheckoutFlowChrome` reads `usePathname` during that
 * render.
 */
let path = '/checkout';
let navigate: ((next: string) => void) | null = null;

function go(next: string) {
  path = next;
  navigate?.(next);
}

const push = vi.fn(go);
const replace = vi.fn(go);

vi.mock('next/navigation', () => ({
  usePathname: () => path,
  useRouter: () => ({ push, replace }),
}));

const STEPS: Record<string, () => ReactNode> = {
  '/checkout': () => <CheckoutInformationStep />,
  '/checkout/delivery': () => <CheckoutDeliveryStep />,
  '/checkout/payment': () => <CheckoutPaymentStep />,
};

/** Mirrors `src/app/checkout/(flow)/layout.tsx`. */
function CheckoutFlowHarness() {
  const [current, setCurrent] = useState(path);

  // Registered in an effect, not during render: assigning to a module variable
  // while rendering is the side effect React's rules forbid, and the lint rule
  // is right to reject it. Nothing calls `go` before mount — every navigation
  // here comes from a click or a step's own effect.
  useEffect(() => {
    navigate = setCurrent;

    return () => {
      navigate = null;
    };
  }, []);

  return (
    <CheckoutFlowProvider>
      <CheckoutFlowChrome>{STEPS[current]?.() ?? null}</CheckoutFlowChrome>
    </CheckoutFlowProvider>
  );
}

const mockedCreateCheckoutSession = vi.mocked(createCheckoutSessionAction);
const mockedQuoteShipping = vi.mocked(quoteCheckoutShippingAction);

const shippingQuote = {
  quotedAt: '2026-08-19T14:00:00.000Z',
  packages: [{ packageId: 'pkg_1', originCountry: 'CN', itemCount: 1 }],
  quotes: [
    {
      quoteId: 'quote-1',
      packageId: 'pkg_1',
      label: 'Standard' as const,
      cjLogisticName: 'CJPacket Postal',
      optionId: 'option-1',
      channelId: 'channel-1',
      arrivalTime: '12-20',
      amountMinor: 409,
      currency: 'USD' as const,
      originCountry: 'CN',
      destinationCountry: 'PH',
      ruleTips: [],
      expiresAt: '2026-08-19T14:15:00.000Z',
    },
    {
      quoteId: 'quote-2',
      packageId: 'pkg_1',
      label: 'Express' as const,
      cjLogisticName: 'DHL Official',
      optionId: 'option-2',
      channelId: 'channel-2',
      arrivalTime: '3-7',
      amountMinor: 3734,
      currency: 'USD' as const,
      originCountry: 'CN',
      destinationCountry: 'PH',
      ruleTips: [],
      expiresAt: '2026-08-19T14:15:00.000Z',
    },
  ],
};

function seedCart() {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(
      addCartItem(
        EMPTY_CART,
        {
          productId: 'corduroy-jacket',
          title: "Men's Casual Retro Corduroy Jacket Coat",
          imageAlt: 'Corduroy jacket',
          tone: 'ocean',
          unitPrice: usd(2000),
        },
        1,
      ),
    ),
  );
}

async function fillValidAddress() {
  fireEvent.change(await screen.findByLabelText(/^email$/i), {
    target: { value: 'buyer@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^full name$/i), {
    target: { value: 'Buyer Example' },
  });
  fireEvent.change(screen.getByLabelText(/^phone$/i), {
    target: { value: '+639171234567' },
  });
  fireEvent.change(screen.getByLabelText(/address line 1/i), {
    target: { value: '123 Main Street' },
  });
  fireEvent.change(screen.getByLabelText(/state or region/i), {
    target: { value: 'National Capital Region (NCR)' },
  });
  fireEvent.change(screen.getByLabelText(/^city$/i), {
    target: { value: 'Manila' },
  });
  fireEvent.change(screen.getByLabelText(/postal code/i), {
    target: { value: '1000' },
  });
}

async function reachDelivery() {
  await fillValidAddress();
  fireEvent.click(
    screen.getByRole('button', { name: /continue to delivery/i }),
  );
  await screen.findByText(/cjpacket postal/i);
}

async function reachPayment() {
  await reachDelivery();
  fireEvent.click(screen.getByLabelText(/standard.*cjpacket postal/i));
  fireEvent.click(
    await screen.findByRole('button', { name: /go to payment/i }),
  );
  await screen.findByTestId('embedded-checkout');
}

describe('checkout flow across routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    path = '/checkout';
    navigate = null;
    mockedQuoteShipping.mockResolvedValue({ ok: true, quote: shippingQuote });
    mockedCreateCheckoutSession.mockResolvedValue({
      ok: true,
      clientSecret: 'cs_secret_123',
      sessionId: 'cs_test_123',
    });
    seedCart();
  });

  it('quotes the address, then moves to the delivery route', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();

    expect(push).toHaveBeenCalledWith('/checkout/delivery');
    expect(screen.getByText(/123 Main Street/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/address line 1/i)).not.toBeInTheDocument();
  });

  it('keeps the buyer on information when the address is invalid', () => {
    renderWithCart(<CheckoutFlowHarness />);

    fireEvent.click(
      screen.getByRole('button', { name: /continue to delivery/i }),
    );

    expect(
      screen.getByText(/check the highlighted address fields/i),
    ).toBeInTheDocument();
    expect(mockedQuoteShipping).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('prepares Stripe on the delivery step, then moves to the payment route', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachPayment();

    expect(mockedCreateCheckoutSession).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/checkout/payment');
  });

  /*
   * The point of preparing the session on the delivery step: the payment route
   * mounts Stripe on arrival rather than behind a second button the buyer has
   * to find.
   */
  it('mounts Stripe on arrival with no further button to press', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachPayment();

    expect(screen.getByTestId('embedded-checkout')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^payment$/i }),
    ).not.toBeInTheDocument();
  });

  /*
   * Stripe's embedded form states the items, the shipping row, and the total
   * itself. Anything of ours alongside it was a second copy of the same numbers
   * competing to be believed, so the payment route now renders the form and
   * nothing else.
   */
  it('renders the payment form without a summary or totals panel of ours', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachPayment();

    expect(screen.getByTestId('embedded-checkout')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^payment$/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Total today')).not.toBeInTheDocument();
    expect(screen.queryByText('US$24.09')).not.toBeInTheDocument();
  });

  /*
   * Stripe's embedded form draws its own itemised summary, so ours beside it
   * would be a second copy of the same numbers competing to be believed — and
   * it would narrow the payment form to make room. Earlier steps keep it.
   */
  it('gives payment the full width and keeps the summary on the earlier steps', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();
    expect(
      screen.getByRole('heading', { name: /order summary/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/standard.*cjpacket postal/i));
    fireEvent.click(
      await screen.findByRole('button', { name: /go to payment/i }),
    );
    await screen.findByTestId('embedded-checkout');

    expect(
      screen.queryByRole('heading', { name: /order summary/i }),
    ).not.toBeInTheDocument();
  });

  /*
   * Routes hand the buyer a Back button. Re-creating the Stripe session on
   * every bounce would mint duplicate Portal intents and burn CJ freight quota
   * for an order that has not changed.
   */
  it('reuses the prepared session when nothing changed', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachPayment();
    fireEvent.click(screen.getByRole('button', { name: /back to delivery/i }));
    fireEvent.click(
      await screen.findByRole('button', { name: /go to payment/i }),
    );

    await screen.findByTestId('embedded-checkout');
    expect(mockedCreateCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('prepares a new session when the delivery choice changes', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachPayment();
    fireEvent.click(screen.getByRole('button', { name: /back to delivery/i }));
    // A different courier: the prepared session priced the previous one.
    fireEvent.click(await screen.findByLabelText(/express.*dhl official/i));
    fireEvent.click(screen.getByRole('button', { name: /go to payment/i }));

    await waitFor(() =>
      expect(mockedCreateCheckoutSession).toHaveBeenCalledTimes(2),
    );
  });

  it('surfaces a failed session without leaving the delivery step', async () => {
    mockedCreateCheckoutSession.mockResolvedValue({
      ok: false,
      message: 'Stripe checkout failed. Try again in a moment.',
    });
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();
    fireEvent.click(screen.getByLabelText(/standard.*cjpacket postal/i));
    fireEvent.click(screen.getByRole('button', { name: /go to payment/i }));

    expect(
      await screen.findByText(/stripe checkout failed/i),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith('/checkout/payment');
  });

  /* A reload empties the in-memory flow state; there is nothing to recover. */
  it('bounces a direct visit to delivery back to the start', async () => {
    path = '/checkout/delivery';
    renderWithCart(<CheckoutFlowHarness />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/checkout'));
  });

  it('bounces a direct visit to payment back to the start', async () => {
    path = '/checkout/payment';
    renderWithCart(<CheckoutFlowHarness />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/checkout'));
  });

  it('shows the empty-cart panel instead of any step', () => {
    window.localStorage.clear();
    renderWithCart(<CheckoutFlowHarness />);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument();
  });
});
