import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { addCartItem, CART_STORAGE_KEY, EMPTY_CART } from '@/lib/cart';
import { peso } from '@/lib/money';
import renderWithCart from '../../../test/render-with-cart';
import CartPage, { generateMetadata } from './page';

describe('Cart page', () => {
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
        unitPrice: peso(99900),
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
    expect(screen.getAllByText('₱1,998')).toHaveLength(2);
  });

  it('is not indexed', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
