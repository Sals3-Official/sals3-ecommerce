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

  /**
   * A canary for buyer-facing copy, not for Stripe.
   *
   * The PDP's evidence ledger states "Nothing is added to this price at
   * checkout", and `FooterBrand` says "No fees appear at the last step". Both are
   * true only while this session adds no freight and no tax. That coupling is
   * exactly what produced the claim being retired in this change — the footer
   * promised "shipping and tax included" long after the pricing resolver stopped
   * being able to back it, and nothing failed.
   *
   * So if someone adds shipping or tax collection here, this test fails and names
   * the copy that has to change, instead of the claim quietly becoming a lie.
   */
  it('adds no shipping and no tax, which two buyer-facing claims depend on', async () => {
    createSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/pay',
    });

    await createStripeCheckoutSession({ cart, address });

    const params = createSession.mock.calls[0]?.[0];

    expect(params).not.toHaveProperty('shipping_options');
    expect(params).not.toHaveProperty('automatic_tax');
    expect(params).not.toHaveProperty('shipping_address_collection');
    // `payment_intent_data.shipping` records where to deliver. It is not a
    // charge, and must not become one without updating the PDP ledger copy.
    expect(params.payment_intent_data.shipping).not.toHaveProperty('amount');
    // Every line item is a product line at its own unit price — no freight or
    // handling line smuggled in alongside them.
    expect(params.line_items).toHaveLength(1);
    expect(
      params.line_items.reduce(
        (total: number, item: { price_data: { unit_amount: number } }) =>
          total + item.price_data.unit_amount,
        0,
      ),
    ).toBe(2000);
  });
});
