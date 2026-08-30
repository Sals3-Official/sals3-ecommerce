import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import { CART_STORAGE_KEY, MAX_LINE_QUANTITY } from '@/lib/cart';
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

function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'balaclava',
    title: 'Cold-proof face mask',
    category: 'apparel-accessories',
    price: { amountMinor: 336, currency: 'USD' },
    imageAlt: 'Cold-proof face mask',
    tone: 'ocean',
    images: [],
    variants: [ONLY],
    ...overrides,
  };
}

function storedQuantities(): number[] {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  const parsed: unknown = raw === null ? { items: [] } : JSON.parse(raw);
  const items =
    typeof parsed === 'object' && parsed !== null && 'items' in parsed
      ? (parsed.items as { quantity: number }[])
      : [];

  return items.map((line) => line.quantity);
}

describe('ProductQuantityStepper', () => {
  it('starts at one and counts up and down', () => {
    renderWithCart(
      <ProductRecordPanel detail={detail()} selectedFromUrl={false} />,
    );

    const up = screen.getByRole('button', { name: 'Increase quantity' });
    const down = screen.getByRole('button', { name: 'Decrease quantity' });

    expect(down).toBeDisabled();

    fireEvent.click(up);
    fireEvent.click(up);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(down).toBeEnabled();

    fireEvent.click(down);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  /**
   * The ceiling is the cart's own, imported rather than restated, so the PDP
   * cannot offer a number `addCartItem` would silently clamp.
   */
  it('stops at the cart’s own ceiling and says so', () => {
    renderWithCart(
      <ProductRecordPanel detail={detail()} selectedFromUrl={false} />,
    );

    const up = screen.getByRole('button', { name: 'Increase quantity' });

    for (let click = 1; click < MAX_LINE_QUANTITY; click += 1) {
      fireEvent.click(up);
    }

    expect(screen.getByText(String(MAX_LINE_QUANTITY))).toBeInTheDocument();
    expect(up).toBeDisabled();
    expect(
      screen.getByText(`${MAX_LINE_QUANTITY} is the most on one line.`),
    ).toBeInTheDocument();
  });

  /**
   * The point of the control. Before this, the PDP could only ever add one, and
   * a buyer who wanted three had to add one and press `+` twice in the cart.
   */
  it('adds the chosen number of units, not one', () => {
    window.localStorage.removeItem(CART_STORAGE_KEY);

    renderWithCart(
      <ProductRecordPanel detail={detail()} selectedFromUrl={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(storedQuantities()).toEqual([3]);
  });

  /**
   * A buyer who wanted three of the black one still wants three of the blue
   * one. Resetting on an option change would silently reduce an order.
   */
  it('keeps the number across an option change', () => {
    const black: ProductVariant = {
      id: 'black',
      sku: 'S3V-BLACK0000000',
      price: { amountMinor: 336, currency: 'USD' },
      availability: 'AVAILABLE',
      options: [{ name: 'Colour', value: 'Black' }],
    };
    const blue: ProductVariant = {
      ...black,
      id: 'blue',
      sku: 'S3V-BLUE00000000',
    };

    blue.options = [{ name: 'Colour', value: 'Blue' }];

    renderWithCart(
      <ProductRecordPanel
        detail={detail({
          variants: [black, blue],
          options: [{ name: 'Colour', values: ['Black', 'Blue'] }],
        })}
        selectedFromUrl={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('link', { name: 'Blue' }));

    expect(screen.getByText('2')).toBeInTheDocument();
  });
  /**
   * The bug a `fireEvent` pair cannot see.
   *
   * Testing Library flushes a render between clicks, so two `fireEvent.click`
   * calls always read a fresh count and the old `onChange(value + 1)` passed.
   * A finger does not flush anything: two presses inside one React batch both
   * read the count from the render they were clicked in, so pressing `+` twice
   * from 1 put **2** in the cart. Found in a browser, fixed by sending a delta
   * and applying it functionally.
   *
   * Dispatching both events inside one `act` is what reproduces the batch.
   */
  it('counts every press when two land in the same batch', () => {
    renderWithCart(
      <ProductRecordPanel detail={detail()} selectedFromUrl={false} />,
    );

    const up = screen.getByRole('button', { name: 'Increase quantity' });

    act(() => {
      up.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      up.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  /** And the floor still holds when the presses pile up going down. */
  it('never falls below one, however many presses arrive at once', () => {
    renderWithCart(
      <ProductRecordPanel detail={detail()} selectedFromUrl={false} />,
    );

    const down = screen.getByRole('button', { name: 'Decrease quantity' });

    act(() => {
      down.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      down.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
