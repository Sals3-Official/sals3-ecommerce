import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRevocationCheckedBuyerSession } from '@/lib/auth/dal';
import { validateCheckoutCart } from '@/services/checkout/cart-validation';
import { createStripeCheckoutSession } from '@/services/stripe/checkout';
import requestCheckoutFreightQuotes from '@/services/checkout/freight-quotes';
import createPortalCheckoutIntent from '@/services/checkout/intent';
import { ProductsApiError } from '@/services/storefront/client';
import {
  createCheckoutSessionAction,
  quoteCheckoutShippingAction,
} from './actions';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn(
    async () => new Headers({ 'x-forwarded-for': '203.0.113.10' }),
  ),
}));

vi.mock('@/services/checkout/cart-validation', () => ({
  CheckoutValidationError: class CheckoutValidationError extends Error {},
  validateCheckoutCart: vi.fn(),
}));

vi.mock('@/services/stripe/checkout', () => ({
  createStripeCheckoutSession: vi.fn(),
}));

vi.mock('@/services/checkout/freight-quotes', () => ({
  default: vi.fn(),
}));

vi.mock('@/services/checkout/intent', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/auth/dal', () => ({
  getRevocationCheckedBuyerSession: vi.fn(async () => ({ uid: 'buyer-123' })),
}));

const address = {
  email: 'buyer@example.com',
  fullName: 'Buyer Example',
  phone: '+639171234567',
  addressLine1: '123 Main Street',
  addressLine2: '',
  city: 'Manila',
  region: 'National Capital Region (NCR)',
  postalCode: '1000',
  country: 'PH' as const,
};

const shippingSelection = {
  packageSelections: [
    {
      packageId: 'pkg_1',
      shippingTier: 'Standard' as const,
      quoteId: 'quote-old',
      optionId: 'option-1',
      channelId: 'channel-1',
      cjLogisticName: 'CJPacket Postal',
      arrivalTime: '12-20',
      amountMinor: 409,
      currency: 'USD' as const,
    },
  ],
};

const freightQuote = {
  quotedAt: '2026-08-17T14:00:00.000Z',
  packages: [{ packageId: 'pkg_1', originCountry: 'CN', itemCount: 1 }],
  quotes: [
    {
      quoteId: 'quote-new',
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
      expiresAt: '2026-08-17T14:15:00.000Z',
    },
  ],
};

const mockedGetBuyerSession = vi.mocked(getRevocationCheckedBuyerSession);

describe('createCheckoutSessionAction', () => {
  beforeEach(() => {
    vi.mocked(validateCheckoutCart).mockReset();
    vi.mocked(createStripeCheckoutSession).mockReset();
    vi.mocked(requestCheckoutFreightQuotes).mockReset();
    vi.mocked(createPortalCheckoutIntent).mockReset();
    mockedGetBuyerSession.mockResolvedValue({ uid: 'buyer-123' });
  });

  /*
   * A Server Action is a public POST endpoint whose id is readable in the
   * client bundle, so the redirect on `/checkout` proves nothing about who is
   * calling this. Signed out, nothing downstream may run: no Stripe session,
   * no portal intent, and no CJ freight quote spent.
   */
  it('refuses to create a checkout session for a signed-out caller', async () => {
    mockedGetBuyerSession.mockResolvedValue(null);

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'corduroy-jacket', quantity: 1 }] },
        address,
        shippingSelection,
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Sign in to continue to checkout.',
    });

    expect(validateCheckoutCart).not.toHaveBeenCalled();
    expect(requestCheckoutFreightQuotes).not.toHaveBeenCalled();
    expect(createPortalCheckoutIntent).not.toHaveBeenCalled();
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects an empty cart', async () => {
    await expect(
      createCheckoutSessionAction({
        cart: { items: [] },
        address,
        shippingSelection,
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Check your cart and address, then try again.',
    });
  });

  it('returns an embedded Stripe Checkout client secret for a valid checkout', async () => {
    vi.mocked(validateCheckoutCart).mockResolvedValue({
      lines: [],
      subtotal: { amountMinor: 0, currency: 'USD' },
    });
    vi.mocked(createPortalCheckoutIntent).mockResolvedValue({
      checkoutIntentId: '11111111-1111-4111-8111-111111111111',
    });
    vi.mocked(createStripeCheckoutSession).mockResolvedValue({
      clientSecret: 'cs_test_secret',
      sessionId: 'cs_test_123',
    });
    vi.mocked(requestCheckoutFreightQuotes).mockResolvedValue(freightQuote);

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
        shippingSelection,
      }),
    ).resolves.toEqual({
      ok: true,
      clientSecret: 'cs_test_secret',
      sessionId: 'cs_test_123',
    });
    expect(createPortalCheckoutIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingSelection: {
          packageSelections: [
            expect.objectContaining({
              quoteId: 'quote-new',
              optionId: 'option-1',
              amountMinor: 409,
            }),
          ],
        },
      }),
    );
    expect(createStripeCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutIntentId: '11111111-1111-4111-8111-111111111111',
        shippingSelection: {
          packageSelections: [
            expect.objectContaining({
              quoteId: 'quote-new',
              optionId: 'option-1',
              amountMinor: 409,
            }),
          ],
        },
      }),
    );
  });

  it('quotes shipping options before payment', async () => {
    vi.mocked(requestCheckoutFreightQuotes).mockResolvedValue(freightQuote);

    await expect(
      quoteCheckoutShippingAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
      }),
    ).resolves.toEqual({ ok: true, quote: freightQuote });
  });

  it('refuses to spend CJ freight quota for a signed-out caller', async () => {
    mockedGetBuyerSession.mockResolvedValue(null);

    await expect(
      quoteCheckoutShippingAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Sign in to continue to checkout.',
    });

    expect(requestCheckoutFreightQuotes).not.toHaveBeenCalled();
  });

  it('shows safe portal quote validation messages', async () => {
    vi.mocked(requestCheckoutFreightQuotes).mockRejectedValue(
      new ProductsApiError('Storefront checkout freight quote API failed.', {
        status: 422,
        safeMessage: 'CJ returned no delivery methods for this address.',
      }),
    );

    await expect(
      quoteCheckoutShippingAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'CJ returned no delivery methods for this address.',
    });
  });

  /*
   * The failure that started this: the portal said the item could not ship,
   * and the buyer was told to "try again in a moment" — a retry that spends
   * rate-limit budget on an outcome that cannot change.
   */
  it('does not invite a retry when an item simply cannot ship', async () => {
    vi.mocked(requestCheckoutFreightQuotes).mockRejectedValue(
      new ProductsApiError('Storefront checkout freight quote API failed.', {
        status: 422,
      }),
    );

    const result = await quoteCheckoutShippingAction({
      cart: { items: [{ productId: 'jacket', quantity: 1 }] },
      address,
    });

    expect(result).toEqual({
      ok: false,
      message:
        'An item in your cart cannot be delivered to this address. Remove it, or use a different address.',
    });
    expect(result).not.toMatchObject({
      message: expect.stringMatching(/try again/i),
    });
  });

  it('still offers a retry when the quote service itself failed', async () => {
    vi.mocked(requestCheckoutFreightQuotes).mockRejectedValue(
      new ProductsApiError('Storefront checkout freight quote API failed.', {
        status: 500,
      }),
    );

    await expect(
      quoteCheckoutShippingAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Delivery options are unavailable. Try again in a moment.',
    });
  });

  /* Without this the only trace of a failed checkout is `λ POST /checkout`. */
  it('logs the failed step, its reason, and the upstream status', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.mocked(requestCheckoutFreightQuotes).mockRejectedValue(
      new ProductsApiError('Storefront checkout freight quote API failed.', {
        status: 502,
      }),
    );

    await quoteCheckoutShippingAction({
      cart: { items: [{ productId: 'jacket', quantity: 1 }] },
      address,
    });

    expect(consoleError).toHaveBeenCalledWith(
      '[checkout] step failed',
      expect.objectContaining({
        step: 'shipping-quote',
        reason: 'upstream',
        status: 502,
      }),
    );

    consoleError.mockRestore();
  });

  it('rejects a stale shipping selection', async () => {
    vi.mocked(validateCheckoutCart).mockResolvedValue({
      lines: [],
      subtotal: { amountMinor: 0, currency: 'USD' },
    });
    vi.mocked(requestCheckoutFreightQuotes).mockResolvedValue({
      ...freightQuote,
      quotes: [{ ...freightQuote.quotes[0]!, amountMinor: 499 }],
    });

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
        shippingSelection,
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Shipping changed. Refresh delivery options and choose again.',
    });
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects a buyer-supplied tier that differs from the fresh quote', async () => {
    vi.mocked(validateCheckoutCart).mockResolvedValue({
      lines: [],
      subtotal: { amountMinor: 0, currency: 'USD' },
    });
    vi.mocked(requestCheckoutFreightQuotes).mockResolvedValue(freightQuote);

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
        shippingSelection: {
          packageSelections: [
            {
              ...shippingSelection.packageSelections[0]!,
              shippingTier: 'Expedited',
            },
          ],
        },
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Shipping changed. Refresh delivery options and choose again.',
    });
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects duplicate selections for one package', async () => {
    vi.mocked(validateCheckoutCart).mockResolvedValue({
      lines: [],
      subtotal: { amountMinor: 0, currency: 'USD' },
    });
    vi.mocked(requestCheckoutFreightQuotes).mockResolvedValue(freightQuote);
    const selected = shippingSelection.packageSelections[0]!;

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
        shippingSelection: {
          packageSelections: [selected, { ...selected }],
        },
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Choose a delivery option for every package.',
    });
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });
});
