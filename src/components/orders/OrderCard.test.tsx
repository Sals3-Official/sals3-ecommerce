import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import buildFixtureOrders from '@/lib/orders/fixtures';
import { DEFAULT_ORDERS_QUERY } from '@/lib/orders/query';
import OrderCard from './OrderCard';
import OrdersLaneTabs from './OrdersLaneTabs';

const orders = buildFixtureOrders();

function orderWith(predicate: (candidate: (typeof orders)[number]) => boolean) {
  const order = orders.find(predicate);

  if (order === undefined) throw new Error('fixture missing');

  return order;
}

describe('OrderCard', () => {
  it('renders one card with a package block per package', () => {
    const split = orderWith((order) => order.packages.length === 2);

    render(<OrderCard order={split} />);

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Package 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Package 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('In transit')).toBeInTheDocument();
    expect(screen.getAllByText('Being prepared').length).toBeGreaterThan(0);
  });

  it('keeps a blocked action in the DOM, disabled, with the reason as its name', () => {
    const split = orderWith((order) => order.packages.length === 2);

    render(<OrderCard order={split} />);

    const blocked = screen.getByRole('button', {
      name: 'Cannot be cancelled — one package has shipped',
    });

    expect(blocked).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('states a tracking conflict without claiming delivery', () => {
    const conflicted = orderWith((order) => order.hasException);

    render(<OrderCard order={conflicted} />);

    const card = screen.getByRole('article');

    expect(
      within(card).getByText('Delivery needs attention'),
    ).toBeInTheDocument();
    expect(within(card).getByText('Sources disagree')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/\bDelivered\b/);
  });

  it('says why a package cannot be tracked instead of hiding the control', () => {
    const preparing = orderWith((order) => order.state === 'FULFILLING');

    render(<OrderCard order={preparing} />);

    expect(
      screen.getByRole('button', { name: 'Tracking not issued yet' }),
    ).toBeDisabled();
  });

  it('prints no supplier, connection, store, review or rating anywhere', () => {
    orders.forEach((order) => {
      const { container, unmount } = render(<OrderCard order={order} />);

      expect(container.innerHTML).not.toMatch(/S3V-/);
      expect(container.innerHTML).not.toMatch(/\breviews?\b/i);
      expect(container.innerHTML).not.toMatch(/\bratings?\b/i);
      expect(container.innerHTML).not.toMatch(/cash on delivery/i);

      unmount();
    });
  });

  it('shows the charged total and the status sentence together', () => {
    const delivered = orderWith((order) => order.state === 'DELIVERED');

    render(<OrderCard order={delivered} />);

    expect(screen.getByText('Total charged')).toBeInTheDocument();
    expect(screen.getByText(delivered.totalChargedLabel)).toBeInTheDocument();
    expect(screen.getByText(delivered.statusDetail)).toBeInTheDocument();
  });
});

describe('OrdersLaneTabs', () => {
  it('shows a count only on the lanes that measure work', () => {
    render(
      <OrdersLaneTabs
        query={DEFAULT_ORDERS_QUERY}
        counts={{
          all: 7,
          'to-pay': 1,
          'to-ship': 2,
          shipping: 2,
          completed: 1,
          returns: 1,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'All' }).textContent).toBe('All');
    expect(screen.getByRole('link', { name: 'To pay' }).textContent).toBe(
      'To pay',
    );
    expect(screen.getByRole('link', { name: /Shipping/ }).textContent).toBe(
      'Shipping2',
    );
  });

  it('links lanes rather than making them client state', () => {
    render(
      <OrdersLaneTabs
        query={DEFAULT_ORDERS_QUERY}
        counts={{
          all: 0,
          'to-pay': 0,
          'to-ship': 0,
          shipping: 0,
          completed: 0,
          returns: 0,
        }}
      />,
    );

    expect(screen.getByRole('link', { name: /Completed/ })).toHaveAttribute(
      'href',
      '/orders?lane=completed',
    );
  });
});
