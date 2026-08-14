import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStripeClient } from '@/services/stripe/client';
import { POST } from './route';

vi.mock('server-only', () => ({}));

vi.mock('@/services/stripe/client', () => ({
  getStripeClient: vi.fn(),
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

  it('accepts a verified checkout event', async () => {
    constructEvent.mockReturnValue({ type: 'checkout.session.completed' });

    const response = await POST(request('valid'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
  });
});
