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
  /*
    `LinkPendingVeil` inside the card reads this. Stubbed idle rather than left
    out: the real hook needs a router the card is not rendered inside, and every
    assertion in this file is about the card at rest, which is the state a card
    that has not been pressed is actually in. The pending branch is exercised
    where it belongs — see `LinkPendingVeil.test.tsx`.
  */
  useLinkStatus: () => ({ pending: false }),
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
  it('invites the first review, and still never prints a zero', () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText('Be the first to review')).toBeInTheDocument();
    // The reframe is the whole point: the deficit ("no reviews yet") is never
    // stated, and neither is "0 sold" - on a young catalogue a wall of zeroes
    // reads as nobody buying.
    expect(screen.queryByText(/no reviews/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sold/)).not.toBeInTheDocument();
  });

  it('offers the invitation as text, never as a control', () => {
    render(<ProductCard product={product} />);

    // The invitation adds no control of its own. The only interactive thing on
    // the card is the card, and it goes to the product page - a second control
    // labelled "review" that led anywhere else would say one thing and do
    // another, and reviewing is gated on delivery, weeks away, so it could not
    // be honoured immediately even if it were a button.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/p/corduroy-jacket');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps the sold count in front of the invitation when both apply', () => {
    render(<ProductCard product={{ ...product, soldUnits: 1420 }} />);

    // The sold count does the persuading; the invitation only asks for the
    // half that is missing.
    expect(screen.getByText('1,420 sold')).toBeInTheDocument();
    expect(screen.getByText('Be the first to review')).toBeInTheDocument();
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
    // The invitation has to disappear the moment it stops being true.
    expect(
      screen.queryByText('Be the first to review'),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByText('Be the first to review'),
    ).not.toBeInTheDocument();
  });
});
