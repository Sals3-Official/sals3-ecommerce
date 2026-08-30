import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY } from '@/lib/cart';
import { CartProvider, useCart } from './CartProvider';
import CartCountBadge from './CartCountBadge';

function AddOne() {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() =>
        addItem({
          productId: 'balaclava',
          title: 'Cold-proof face mask',
          category: 'apparel-accessories',
          imageAlt: 'Cold-proof face mask',
          tone: 'ocean',
          unitPrice: { amountMinor: 336, currency: 'USD' },
        })
      }
    >
      add
    </button>
  );
}

/**
 * A cart left over from a previous visit. Spread across lines because
 * `MAX_LINE_QUANTITY` is 20 and the parser rejects a line above it — a single
 * line of 150 would be dropped, and the test would pass for the wrong reason.
 */
function stored(lines: number, quantity: number) {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      items: Array.from({ length: lines }, (_unused, index) => ({
        productId: `kept-${index}`,
        title: 'Something added last visit',
        category: 'home-living',
        imageAlt: 'Something',
        tone: 'ocean',
        unitPrice: { amountMinor: 500, currency: 'USD' },
        quantity,
      })),
    }),
  );
}

afterEach(() => {
  window.localStorage.removeItem(CART_STORAGE_KEY);
});

describe('CartCountBadge', () => {
  it('shows nothing for an empty cart', () => {
    const { container } = render(
      <CartProvider>
        <CartCountBadge />
      </CartProvider>,
    );

    expect(container.querySelector('.animate-s3-count-bump')).toBeNull();
    expect(screen.queryByText('1')).toBeNull();
  });

  /**
   * The defect this design avoids. `itemCount` also changes when the provider
   * hydrates from `localStorage` after mount, so a badge watching the count
   * would animate on every page load with a non-empty cart — telling the buyer
   * something was added when nothing was.
   */
  it('does not animate when the cart is restored from a previous visit', () => {
    stored(1, 4);

    const { container } = render(
      <CartProvider>
        <CartCountBadge />
      </CartProvider>,
    );

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(container.querySelector('.animate-s3-count-bump')).toBeNull();
  });

  it('animates on a real add', () => {
    const { container } = render(
      <CartProvider>
        <CartCountBadge />
        <AddOne />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(container.querySelector('.animate-s3-count-bump')).not.toBeNull();
  });

  it('still caps the printed count', () => {
    stored(6, 20);

    render(
      <CartProvider>
        <CartCountBadge />
      </CartProvider>,
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
