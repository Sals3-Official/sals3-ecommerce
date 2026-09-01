import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addCartItem,
  CART_STORAGE_KEY,
  EMPTY_CART,
  setLineSelected,
} from '@/lib/cart';
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
      shippingTier: 'Standard' as const,
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
      shippingTier: 'Expedited' as const,
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
  freeShipping: {
    thresholdAmountMinor: 1200,
    subtotalAmountMinor: 1000,
    amountRemainingMinor: 200,
    eligible: false,
    currency: 'USD' as const,
  },
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

/** Two lines, so removing one leaves an observably different basket. */
function seedCartWithTwoLines() {
  const withFirst = addCartItem(
    EMPTY_CART,
    {
      productId: 'corduroy-jacket',
      title: "Men's Casual Retro Corduroy Jacket Coat",
      imageAlt: 'Corduroy jacket',
      tone: 'ocean',
      unitPrice: usd(2000),
    },
    1,
  );
  const withBoth = addCartItem(
    withFirst,
    {
      productId: 'cold-proof-face-mask',
      title: 'Cold-Proof Face Mask',
      imageAlt: 'Face mask',
      tone: 'meadow',
      unitPrice: usd(336),
    },
    1,
  );

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(withBoth));
}

/**
 * The two lines above, with the mask deselected on the cart page before
 * checkout was ever opened — the ordinary path to a partial checkout, as
 * opposed to the delivery-step removal case covered elsewhere in this file.
 */
function seedCartWithOneLineDeselected() {
  const withFirst = addCartItem(
    EMPTY_CART,
    {
      productId: 'corduroy-jacket',
      title: "Men's Casual Retro Corduroy Jacket Coat",
      imageAlt: 'Corduroy jacket',
      tone: 'ocean',
      unitPrice: usd(2000),
    },
    1,
  );
  const withBoth = addCartItem(
    withFirst,
    {
      productId: 'cold-proof-face-mask',
      title: 'Cold-Proof Face Mask',
      imageAlt: 'Face mask',
      tone: 'meadow',
      unitPrice: usd(336),
    },
    1,
  );
  const oneDeselected = setLineSelected(
    withBoth,
    'cold-proof-face-mask',
    false,
  );

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(oneDeselected));
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

async function fillValidFijiAddress() {
  fireEvent.change(await screen.findByLabelText(/^email$/i), {
    target: { value: 'buyer@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^full name$/i), {
    target: { value: 'Buyer Example' },
  });
  fireEvent.change(screen.getByLabelText(/^country$/i), {
    target: { value: 'FJ' },
  });
  fireEvent.change(screen.getByLabelText(/^phone$/i), {
    target: { value: '+6793212345' },
  });
  fireEvent.change(screen.getByLabelText(/address line 1/i), {
    target: { value: '14 Queens Road' },
  });
  fireEvent.change(screen.getByLabelText(/state or region/i), {
    target: { value: 'Western Division' },
  });
  fireEvent.change(screen.getByLabelText(/city or town/i), {
    target: { value: 'Nadi' },
  });
}

async function reachDelivery() {
  await fillValidAddress();
  fireEvent.click(
    screen.getByRole('button', { name: /continue to delivery/i }),
  );
  await screen.findAllByRole('radio', { name: 'Standard' });
}

// No delivery click: the quote arrives with Standard already selected.
// `findByRole` waits for the quote transition to settle — until it does the
// button reads "Preparing payment...".
async function reachPayment() {
  await reachDelivery();
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

  it('quotes a Fiji address', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await fillValidFijiAddress();
    fireEvent.click(
      screen.getByRole('button', { name: /continue to delivery/i }),
    );
    await screen.findAllByRole('radio', { name: 'Standard' });

    expect(mockedQuoteShipping).toHaveBeenCalledWith(
      expect.objectContaining({
        address: expect.objectContaining({
          country: 'FJ',
          phone: '+6793212345',
          region: 'Western Division',
          city: 'Nadi',
          postalCode: '',
        }),
      }),
    );
  });

  /*
   * Every package needs a tier, so a quote that arrives with nothing
   * selected only ever shows the buyer a disabled "Go to payment".
   */
  it('pre-selects Standard for each package', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();

    expect(screen.getByRole('radio', { name: 'Standard' })).toBeChecked();
    expect(
      screen.getByRole('radio', {
        name: 'Express, unavailable for this package',
      }),
    ).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Expedited' })).not.toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(
      screen.queryByText(/cjpacket|dhl official/i),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /go to payment/i }),
    ).toBeEnabled();
  });

  it('renders and selects three fixed tier cards independently per package', async () => {
    mockedQuoteShipping.mockResolvedValue({
      ok: true,
      quote: {
        ...shippingQuote,
        packages: [
          ...shippingQuote.packages,
          { packageId: 'pkg_2', originCountry: 'US', itemCount: 1 },
        ],
        quotes: [
          ...shippingQuote.quotes,
          {
            ...shippingQuote.quotes[0]!,
            quoteId: 'quote-3',
            packageId: 'pkg_2',
            optionId: 'option-3',
            channelId: 'channel-3',
            originCountry: 'US',
          },
        ],
      },
    });
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();

    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getAllByRole('radio', { name: 'Standard' })).toHaveLength(2);
    screen.getAllByRole('radio', { name: 'Standard' }).forEach((radio) => {
      expect(radio).toBeChecked();
    });
    expect(
      await screen.findByRole('button', { name: /go to payment/i }),
    ).toBeEnabled();
  });

  it('lets the buyer switch away from pre-selected Standard', async () => {
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();
    fireEvent.click(screen.getByRole('radio', { name: 'Expedited' }));

    expect(screen.getByRole('radio', { name: 'Expedited' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Standard' })).not.toBeChecked();
    expect(screen.getByText(/shipping US\$37\.34/i)).toBeInTheDocument();
  });

  it('shows free Standard delivery while keeping faster delivery paid', async () => {
    mockedQuoteShipping.mockResolvedValue({
      ok: true,
      quote: {
        ...shippingQuote,
        quotes: [
          {
            ...shippingQuote.quotes[0]!,
            amountMinor: 0,
            regularAmountMinor: 409,
          },
          shippingQuote.quotes[1]!,
        ],
        freeShipping: {
          thresholdAmountMinor: 1200,
          subtotalAmountMinor: 1200,
          amountRemainingMinor: 0,
          eligible: true,
          currency: 'USD',
        },
      },
    });
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();

    expect(
      screen.getByText('FREE Standard delivery unlocked'),
    ).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('US$4.09')).toHaveClass('line-through');
    expect(screen.getByText(/^shipping US\$0$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Expedited' }));
    expect(screen.getByText(/shipping US\$37\.34/i)).toBeInTheDocument();
  });

  /*
   * The quote and the Stripe session are real upstream round trips. Without a
   * visible loader a disabled button reads as a dead click, and the buyer
   * clicks again — which on the delivery step is how duplicate Portal intents
   * get minted.
   */
  it('shows a loading curtain while the delivery quote is in flight', async () => {
    // Initialised to a no-op rather than null: assigning inside the promise
    // callback is invisible to control-flow analysis, and a nullable type would
    // narrow to `null` at the call below.
    let releaseQuote: () => void = () => undefined;
    mockedQuoteShipping.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseQuote = () => resolve({ ok: true, quote: shippingQuote });
        }),
    );
    renderWithCart(<CheckoutFlowHarness />);

    await fillValidAddress();
    fireEvent.click(
      screen.getByRole('button', { name: /continue to delivery/i }),
    );

    const curtain = await screen.findByRole('alert');
    expect(curtain).toHaveTextContent(/loading delivery options/i);
    expect(curtain).toHaveAttribute('aria-busy', 'true');

    releaseQuote();
    await screen.findByRole('radio', { name: 'Standard' });
    // `waitFor`, not a bare assertion: the options render as soon as the quote
    // resolves, but the transition driving `isPending` settles a tick later.
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
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

    fireEvent.click(screen.getByRole('radio', { name: 'Standard' }));
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
    fireEvent.click(await screen.findByRole('radio', { name: 'Expedited' }));
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
    fireEvent.click(
      await screen.findByRole('button', { name: /go to payment/i }),
    );

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

  it('drops a line from the order summary and updates the total', async () => {
    seedCartWithTwoLines();
    renderWithCart(<CheckoutFlowHarness />);

    expect(await screen.findByText(/2 items in cart/i)).toBeInTheDocument();
    expect(screen.getByText('US$23.36')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /remove.*cold-proof face mask/i,
      }),
    );

    expect(screen.getByText(/1 item in cart/i)).toBeInTheDocument();
    expect(screen.queryByText(/cold-proof face mask/i)).not.toBeInTheDocument();
    // Whole amounts stay whole — `formatMoney` drops the trailing `.00`. Two
    // matches, not one: the remaining line's own price and the section total
    // now read identically, since no shipping has been quoted yet.
    expect(screen.getAllByText('US$20')).toHaveLength(2);
  });

  /*
   * The heavier case: a quote already priced the two-line basket, so dropping
   * one has to take the courier prices with it rather than let the buyer pay
   * for a basket that no longer exists. `CheckoutDeliveryStep` reacts to a
   * cleared quote exactly as it does to a cold reload — see the "bounces a
   * direct visit" tests above — so the same recovery path is exercised here
   * for a different cause.
   */
  it('invalidates the quote and returns to information when a line is removed on delivery', async () => {
    seedCartWithTwoLines();
    renderWithCart(<CheckoutFlowHarness />);

    await reachDelivery();
    expect(mockedQuoteShipping).toHaveBeenCalledTimes(1);

    /*
      Real, load-dependent race, found by instrumenting the render: the quote
      transition can commit `shippingQuote` (which is all `reachDelivery`
      waits for — the radios it polls for) one or more renders *before*
      `isPending` itself settles to `false`. The Remove button was still
      `disabled` at click time on a fraction of runs, and React's own event
      system silently drops a click dispatched at a disabled element — a raw
      `addEventListener` on the same node still fired, which is what proved
      it was React declining the click rather than the DOM never receiving
      one. `reachDelivery`'s wait is correct for its own callers; it was never
      meant to guarantee this file's shared `isPending` had also cleared.

      "Go to payment" is the existing idiom for that guarantee — its own
      label reads "Preparing payment..." until `isPending` is false (see
      the "mounts Stripe on arrival" test above), so waiting for its settled
      name is a real synchronization point, not a fixed delay.
    */
    await screen.findByRole('button', { name: /go to payment/i });

    fireEvent.click(
      screen.getByRole('button', {
        name: /remove.*cold-proof face mask/i,
      }),
    );

    await screen.findByLabelText(/^email$/i);
    expect(replace).toHaveBeenCalledWith('/checkout');
    expect(screen.getByText(/1 item in cart/i)).toBeInTheDocument();

    // The address survives — only the quote and the prepared session did not.
    expect(screen.getByDisplayValue('123 Main Street')).toBeInTheDocument();
  });

  /**
   * The core promise of cart-page selection: a line unchecked on `/cart`
   * before checkout was ever opened must never reach the summary, the
   * freight quote, or the total — not just look absent, actually never be
   * sent anywhere.
   */
  it('never quotes, totals, or shows a line the buyer left unchecked', async () => {
    seedCartWithOneLineDeselected();

    renderWithCart(<CheckoutFlowHarness />);

    // The exact line title, not a loose regex: the jacket's own Remove
    // button carries an sr-only "…Corduroy Jacket Coat from this order" that
    // a substring match against "corduroy jacket" would also catch.
    await screen.findByText("Men's Casual Retro Corduroy Jacket Coat");
    expect(screen.queryByText(/cold-proof face mask/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1 item in cart/i)).toBeInTheDocument();
    // Only the jacket's own price appears — nothing sums the mask into it.
    expect(screen.getAllByText('US$20')).toHaveLength(2);

    await reachDelivery();

    const [request] = mockedQuoteShipping.mock.calls[0]!;
    const quotedProductIds = request.cart.items.map((item) => item.productId);

    expect(quotedProductIds).toEqual(['corduroy-jacket']);
  });
});
