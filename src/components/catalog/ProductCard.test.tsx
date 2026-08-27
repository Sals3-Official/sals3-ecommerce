import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usd } from '@/lib/money';
import ProductCard, { type CatalogProductCardProduct } from './ProductCard';

vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    className,
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} className={className}>
      {children}
    </a>
  ),
}));

const baseProduct: CatalogProductCardProduct = {
  id: 'tactical-pants',
  cardTitle: 'SALS3 Tactical Pants – Ripstop, 10 Pockets',
  price: usd(85000),
  rating: 4.5,
  reviewCount: 128,
  shipLine: 'Free shipping to Metro Manila',
  tone: 'ocean',
  imageAlt: 'SALS3 Tactical Pants',
};

describe('ProductCard', () => {
  it('renders the price as the heaviest, largest text and links to the PDP', () => {
    render(<ProductCard market="au" product={baseProduct} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/au/p/tactical-pants');
    expect(link).toHaveAttribute('data-prefetch', 'false');

    const price = screen.getByText('US$850');
    expect(price).toHaveClass('font-semibold', 'text-[22px]');
  });

  it('keeps the title regular-weight, quiet, and clamped to 2 lines', () => {
    render(<ProductCard market="au" product={baseProduct} />);

    const title = screen.getByText(baseProduct.cardTitle);
    expect(title).toHaveClass('font-normal', 'line-clamp-2', 'text-ink-muted');
    expect(title.className).not.toMatch(/font-bold|font-semibold/);
  });

  /*
   * The card carries one price and no comparison. Sals3 publishes no
   * evidence-backed `oldPrice` (ADR-003), so the strikethrough and the percent
   * badge were removed rather than left waiting on data that never arrives —
   * and an `oldPrice` reaching the card must not resurrect them.
   */
  it('shows no comparison price and no percent-off badge', () => {
    render(
      <ProductCard
        market="au"
        product={{ ...baseProduct, oldPrice: usd(120000) }}
      />,
    );

    expect(screen.queryByText('US$1,200')).not.toBeInTheDocument();
    expect(screen.queryByText(/^-\d+%$/)).not.toBeInTheDocument();
  });

  it('renders the price on its own with no old price present', () => {
    render(<ProductCard market="au" product={baseProduct} />);

    expect(screen.getByText('US$850')).toBeInTheDocument();
    expect(screen.queryByText(/^-\d+%$/)).not.toBeInTheDocument();
  });

  it('falls back to the tone placeholder when there is no product image', () => {
    const { container } = render(
      <ProductCard market="au" product={baseProduct} />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('.aspect-square')).toBeInTheDocument();
  });

  it('renders rating, review count, and shipping line in the footer', () => {
    render(<ProductCard market="au" product={baseProduct} />);

    expect(screen.getByText('★ 4.5 (128)')).toBeInTheDocument();
    expect(
      screen.getByText('Free shipping to Metro Manila'),
    ).toBeInTheDocument();
  });
});
