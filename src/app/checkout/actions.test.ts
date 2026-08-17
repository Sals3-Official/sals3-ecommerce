import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCheckoutCart } from '@/services/checkout/cart-validation';
import { createStripeCheckoutSession } from '@/services/stripe/checkout';
import requestCheckoutFreightQuotes from '@/services/checkout/freight-quotes';
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

const address = {
  email: 'buyer@example.com',
  fullName: 'Buyer Example',
  phone: '',
  addressLine1: '123 Main Street',
  addressLine2: '',
  city: 'Manila',
  region: 'Metro Manila',
  postalCode: '1000',
  country: 'PH' as const,
};

const shippingSelection = {
  packageSelections: [
    {
      packageId: 'pkg_1',
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
      expiresAt: '2026-08-17T14:15:00.000Z',
    },
  ],
};

describe('createCheckoutSessionAction', () => {
  beforeEach(() => {
    vi.mocked(validateCheckoutCart).mockReset();
    vi.mocked(createStripeCheckoutSession).mockReset();
    vi.mocked(requestCheckoutFreightQuotes).mockReset();
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

  it('returns a Stripe redirect URL for a valid checkout', async () => {
    vi.mocked(validateCheckoutCart).mockResolvedValue({
      lines: [],
      subtotal: { amountMinor: 0, currency: 'USD' },
    });
    vi.mocked(createStripeCheckoutSession).mockResolvedValue(
      'https://checkout.stripe.test/pay',
    );
    vi.mocked(requestCheckoutFreightQuotes).mockResolvedValue(freightQuote);

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
        shippingSelection,
      }),
    ).resolves.toEqual({
      ok: true,
      url: 'https://checkout.stripe.test/pay',
    });
    expect(createStripeCheckoutSession).toHaveBeenCalledWith(
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
});
