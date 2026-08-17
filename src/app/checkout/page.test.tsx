import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addCartItem, CART_STORAGE_KEY, EMPTY_CART } from '@/lib/cart';
import { usd } from '@/lib/money';
import {
  createCheckoutSessionAction,
  quoteCheckoutShippingAction,
} from '@/app/checkout/actions';
import renderWithCart from '../../../test/render-with-cart';
import CheckoutPage, { generateMetadata } from './page';

vi.mock('@/app/checkout/actions', () => ({
  createCheckoutSessionAction: vi.fn(),
  quoteCheckoutShippingAction: vi.fn(),
}));

const mockedCreateCheckoutSessionAction = vi.mocked(
  createCheckoutSessionAction,
);
const mockedQuoteCheckoutShippingAction = vi.mocked(
  quoteCheckoutShippingAction,
);

const shippingQuote = {
  quotedAt: '2026-08-17T14:00:00.000Z',
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
      expiresAt: '2026-08-17T14:15:00.000Z',
    },
  ],
};

describe('Checkout page', () => {
  beforeEach(() => {
    mockedCreateCheckoutSessionAction.mockReset();
    mockedQuoteCheckoutShippingAction.mockReset();
  });

  it('is not indexed', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('shows cart items, total, and address fields', async () => {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: 'corduroy-jacket',
        title: "Men's Casual Retro Corduroy Jacket Coat",
        imageAlt: "Men's Casual Retro Corduroy Jacket Coat product image",
        tone: 'ocean',
        unitPrice: usd(2000),
      },
      2,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(<CheckoutPage />);

    expect(await screen.findByRole('heading', { name: /^checkout$/i }));
    expect(
      screen.getByText(/men's casual retro corduroy jacket coat/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('US$40')).toHaveLength(3);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^payment$/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /get delivery options/i }),
    ).toBeInTheDocument();
  });

  it('shows field errors for an invalid address', async () => {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: 'corduroy-jacket',
        title: "Men's Casual Retro Corduroy Jacket Coat",
        imageAlt: "Men's Casual Retro Corduroy Jacket Coat product image",
        tone: 'ocean',
        unitPrice: usd(2000),
      },
      1,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(<CheckoutPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /get delivery options/i }),
    );

    expect(
      screen.getByText(/check the highlighted address fields/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('quotes shipping, selects one method, and submits payment', async () => {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: 'corduroy-jacket',
        title: "Men's Casual Retro Corduroy Jacket Coat",
        imageAlt: "Men's Casual Retro Corduroy Jacket Coat product image",
        tone: 'ocean',
        unitPrice: usd(2000),
      },
      1,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: true,
      quote: shippingQuote,
    });
    mockedCreateCheckoutSessionAction.mockResolvedValue({
      ok: false,
      message: 'Stripe checkout failed. Try again in a moment.',
    });

    renderWithCart(<CheckoutPage />);

    fireEvent.change(await screen.findByLabelText(/^email$/i), {
      target: { value: 'buyer@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^full name$/i), {
      target: { value: 'Buyer Example' },
    });
    fireEvent.change(screen.getByLabelText(/address line 1/i), {
      target: { value: '123 Main Street' },
    });
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'Manila' },
    });
    fireEvent.change(screen.getByLabelText(/state or region/i), {
      target: { value: 'Metro Manila' },
    });
    fireEvent.change(screen.getByLabelText(/postal code/i), {
      target: { value: '1000' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /get delivery options/i }),
    );

    expect(await screen.findByText(/cjpacket postal/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/standard.*cjpacket postal/i));

    expect(screen.getAllByText('US$24.09')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /^payment$/i }));

    expect(mockedCreateCheckoutSessionAction).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingSelection: {
          packageSelections: [
            expect.objectContaining({
              optionId: 'option-1',
              amountMinor: 409,
            }),
          ],
        },
      }),
    );
  });

  it('shows an empty-cart state', () => {
    renderWithCart(<CheckoutPage />);

    expect(
      screen.getByText(/add an item before checkout/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /continue shopping/i }),
    ).toHaveAttribute('href', '/');
  });
});
