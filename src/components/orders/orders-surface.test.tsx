import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import buildFixtureOrders from '@/lib/orders/fixtures';
import { DEFAULT_ORDERS_QUERY } from '@/lib/orders/query';
import OrdersResults from './OrdersResults';

const orders = buildFixtureOrders();

describe('OrdersResults', () => {
  it('explains which filters hid the orders rather than saying there are none', () => {
    render(
      <OrdersResults
        orders={[]}
        query={{
          ...DEFAULT_ORDERS_QUERY,
          q: 'solar lamp',
          lane: 'completed',
          range: 'last-30-days',
        }}
        laneLabel="Completed"
        rangeLabel="Last 30 days"
        statusLabel="Any status"
      />,
    );

    expect(
      screen.getByText('No order matches those three filters'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your orders are still here/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Search: solar lamp/ }),
    ).toHaveAttribute('href', '/orders?lane=completed&range=last-30-days');
    expect(screen.getByRole('link', { name: 'Clear all 3' })).toHaveAttribute(
      'href',
      '/orders',
    );
    expect(screen.queryByText('No orders yet')).toBeNull();
  });

  it('shows the new-buyer panel only when nothing is filtering', () => {
    render(
      <OrdersResults
        orders={[]}
        query={DEFAULT_ORDERS_QUERY}
        laneLabel="All"
        rangeLabel="All time"
        statusLabel="Any status"
      />,
    );

    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Start shopping' }),
    ).toBeInTheDocument();
  });

  it('renders one card per order when there are any', () => {
    render(
      <OrdersResults
        orders={orders.slice(0, 3)}
        query={DEFAULT_ORDERS_QUERY}
        laneLabel="All"
        rangeLabel="All time"
        statusLabel="Any status"
      />,
    );

    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
});

/**
 * `ink-faint` (#8A9196) measures 3.2:1 on white — below the 4.5:1 minimum for
 * body text at these sizes. The design admits exactly two uses of it, both
 * inherited from shipped components: a search placeholder and a decorative
 * icon. This walks the feature's own source so a future edit cannot reintroduce
 * it as a text colour without the suite noticing.
 */
describe('contrast', () => {
  const roots = ['src/components/orders', 'src/app/orders'];
  const allowed = new Set(['OrdersToolbar.tsx']);

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) return sourceFiles(full);

      if (entry.name.includes('.test.')) return [];

      return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')
        ? [full]
        : [];
    });
  }

  it('uses ink-faint only for the search placeholder and its icon', () => {
    roots
      .flatMap(sourceFiles)
      .filter((file) => !allowed.has(path.basename(file)))
      .forEach((file) => {
        expect(readFileSync(file, 'utf8')).not.toContain('ink-faint');
      });
  });

  it('never writes a raw hex colour where a token exists', () => {
    roots.flatMap(sourceFiles).forEach((file) => {
      expect(readFileSync(file, 'utf8')).not.toMatch(/#[0-9A-Fa-f]{6}\b/);
    });
  });
});
