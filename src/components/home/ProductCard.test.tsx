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
    render(<ProductCard market="au" product={product} />);

    const link = screen.getByRole('link', { name: /corduroy jacket/i });

    expect(link).toHaveAttribute('href', '/au/p/corduroy-jacket');
    expect(link).toHaveAttribute('data-prefetch', 'false');
  });
});
