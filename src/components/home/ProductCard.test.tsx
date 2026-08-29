import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usd } from '@/lib/money';
import type { Product } from '@/lib/home-placeholder-data';
import ProductCard from './ProductCard';

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

const product: Product = {
  id: 'corduroy-jacket',
  title: 'Corduroy jacket',
  price: usd(451),
  tone: 'ocean',
};

describe('ProductCard', () => {
  it('links to the PDP without prefetching the server-rendered product page', () => {
    render(<ProductCard product={product} />);

    const link = screen.getByRole('link', { name: /corduroy jacket/i });

    expect(link).toHaveAttribute('href', '/p/corduroy-jacket');
    expect(link).toHaveAttribute('data-prefetch', 'false');
  });
});

describe('the evidence line', () => {
  it('shows nothing at all on a product with no rating and no sales', () => {
    const { container } = render(<ProductCard product={product} />);

    // Not a greyed star row, not "0 sold". An unreviewed, unsold product is
    // new, and a card announcing two zeroes says the opposite.
    expect(screen.queryByText(/sold/)).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows the units sold on their own when nobody has reviewed yet', () => {
    render(<ProductCard product={{ ...product, soldUnits: 1420 }} />);

    expect(screen.getByText('1,420 sold')).toBeInTheDocument();
  });

  it('shows both halves, separated, when each is real', () => {
    render(
      <ProductCard
        product={{
          ...product,
          rating: { average: 4.6, count: 12 },
          soldUnits: 142,
        }}
      />,
    );

    expect(screen.getByText('4.6 (12)')).toBeInTheDocument();
    expect(screen.getByText('142 sold')).toBeInTheDocument();
  });

  it('keeps the rating when a refund has taken the sold count back to nothing', () => {
    // Reachable: a review cannot be deleted, but the sale behind it can be
    // reversed, and the feed then omits `soldUnits` entirely.
    render(
      <ProductCard
        product={{ ...product, rating: { average: 4, count: 1 } }}
      />,
    );

    expect(screen.getByText('4.0 (1)')).toBeInTheDocument();
    expect(screen.queryByText(/sold/)).not.toBeInTheDocument();
  });
});
