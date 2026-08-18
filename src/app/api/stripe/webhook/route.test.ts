import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStripeClient } from '@/services/stripe/client';
import acceptPortalCheckoutOrder from '@/services/checkout/order-acceptance';
import { POST } from './route';

vi.mock('server-only', () => ({}));

vi.mock('@/services/stripe/client', () => ({
  getStripeClient: vi.fn(),
}));

vi.mock('@/services/checkout/order-acceptance', () => ({
  default: vi.fn(),
}));

const constructEvent = vi.fn();

function request(signature?: string) {
  return new Request('https://sals3.test/api/stripe/webhook', {
    method: 'POST',
    headers:
      signature === undefined ? undefined : { 'stripe-signature': signature },
    body: '{"id":"evt_123"}',
  });
}

describe('Stripe webhook route', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    constructEvent.mockReset();
    vi.mocked(acceptPortalCheckoutOrder).mockReset();
    vi.mocked(getStripeClient).mockReturnValue({
      webhooks: { constructEvent },
    } as never);
  });

  it('rejects a missing signature', async () => {
    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'missing_signature',
    });
  });

  it('rejects an invalid signature', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    const response = await POST(request('bad'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_signature',
    });
  });

  it('accepts a verified paid checkout event and calls Portal once', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          client_reference_id: '11111111-1111-4111-8111-111111111111',
          payment_intent: 'pi_test_123',
          amount_total: 2409,
          currency: 'usd',
          customer_details: { email: 'buyer@example.com' },
        },
      },
    });

    const response = await POST(request('valid'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(acceptPortalCheckoutOrder).toHaveBeenCalledWith({
      checkoutIntentId: '11111111-1111-4111-8111-111111111111',
      stripeEventId: 'evt_123',
      stripeCheckoutSessionId: 'cs_test_123',
      stripePaymentIntentId: 'pi_test_123',
      amountTotalMinor: 2409,
      currency: 'USD',
      customerEmail: 'buyer@example.com',
    });
  });

  it('does not accept unpaid checkout sessions', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'unpaid',
        },
      },
    });

    const response = await POST(request('valid'));

    expect(response.status).toBe(200);
    expect(acceptPortalCheckoutOrder).not.toHaveBeenCalled();
  });
});
