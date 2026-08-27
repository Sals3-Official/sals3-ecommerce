import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import renderWithCart from '../../../test/render-with-cart';
import ProductRecordPanel from './ProductRecordPanel';

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();

  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

function priced(id: string, amountMinor: number): ProductVariant {
  return {
    id,
    sku: `S3V-${id}`,
    price: { amountMinor, currency: 'USD' },
    availability: 'AVAILABLE',
    options: [{ name: 'Colour', value: id }],
  };
}

function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'air-cooler',
    title: 'Quiet tower air cooler',
    category: 'home-living',
    price: { amountMinor: 451, currency: 'USD' },
    imageAlt: 'Quiet tower air cooler',
    tone: 'ocean',
    images: [],
    ...overrides,
  };
}

describe('ProductRecordPanel', () => {
  const SPREAD = {
    variants: [
      priced('black', 451),
      priced('green', 2000),
      priced('navy', 2000),
    ],
    options: [{ name: 'Colour', values: ['black', 'green', 'navy'] }],
  };

  /**
   * The `From {floor}` figure is honest and incomplete: it is the price of one
   * option out of three. Showing it and saying nothing else lets the page imply
   * a distribution it never stated.
   */
  it('says how many options cost more than the floor on screen', () => {
    renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail(SPREAD)}
        selectedFromUrl={false}
      />,
    );

    expect(
      screen.getByText(/two of the three options cost more than this/i),
    ).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
  });

  it('says so plainly when every option is the same price', () => {
    renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail({
          // The floor is the product price, so it has to match the variants —
          // a feed price below every variant is a different (and wrong) state.
          price: { amountMinor: 2000, currency: 'USD' },
          variants: [priced('black', 2000), priced('navy', 2000)],
          options: [{ name: 'Colour', values: ['black', 'navy'] }],
        })}
        selectedFromUrl={false}
      />,
    );

    expect(screen.getByText('Every option is this price.')).toBeInTheDocument();
  });

  /**
   * Exactly one currency-formatted string in the price block. A second one is
   * what a price extractor can pick up instead of the real offer price, so the
   * note names a count rather than the higher figure.
   */
  it('keeps a second money value out of the price block', () => {
    const { container } = renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail(SPREAD)}
        selectedFromUrl={false}
      />,
    );
    const money = (container.textContent ?? '').match(/US\$[\d,.]+/g) ?? [];

    expect(money).toEqual(['US$4.51']);
  });

  it('names the exact price once a variant is chosen, and says delivery is still to come', () => {
    renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail(SPREAD)}
        selectedVariant={SPREAD.variants[1]}
        selectedFromUrl
      />,
    );

    expect(
      screen.getByText(/the exact price for this option/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('From')).not.toBeInTheDocument();
  });

  /**
   * The prototype's enabled-state line reads "Nothing is added to this price at
   * checkout." Live CJ freight quotes shipped 2026-08-17 and the chosen amount
   * goes into the Stripe session, so that sentence is false and must not appear.
   */
  it('never claims that nothing is added to the price at checkout', () => {
    const { container } = renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail(SPREAD)}
        selectedFromUrl={false}
      />,
    );

    expect(container.textContent ?? '').not.toMatch(
      /nothing is added to this price/i,
    );
  });

  /**
   * Owner decision, 2026-08-21: a named-axes product arrives buyable. The
   * default is preselected, both buttons are live, and no "Choose a colour."
   * blocker is rendered — the buyer changes the selection rather than starting it.
   */
  it('arrives buyable on a named-axes product, with the default chosen', () => {
    renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail(SPREAD)}
        selectedFromUrl={false}
      />,
    );

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /buy now/i })).toBeEnabled();
    expect(screen.queryByText('Choose a colour.')).not.toBeInTheDocument();
    // The floor-priced option, so the lead price still matches the feed price.
    expect(screen.getByRole('link', { name: 'black' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  /** An unavailable selection is the one remaining blocker, and it says so. */
  it('blocks purchase when the chosen option is unavailable', () => {
    renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail({
          variants: [{ ...priced('black', 451), availability: 'UNAVAILABLE' }],
          options: [{ name: 'Colour', values: ['black'] }],
        })}
        selectedFromUrl={false}
      />,
    );

    expect(screen.getByRole('button', { name: /buy now/i })).toBeDisabled();
    expect(
      screen.getByText('This option is currently unavailable.'),
    ).toBeInTheDocument();
  });

  it('says nothing about a spread when there is only one option', () => {
    const { container } = renderWithCart(
      <ProductRecordPanel
        market="au"
        detail={detail({ variants: [priced('black', 451)] })}
        selectedFromUrl={false}
      />,
    );

    expect(container.textContent ?? '').not.toMatch(/cost more than this/i);
    expect(container.textContent ?? '').not.toMatch(/every option is/i);
  });
});
