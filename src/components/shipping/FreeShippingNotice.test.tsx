import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY } from '@/lib/cart';
import { CartProvider } from '@/components/cart/CartProvider';
import FreeShippingNotice from './FreeShippingNotice';

function stored(amountMinor: number) {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      items: [
        {
          productId: 'balaclava',
          title: 'Cold-proof face mask',
          category: 'apparel-accessories',
          imageAlt: 'Cold-proof face mask',
          tone: 'ocean',
          unitPrice: { amountMinor, currency: 'USD' },
          quantity: 1,
        },
      ],
    }),
  );
}

afterEach(() => {
  window.localStorage.removeItem(CART_STORAGE_KEY);
});

describe('FreeShippingNotice', () => {
  it('states the offer without a dollar figure or a named country when no estimate is given', () => {
    render(
      <CartProvider>
        <FreeShippingNotice />
      </CartProvider>,
    );

    expect(
      screen.getByText('Free Standard delivery on qualifying orders'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Confirmed once your address is known, at checkout.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows how much more is needed, for a cart below the threshold', () => {
    stored(1000); // US$10.00

    render(
      <CartProvider>
        <FreeShippingNotice
          thresholdAmountMinor={2500}
          destinationLabel="Australia"
        />
      </CartProvider>,
    );

    expect(
      screen.getByText(
        'Add US$15 more for free Standard delivery to Australia',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Estimated for your likely destination/),
    ).toBeInTheDocument();

    const progress = screen.getByRole('progressbar');

    expect(progress).toHaveAttribute('aria-valuenow', '40');
  });

  it('says the cart already qualifies once the estimate is met', () => {
    stored(2500); // US$25.00, at the threshold

    render(
      <CartProvider>
        <FreeShippingNotice
          thresholdAmountMinor={2500}
          destinationLabel="Australia"
        />
      </CartProvider>,
    );

    expect(
      screen.getByText(
        'Your cart already qualifies for free Standard delivery to Australia',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('pulses only when emphasized', () => {
    const { container } = render(
      <CartProvider>
        <FreeShippingNotice emphasize />
      </CartProvider>,
    );

    expect(
      container.querySelector('.animate-free-shipping-glow'),
    ).not.toBeNull();
  });

  it('does not pulse by default', () => {
    const { container } = render(
      <CartProvider>
        <FreeShippingNotice />
      </CartProvider>,
    );

    expect(container.querySelector('.animate-free-shipping-glow')).toBeNull();
  });
});
