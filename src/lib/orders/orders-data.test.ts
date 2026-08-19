import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/lib/money';
import {
  PARCEL_LIFECYCLE_STATES,
  isExceptionState,
  rollupState,
} from './contracts';
import { filterOrders, laneCounts, paginate } from './filter';
import buildFixtureOrders from './fixtures';
import { BUYER_LANES, BUYER_STATUSES, laneOf } from './lanes';
import { noticeFor } from './notice';
import {
  DEFAULT_ORDERS_QUERY,
  buildOrdersQueryString,
  ordersHref,
  parseOrdersQuery,
  rangeLabel,
} from './query';

const NOW = new Date('2026-08-19T12:00:00Z');
const orders = buildFixtureOrders();

/** Every string a buyer could read, flattened. */
function textOf(): string {
  return JSON.stringify(orders);
}

describe('lifecycle vocabulary', () => {
  it('files every state into exactly one buyer lane', () => {
    PARCEL_LIFECYCLE_STATES.forEach((state) => {
      const lane = laneOf(state);

      expect(lane).not.toBe('all');
      expect(BUYER_LANES.map((candidate) => candidate.key)).toContain(lane);
    });
  });

  it('counts only the four lanes that measure work', () => {
    expect(
      BUYER_LANES.filter((lane) => lane.showsCount).map((lane) => lane.key),
    ).toEqual(['to-ship', 'shipping', 'completed', 'returns']);
  });

  it('rolls an order up to its exception, else its least-advanced package', () => {
    expect(rollupState(['SHIPPED', 'FULFILLING'])).toBe('FULFILLING');
    expect(rollupState(['DELIVERED', 'TRACKING_CONFLICT'])).toBe(
      'TRACKING_CONFLICT',
    );
    expect(rollupState([])).toBeUndefined();
  });

  it('offers a status word for every non-exception state', () => {
    PARCEL_LIFECYCLE_STATES.filter((state) => !isExceptionState(state)).forEach(
      (state) => {
        const owners = BUYER_STATUSES.filter(
          (status) => status.key !== 'any' && status.states.includes(state),
        );

        expect(owners).toHaveLength(1);
      },
    );
  });
});

describe('fixture orders', () => {
  it('makes every line total equal unit × quantity', () => {
    orders.forEach((order) => {
      order.packages.forEach((pkg) => {
        pkg.lines.forEach((line) => {
          const unitMinor = Math.round(
            Number(line.unitAmountLabel.replace(/[^0-9.]/g, '')) * 100,
          );

          expect(line.lineTotalLabel).toBe(
            formatMoney({
              amountMinor: unitMinor * line.quantity,
              currency: 'USD',
            }),
          );
        });
      });
    });
  });

  it('never names a supplier, a connection, a store or a variant hash', () => {
    const text = textOf();

    expect(text).not.toMatch(/S3V-/);
    expect(text).not.toMatch(/supplier connection/i);
    expect(text).not.toMatch(/\bstore\b/i);
  });

  it('never offers a review, a rating or cash on delivery', () => {
    const text = textOf();

    expect(text).not.toMatch(/\breviews?\b/i);
    expect(text).not.toMatch(/\bratings?\b/i);
    expect(text).not.toMatch(/\bCOD\b/);
    expect(text).not.toMatch(/cash on delivery/i);
  });

  it('pairs every status label with a sentence', () => {
    orders.forEach((order) => {
      expect(order.statusLabel.length).toBeGreaterThan(0);
      expect(order.statusDetail.length).toBeGreaterThan(20);
      expect(order.nextStep.length).toBeGreaterThan(20);
    });
  });

  it('holds a tracking conflict without printing "Delivered"', () => {
    const conflicted = orders.find(
      (order) => order.state === 'TRACKING_CONFLICT',
    );

    expect(conflicted).toBeDefined();
    expect(conflicted?.statusLabel).not.toMatch(/delivered/i);
    expect(conflicted?.statusDetail).toMatch(/carrier/i);
    expect(conflicted?.statusDetail).toMatch(/supplier/i);
  });

  it('gives a split order one card and two packages', () => {
    const split = orders.find((order) => order.packages.length > 1);

    expect(split?.packages).toHaveLength(2);
    expect(new Set(split?.packages.map((pkg) => pkg.state)).size).toBe(2);
    expect(split?.state).toBe('FULFILLING');
  });
});

describe('list query', () => {
  it('drops defaults out of the URL', () => {
    expect(buildOrdersQueryString(DEFAULT_ORDERS_QUERY)).toBe('');
    expect(ordersHref(DEFAULT_ORDERS_QUERY, { lane: 'shipping' })).toBe(
      '/orders?lane=shipping',
    );
  });

  it('resets the page whenever a filter changes', () => {
    const onPageFour = { ...DEFAULT_ORDERS_QUERY, page: 4 };

    expect(ordersHref(onPageFour, { lane: 'completed' })).toBe(
      '/orders?lane=completed',
    );
    expect(ordersHref(onPageFour, { page: 5 })).toBe('/orders?page=5');
  });

  it('falls back to defaults for anything not allow-listed', () => {
    expect(
      parseOrdersQuery({
        lane: 'DROP TABLE',
        range: '../../etc',
        status: '__proto__',
        page: '-3',
      }),
    ).toEqual(DEFAULT_ORDERS_QUERY);
  });

  it('discards a repeated parameter rather than guessing', () => {
    expect(parseOrdersQuery({ lane: ['all', 'shipping'] }).lane).toBe('all');
  });

  it('labels the year range with the year it means', () => {
    expect(rangeLabel('this-year', new Date('2027-03-01T00:00:00Z'))).toBe(
      '2027',
    );
  });
});

describe('filtering', () => {
  it('puts a delivered order in Completed and nowhere else', () => {
    const completed = filterOrders(
      orders,
      { ...DEFAULT_ORDERS_QUERY, lane: 'completed' },
      NOW,
    );

    expect(completed).toHaveLength(1);
    expect(completed[0]?.statusLabel).toBe('Delivered');
  });

  it('searches order numbers and product titles, and nothing else', () => {
    expect(
      filterOrders(orders, { ...DEFAULT_ORDERS_QUERY, q: 'solar' }, NOW),
    ).toHaveLength(1);
    expect(
      filterOrders(orders, { ...DEFAULT_ORDERS_QUERY, q: 'CJPacket' }, NOW),
    ).toHaveLength(0);
  });

  it('counts lanes without letting the lane filter narrow them', () => {
    const counts = laneCounts(
      orders,
      { ...DEFAULT_ORDERS_QUERY, lane: 'completed' },
      NOW,
    );

    expect(counts.completed).toBe(1);
    expect(counts.shipping).toBeGreaterThan(0);
  });

  it('keeps every fixture order on one page', () => {
    const page = paginate(orders, 1);

    expect(page.pageCount).toBe(1);
    expect(page.orders).toHaveLength(orders.length);
  });

  it('clamps a page beyond the end rather than showing nothing', () => {
    expect(paginate(orders, 99).page).toBe(1);
  });
});

describe('page notice', () => {
  it('raises the exception over a settling payment', () => {
    expect(noticeFor(orders)?.title).toMatch(/attention/i);
  });

  it('raises nothing when the visible set is quiet', () => {
    const quiet = orders.filter((order) => order.state === 'DELIVERED');

    expect(noticeFor(quiet)).toBeNull();
  });
});
