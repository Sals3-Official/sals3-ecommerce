import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

function seedCart(quantity: number) {
  const seeded = addCartItem(
    EMPTY_CART,
    {
      productId: 'corduroy-jacket',
      title: "Men's Casual Retro Corduroy Jacket Coat",
      imageAlt: "Men's Casual Retro Corduroy Jacket Coat product image",
      tone: 'ocean',
      unitPrice: usd(2000),
    },
    quantity,
  );
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));
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

function clickContinue() {
  fireEvent.click(
    screen.getByRole('button', { name: /continue to delivery/i }),
  );
}

async function waitForStep2() {
  await screen.findByText(/cjpacket postal/i);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeEnabled(),
  );
}

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

  it('shows cart items, address fields, and the stepper on step 1', async () => {
    seedCart(2);

    renderWithCart(<CheckoutPage />);

    expect(await screen.findByRole('heading', { name: /^checkout$/i }));
    expect(
      screen.getByText(/men's casual retro corduroy jacket coat/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('US$40')).toHaveLength(2);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('+639');
    expect(screen.getByLabelText(/^country$/i)).toHaveValue('PH');
    expect(screen.getByLabelText(/state or region/i)).toHaveValue('');
    expect(screen.getByLabelText(/^city$/i)).toBeDisabled();
    expect(
      screen.getByRole('navigation', { name: /checkout progress/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue to delivery/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^payment$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /refresh options/i }),
    ).not.toBeInTheDocument();
  });

  it('shows field errors for an invalid address', async () => {
    seedCart(1);

    renderWithCart(<CheckoutPage />);

    await screen.findByLabelText(/^email$/i);
    clickContinue();

    expect(
      screen.getByText(/check the highlighted address fields/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(mockedQuoteCheckoutShippingAction).not.toHaveBeenCalled();
  });

  it('resets phone, state, city, and delivery quote state when country changes', async () => {
    seedCart(1);

    renderWithCart(<CheckoutPage />);

    fireEvent.change(await screen.findByLabelText(/state or region/i), {
      target: { value: 'National Capital Region (NCR)' },
    });
    expect(screen.getByLabelText(/^city$/i)).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^city$/i), {
      target: { value: 'Manila' },
    });

    fireEvent.change(screen.getByLabelText(/^country$/i), {
      target: { value: 'AU' },
    });

    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('+614');
    expect(screen.getByLabelText(/state or region/i)).toHaveValue('');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^city$/i)).toBeDisabled();
    expect(
      screen.getByRole('option', { name: 'New South Wales' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', {
        name: 'National Capital Region (NCR)',
      }),
    ).not.toBeInTheDocument();
  });

  it('updates city options from the selected state or region', async () => {
    seedCart(1);

    renderWithCart(<CheckoutPage />);

    fireEvent.change(await screen.findByLabelText(/state or region/i), {
      target: { value: 'Central Visayas (Region VII)' },
    });

    expect(screen.getByLabelText(/^city$/i)).not.toBeDisabled();
    expect(
      screen.getByRole('option', { name: 'Cebu City' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Manila' }),
    ).not.toBeInTheDocument();
  });

  it('continues to delivery with quotes loaded, selects one method, and submits payment', async () => {
    seedCart(1);
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: true,
      quote: shippingQuote,
    });
    mockedCreateCheckoutSessionAction.mockResolvedValue({
      ok: false,
      message: 'Stripe checkout failed. Try again in a moment.',
    });

    renderWithCart(<CheckoutPage />);

    await fillValidAddress();
    clickContinue();

    expect(await screen.findByText(/cjpacket postal/i)).toBeInTheDocument();
    expect(screen.getByText(/ship to/i)).toBeInTheDocument();
    expect(screen.getByText(/buyer example/i)).toBeInTheDocument();
    expect(screen.getByText(/123 main street/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/address line 1/i)).not.toBeInTheDocument();

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
        address: expect.objectContaining({
          phone: '+639171234567',
          city: 'Manila',
          region: 'National Capital Region (NCR)',
          postalCode: '1000',
          country: 'PH',
        }),
      }),
    );
  });

  it('stays on step 1 when quoting fails', async () => {
    seedCart(1);
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: false,
      message: 'No delivery options for this address yet.',
    });

    renderWithCart(<CheckoutPage />);

    await fillValidAddress();
    clickContinue();

    expect(
      await screen.findByText(/no delivery options for this address yet/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^payment$/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the quote and selection when going back without editing', async () => {
    seedCart(1);
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: true,
      quote: shippingQuote,
    });

    renderWithCart(<CheckoutPage />);

    await fillValidAddress();
    clickContinue();
    await waitForStep2();
    fireEvent.click(screen.getByLabelText(/standard.*cjpacket postal/i));

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.getByLabelText(/address line 1/i)).toHaveValue(
      '123 Main Street',
    );

    clickContinue();

    expect(await screen.findByText(/cjpacket postal/i)).toBeInTheDocument();
    expect(mockedQuoteCheckoutShippingAction).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/standard.*cjpacket postal/i)).toBeChecked();
  });

  it('re-fetches the quote after the address is edited', async () => {
    seedCart(1);
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: true,
      quote: shippingQuote,
    });

    renderWithCart(<CheckoutPage />);

    await fillValidAddress();
    clickContinue();
    await waitForStep2();

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/address line 1/i), {
      target: { value: '456 Side Street' },
    });
    clickContinue();

    expect(await screen.findByText(/cjpacket postal/i)).toBeInTheDocument();
    expect(mockedQuoteCheckoutShippingAction).toHaveBeenCalledTimes(2);
  });

  it('returns to step 1 from the stepper', async () => {
    seedCart(1);
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: true,
      quote: shippingQuote,
    });

    renderWithCart(<CheckoutPage />);

    await fillValidAddress();
    clickContinue();
    await waitForStep2();

    const stepper = screen.getByRole('navigation', {
      name: /checkout progress/i,
    });
    fireEvent.click(
      within(stepper).getByRole('button', { name: /information/i }),
    );

    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
  });

  it('refreshes options on step 2 and clears the selection', async () => {
    seedCart(1);
    mockedQuoteCheckoutShippingAction.mockResolvedValue({
      ok: true,
      quote: shippingQuote,
    });

    renderWithCart(<CheckoutPage />);

    await fillValidAddress();
    clickContinue();
    await waitForStep2();
    fireEvent.click(screen.getByLabelText(/standard.*cjpacket postal/i));
    expect(screen.getByRole('button', { name: /^payment$/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /refresh options/i }));

    await waitFor(() =>
      expect(mockedQuoteCheckoutShippingAction).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByRole('button', { name: /^payment$/i }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(/standard.*cjpacket postal/i),
    ).not.toBeChecked();
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
