import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addCartItem,
  CART_STORAGE_KEY,
  EMPTY_CART,
  isLineSelected,
  parseCartState,
} from '@/lib/cart';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import { usd } from '@/lib/money';
import renderWithCart from '../../../test/render-with-cart';
import ProductRecordPanel from './ProductRecordPanel';

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();

  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

const ONLY: ProductVariant = {
  id: 'only',
  sku: 'S3V-ONLY00000000',
  price: { amountMinor: 336, currency: 'USD' },
  availability: 'AVAILABLE',
};

const DETAIL: ProductDetail = {
  id: 'balaclava',
  title: 'Cold-proof face mask',
  category: 'apparel-accessories',
  price: { amountMinor: 336, currency: 'USD' },
  imageAlt: 'Cold-proof face mask',
  tone: 'ocean',
  images: [],
  variants: [ONLY],
};

afterEach(() => {
  vi.useRealTimers();
});

/**
 * The press has an answer before the toast arrives. The button is the thing the
 * buyer is looking at, so it is the thing that has to change first.
 */
describe('the Add to Cart confirmation', () => {
  it('confirms in place and then offers itself again', () => {
    vi.useFakeTimers();
    renderWithCart(
      <ProductRecordPanel detail={DETAIL} selectedFromUrl={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(screen.getByRole('button', { name: /added/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /added/i })).toBeNull();
  });

  /**
   * A skin change on the same control, not a different control: the button must
   * not resize or move under the finger that just pressed it, which is what a
   * width-changing label or an inserted icon row would do.
   */
  it('keeps the same button rather than swapping in another', () => {
    vi.useFakeTimers();
    renderWithCart(
      <ProductRecordPanel detail={DETAIL} selectedFromUrl={false} />,
    );

    const before = screen.getByRole('button', { name: /add to cart/i });

    fireEvent.click(before);

    expect(screen.getByRole('button', { name: /added/i })).toBe(before);
  });

  /**
   * The motion is CSS, so it sits under the site-wide `prefers-reduced-motion`
   * rule in `globals.css`. A component-local animation would escape it.
   */
  it('animates the confirmation through a stylesheet class', () => {
    vi.useFakeTimers();
    renderWithCart(
      <ProductRecordPanel detail={DETAIL} selectedFromUrl={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(
      screen
        .getByRole('button', { name: /added/i })
        .querySelector('.animate-s3-confirm-in'),
    ).not.toBeNull();
  });

  /** Nothing may be added before a choice exists to add. */
  it('does not confirm a press it refused', () => {
    const black: ProductVariant = {
      ...ONLY,
      id: 'black',
      options: [{ name: 'Colour', value: 'Black' }],
    };
    const blue: ProductVariant = {
      ...ONLY,
      id: 'blue',
      sku: 'S3V-BLUE00000000',
      options: [{ name: 'Colour', value: 'Blue' }],
    };

    renderWithCart(
      <ProductRecordPanel
        detail={{
          ...DETAIL,
          variants: [black, blue],
          options: [{ name: 'Colour', values: ['Black', 'Blue'] }],
        }}
        selectedFromUrl={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(screen.queryByRole('button', { name: /added/i })).toBeNull();
    expect(
      screen.getByText('Choose a colour to continue.'),
    ).toBeInTheDocument();
  });
});

/**
 * "Buy Now" means this item, not whatever else the cart already held. A
 * buyer landing on `/cart` after pressing it must see only the thing they
 * just decided to buy checked — everything else stays in the cart, untouched,
 * just not part of this purchase.
 */
describe('Buy Now selection', () => {
  function seedExistingLine() {
    const seeded = addCartItem(
      EMPTY_CART,
      {
        productId: 'already-in-cart',
        title: 'Something added earlier',
        imageAlt: 'Something added earlier',
        tone: 'ocean',
        unitPrice: usd(1500),
      },
      1,
    );

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));
  }

  it('selects only the bought line, leaving the rest of the cart deselected', () => {
    seedExistingLine();
    renderWithCart(
      <ProductRecordPanel detail={DETAIL} selectedFromUrl={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /buy now/i }));

    const state = parseCartState(window.localStorage.getItem(CART_STORAGE_KEY));

    expect(state.items.map((line) => line.productId).sort()).toEqual([
      'already-in-cart',
      'balaclava',
    ]);
    expect(isLineSelected(state, 'balaclava::only')).toBe(true);
    expect(isLineSelected(state, 'already-in-cart')).toBe(false);
  });

  it('leaves a lone cart selected — narrowing to one line that is already alone changes nothing observable', () => {
    renderWithCart(
      <ProductRecordPanel detail={DETAIL} selectedFromUrl={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /buy now/i }));

    const state = parseCartState(window.localStorage.getItem(CART_STORAGE_KEY));

    expect(isLineSelected(state, 'balaclava::only')).toBe(true);
    expect(state.deselectedLineIds).toEqual([]);
  });
});
