import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStripeClient } from '@/services/stripe/client';
import type { ValidatedCheckoutCart } from '@/services/checkout/cart-validation';
import type { CheckoutAddress } from '@/lib/checkout/schema';
import { createStripeCheckoutSession } from './checkout';

vi.mock('server-only', () => ({}));

vi.mock('@/services/stripe/client', () => ({
  getStripeClient: vi.fn(),
}));

const createSession = vi.fn();

const cart: ValidatedCheckoutCart = {
  lines: [
    {
      productId: 'jacket',
      title: 'Jacket',
      imageUrl: 'https://cf.cjdropshipping.com/quick/product/a.jpg',
      unitPrice: { amountMinor: 2000, currency: 'USD' },
      quantity: 2,
    },
  ],
  subtotal: { amountMinor: 4000, currency: 'USD' },
};

const address: CheckoutAddress = {
  email: 'buyer@example.com',
  fullName: 'Buyer Example',
  phone: '',
  addressLine1: '123 Main Street',
  addressLine2: '',
  city: 'Manila',
  region: 'Metro Manila',
  postalCode: '1000',
  country: 'PH',
};

describe('createStripeCheckoutSession', () => {
  beforeEach(() => {
    vi.mocked(getStripeClient).mockReturnValue({
      checkout: { sessions: { create: createSession } },
    } as never);
    createSession.mockReset();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://sals3.test';
    process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID = 'pmc_test_123';
  });

  it('creates a hosted Checkout Session with dynamic payment methods', async () => {
    createSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/pay',
    });

    await expect(createStripeCheckoutSession({ cart, address })).resolves.toBe(
      'https://checkout.stripe.test/pay',
    );

    const params = createSession.mock.calls[0]?.[0];

    expect(params).toMatchObject({
      mode: 'payment',
      customer_email: 'buyer@example.com',
      payment_method_configuration: 'pmc_test_123',
      success_url:
        'https://sals3.test/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://sals3.test/checkout?canceled=1',
    });
    expect(params).not.toHaveProperty('payment_method_types');
    expect(params).not.toHaveProperty('automatic_tax');
    expect(params.integration_identifier).toMatch(/^sals3_checkout_[a-z]{8}$/);
    expect(params.line_items[0].price_data.unit_amount).toBe(2000);
    expect(params.payment_intent_data.shipping.address.country).toBe('PH');
  });
});
