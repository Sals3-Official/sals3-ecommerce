import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsApiError } from '@/services/storefront/client';
import requestCheckoutFreightQuotes from './freight-quotes';

vi.mock('server-only', () => ({}));

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

describe('requestCheckoutFreightQuotes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('posts the checkout cart and address to the protected portal quote API', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        quotedAt: '2026-08-17T14:00:00.000Z',
        packages: [{ packageId: 'pkg_1', originCountry: 'CN', itemCount: 1 }],
        quotes: [
          {
            quoteId: 'quote-1',
            packageId: 'pkg_1',
            label: 'Standard',
            cjLogisticName: 'CJPacket Postal',
            optionId: 'option-1',
            channelId: 'channel-1',
            arrivalTime: '12-20',
            amountMinor: 409,
            currency: 'USD',
            originCountry: 'CN',
            destinationCountry: 'PH',
            ruleTips: [],
            expiresAt: '2026-08-17T14:15:00.000Z',
          },
        ],
      }),
    );

    const result = await requestCheckoutFreightQuotes(
      {
        cart: {
          items: [{ productId: 'jacket', variantId: 'v1', quantity: 1 }],
        },
        address,
      },
      { fetcher },
    );

    expect(result.quotes[0]?.cjLogisticName).toBe('CJPacket Postal');
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3001/api/storefront/checkout/freight-quotes',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0]?.[1].body)).toMatchObject({
      cart: { items: [{ productId: 'jacket', variantId: 'v1', quantity: 1 }] },
      address: { country: 'PH', postalCode: '1000' },
    });
  });

  it('preserves safe portal 422 quote messages on request failure', async () => {
    vi.stubEnv('SALS3_STOREFRONT_API_TOKEN', 'secret');
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: 'CJ returned no delivery methods for this address.' },
          { status: 422 },
        ),
      );

    const promise = requestCheckoutFreightQuotes(
      {
        cart: {
          items: [{ productId: 'jacket', variantId: 'v1', quantity: 1 }],
        },
        address,
      },
      { fetcher },
    );

    await expect(promise).rejects.toBeInstanceOf(ProductsApiError);
    await expect(promise).rejects.toMatchObject({
      status: 422,
      safeMessage: 'CJ returned no delivery methods for this address.',
    });
  });
});
