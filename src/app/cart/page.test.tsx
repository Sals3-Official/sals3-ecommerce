import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addCartItem, CART_STORAGE_KEY, EMPTY_CART } from '@/lib/cart';
import { KLAVIYO_CONSENT_ACCEPTED } from '@/lib/klaviyo/consent';
import { usd } from '@/lib/money';
import renderWithCart from '../../../test/render-with-cart';
import CartPage, { generateMetadata } from './page';

describe('Cart page', () => {
  function acceptAnalytics() {
    window.localStorage.setItem(
      'sals3_klaviyo_consent_v1',
      JSON.stringify({
        decision: KLAVIYO_CONSENT_ACCEPTED,
        decidedAt: '2026-08-08T00:00:00.000Z',
      }),
    );
  }

  it('shows an empty-cart message with no saved items', () => {
    renderWithCart(<CartPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /your cart is empty/i }),
    ).toBeInTheDocument();
  });

  it('renders line items and the subtotal from a saved cart', async () => {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: '1',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(99900),
      },
      2,
    );
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(<CartPage />);

    expect(
      await screen.findByText(/essence mascara lash princess/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /cart \(2 items\)/i }),
    ).toBeInTheDocument();
    // One line at qty 2, so the line total and the cart subtotal match.
    expect(screen.getAllByText('US$1,998')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: /proceed to checkout/i }),
    ).toHaveAttribute('href', '/checkout');
  });

  it('is not indexed', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('tracks cart view, quantity change, and removal after analytics consent', async () => {
    const track = vi.fn();
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: '1',
        title: 'Essence Mascara Lash Princess',
        imageAlt: 'Essence Mascara Lash Princess product image',
        tone: 'ocean',
        unitPrice: usd(99900),
      },
      1,
    );

    acceptAnalytics();
    window.klaviyo = { track };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    renderWithCart(<CartPage />);

    await screen.findByText(/essence mascara lash princess/i);
    await waitFor(() => {
      expect(track).toHaveBeenCalledWith(
        'Cart Viewed',
        expect.objectContaining({
          ItemNames: ['Essence Mascara Lash Princess'],
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    expect(track).toHaveBeenCalledWith(
      'Cart Quantity Changed',
      expect.objectContaining({ ProductID: '1', NextQuantity: 2 }),
    );
    expect(track).toHaveBeenCalledWith(
      'Cart Item Removed',
      expect.objectContaining({ ProductID: '1', Quantity: 2 }),
    );
  });
});
