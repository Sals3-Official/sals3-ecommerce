import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCheckoutCart } from '@/services/checkout/cart-validation';
import { createStripeCheckoutSession } from '@/services/stripe/checkout';
import { createCheckoutSessionAction } from './actions';

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

describe('createCheckoutSessionAction', () => {
  beforeEach(() => {
    vi.mocked(validateCheckoutCart).mockReset();
    vi.mocked(createStripeCheckoutSession).mockReset();
  });

  it('rejects an empty cart', async () => {
    await expect(
      createCheckoutSessionAction({ cart: { items: [] }, address }),
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

    await expect(
      createCheckoutSessionAction({
        cart: { items: [{ productId: 'jacket', quantity: 1 }] },
        address,
      }),
    ).resolves.toEqual({
      ok: true,
      url: 'https://checkout.stripe.test/pay',
    });
  });
});
