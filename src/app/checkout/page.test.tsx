import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addCartItem, CART_STORAGE_KEY, EMPTY_CART } from '@/lib/cart';
import { usd } from '@/lib/money';
import renderWithCart from '../../../test/render-with-cart';
import CheckoutPage, { generateMetadata } from './page';

vi.mock('@/app/checkout/actions', () => ({
  createCheckoutSessionAction: vi.fn(),
}));

describe('Checkout page', () => {
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
    expect(screen.getAllByText('US$40')).toHaveLength(2);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^payment$/i }),
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

    fireEvent.click(await screen.findByRole('button', { name: /^payment$/i }));

    expect(
      screen.getByText(/check the highlighted address fields/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute(
      'aria-invalid',
      'true',
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
