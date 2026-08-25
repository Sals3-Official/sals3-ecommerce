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

/**
 * The fixtures deliberately never mark a line reviewable — eligibility is a real
 * parcel state on a real order — so the one state that draws the review control
 * has to be built here rather than found.
 */
function withReviewableLines(order: (typeof orders)[number]) {
  const first = order.packages[0];

  if (first === undefined) throw new Error('fixture missing a package');

  return {
    ...order,
    packages: [
      {
        ...first,
        lines: first.lines.map((line) => ({ ...line, reviewable: true })),
      },
      ...order.packages.slice(1),
    ],
  };
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

  /**
   * The fixtures never mark a line reviewable — eligibility is a real parcel
   * state on a real order — so this is the shape of every card a developer sees
   * locally, and none of them may print a supplier, a store, or a rating.
   *
   * The `review` word is no longer forbidden outright: since 2026-08-25 the
   * footer carries one order-level `Rate & review` button when the portal says
   * a line is reviewable. It stays forbidden *here*, because nothing in the
   * fixtures is, and a card that offered it anyway would be offering a button no
   * backend could honour.
   */
  it('prints no supplier, store, review or rating when nothing is reviewable', () => {
    orders.forEach((order) => {
      const { container, unmount } = render(<OrderCard order={order} />);

      expect(container.innerHTML).not.toMatch(/S3V-/);
      expect(container.innerHTML).not.toMatch(/\breviews?\b/i);
      expect(container.innerHTML).not.toMatch(/\bratings?\b/i);
      expect(container.innerHTML).not.toMatch(/cash on delivery/i);

      unmount();
    });
  });

  /**
   * One button for the order, never one per line: the footer is a row of
   * order-level actions, and the count belongs in the label rather than in three
   * controls that read as three different things to do.
   */
  it('offers one review button for an order with reviewable lines', () => {
    const delivered = orderWith((order) => order.state === 'DELIVERED');

    render(<OrderCard order={withReviewableLines(delivered)} />);

    const buttons = screen.getAllByRole('button', { name: /rate & review/i });

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-haspopup', 'dialog');
  });

  /**
   * Two filled buttons side by side compete, and the one with a deadline should
   * win. `View order details` keeps its place and its link either way — only the
   * treatment moves.
   *
   * `details` is forced to `primary` here rather than taken from the fixture,
   * because the fixture's delivered order spends its primary on a blocked "Buy
   * again" and hands `details` the outline already. `actionsOf` in
   * `from-api.ts` — the mapper every real order goes through — returns
   * `details` as `primary` for `DELIVERED`, so `primary` is the state that
   * actually reaches a buyer and the only one where the clash exists.
   */
  it('steps a primary View order details down to outline when a review is offered', () => {
    const delivered = orderWith((order) => order.state === 'DELIVERED');
    const asProduced = {
      ...delivered,
      actions: delivered.actions.map((action) =>
        action.id === 'details'
          ? { ...action, kind: 'primary' as const }
          : action,
      ),
    };

    // The filled treatment, matched on the pair rather than on `bg-brand-600`
    // alone: the outline variant carries `hover:bg-brand-600/10`, so the
    // substring on its own passes for both and the assertion would prove
    // nothing.
    const { unmount } = render(<OrderCard order={asProduced} />);

    expect(
      screen.getByRole('link', { name: 'View order details' }).className,
    ).toContain('bg-brand-600 text-white');
    unmount();

    render(<OrderCard order={withReviewableLines(asProduced)} />);

    const details = screen.getByRole('link', { name: 'View order details' });

    expect(details).toHaveAttribute('href', `/orders/${delivered.number}`);
    expect(details.className).not.toContain('bg-brand-600 text-white');
    expect(details.className).toContain('border border-brand-600');
  });

  /** Only the `primary` clash is worth resolving; a `quiet` action stays quiet. */
  it('leaves an already-secondary View order details alone', () => {
    const delivered = orderWith((order) => order.state === 'DELIVERED');

    render(<OrderCard order={withReviewableLines(delivered)} />);

    expect(
      screen.getByRole('link', { name: 'View order details' }).className,
    ).toContain('border border-brand-600');
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
