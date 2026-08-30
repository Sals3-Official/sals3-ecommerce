import { fireEvent, screen } from '@testing-library/react';
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
  /**
   * The panel built the evidence ledger without passing the rating, so a
   * reviewed product declared it had no reviews. The wiring is the bug — the
   * ledger reads correctly on its own — so it is the wiring this asserts.
   */
  it('hands the buyer rating to the evidence ledger', () => {
    renderWithCart(
      <ProductRecordPanel
        detail={detail({ rating: { average: 4, count: 1 } })}
        selectedFromUrl={false}
        reviewsAnchored
      />,
    );

    expect(
      screen.getByRole('link', {
        name: '4.0 out of 5, from 1 verified purchase.',
      }),
    ).toHaveAttribute('href', '#reviews-heading');
    expect(screen.queryByText(/no reviews/i)).not.toBeInTheDocument();
  });

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
      <ProductRecordPanel detail={detail(SPREAD)} selectedFromUrl={false} />,
    );

    expect(
      screen.getByText(/two of the three options cost more than this/i),
    ).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
  });

  it('says so plainly when every option is the same price', () => {
    renderWithCart(
      <ProductRecordPanel
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
      <ProductRecordPanel detail={detail(SPREAD)} selectedFromUrl={false} />,
    );
    const money = (container.textContent ?? '').match(/US\$[\d,.]+/g) ?? [];

    expect(money).toEqual(['US$4.51']);
  });

  it('names the exact price once a variant is chosen, and says delivery is still to come', () => {
    renderWithCart(
      <ProductRecordPanel
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
      <ProductRecordPanel detail={detail(SPREAD)} selectedFromUrl={false} />,
    );

    expect(container.textContent ?? '').not.toMatch(
      /nothing is added to this price/i,
    );
  });

  /**
   * The 2026-08-21 preselection, reversed by the owner on 2026-08-31. Nothing is
   * chosen on the buyer's behalf, so nothing is buyable until they choose — and
   * the reason is said in words rather than left to a grey button.
   */
  it('arrives unbuyable on a named-axes product, with nothing chosen', () => {
    renderWithCart(
      <ProductRecordPanel detail={detail(SPREAD)} selectedFromUrl={false} />,
    );

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /buy now/i })).toBeDisabled();
    expect(
      screen.getByText('Choose a colour to continue.'),
    ).toBeInTheDocument();
    // No chip carries the selection, because there is no selection to carry.
    expect(screen.getByRole('link', { name: 'black' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  /** And one click is all it takes to clear the gate. */
  it('becomes buyable once an option is chosen', () => {
    renderWithCart(
      <ProductRecordPanel detail={detail(SPREAD)} selectedFromUrl={false} />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'black' }));

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /buy now/i })).toBeEnabled();
    expect(
      screen.queryByText('Choose a colour to continue.'),
    ).not.toBeInTheDocument();
  });

  /**
   * A product with one variant has nothing to choose, so a gate there would sit
   * in front of a door with nothing behind it. Asserted without a
   * `selectedVariant` prop on purpose: the panel resolves this itself rather
   * than relying on the page having thought of it.
   */
  it('arrives buyable when there is only one variant', () => {
    renderWithCart(
      <ProductRecordPanel
        detail={detail({ variants: [priced('black', 451)] })}
        selectedFromUrl={false}
      />,
    );

    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /buy now/i })).toBeEnabled();
  });

  /** An unavailable selection is the one remaining blocker, and it says so. */
  it('blocks purchase when the chosen option is unavailable', () => {
    renderWithCart(
      <ProductRecordPanel
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

  /**
   * The panel used to carry an approximate local figure under the price — the
   * converted amount, the rate's date, and a note about conversion costs. The
   * owner removed it 2026-08-30: the buy box is where a shopper decides, and a
   * second currency with three lines of qualification competes with the one
   * number they are actually charged.
   *
   * This is the guard, not a leftover. The panel takes no rate any more and the
   * page no longer fetches one, so the only way the block returns is
   * deliberately — and that should mean rewriting this test, not passing it.
   * `IndicativePriceLine` still ships; the cart renders it.
   */
  it('shows one currency and nothing approximate beneath it', () => {
    const { container } = renderWithCart(
      <ProductRecordPanel
        detail={detail({ variants: [priced('black', 451)] })}
        selectedFromUrl={false}
      />,
    );
    const text = container.textContent ?? '';

    expect(screen.getByText('US$4.51')).toBeInTheDocument();
    expect(text).not.toMatch(/approximate/i);
    expect(text).not.toMatch(/you are charged in us dollars/i);
    expect(text).not.toMatch(/≈/);
    expect(text).not.toMatch(/A\$/);
  });

  it('says nothing about a spread when there is only one option', () => {
    const { container } = renderWithCart(
      <ProductRecordPanel
        detail={detail({ variants: [priced('black', 451)] })}
        selectedFromUrl={false}
      />,
    );

    expect(container.textContent ?? '').not.toMatch(/cost more than this/i);
    expect(container.textContent ?? '').not.toMatch(/every option is/i);
  });
});
