import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { default: toBuyerOrder } = await import('./from-api');
const {
  SPLIT_ORDER_PAYLOAD,
  CONFLICT_ORDER_PAYLOAD,
  UNSYNCED_ORDER_PAYLOAD,
  FROZEN_LISTING_ORDER_PAYLOAD,
} = await import('../../../test/fixtures/buyer-order-payloads');

describe('toBuyerOrder', () => {
  it('rolls a split order up to its least-advanced package', () => {
    const order = toBuyerOrder(SPLIT_ORDER_PAYLOAD);

    expect(order.state).toBe('FULFILLING');
    expect(order.statusLabel).toBe('Being prepared');
    expect(order.packages).toHaveLength(2);
    expect(order.packages[0]?.statusLabel).toBe('In transit');
    expect(order.packages[1]?.statusLabel).toBe('Being prepared');
  });

  it('formats every money value server-side, unit × qty = line total', () => {
    const order = toBuyerOrder(SPLIT_ORDER_PAYLOAD);
    const [pkg1] = order.packages;

    expect(pkg1?.lines[0]?.unitAmountLabel).toBe('US$22.99');
    expect(pkg1?.lines[0]?.lineTotalLabel).toBe('US$45.98');
    expect(order.subtotalLabel).toBe('US$91.97');
    expect(order.shippingLabel).toBe('US$22.84');
    // Total charged is Stripe's number, not a recomputation.
    expect(order.totalChargedLabel).toBe('US$137.80');
  });

  it('holds a tracking conflict without printing Delivered', () => {
    const order = toBuyerOrder(CONFLICT_ORDER_PAYLOAD);

    expect(order.hasException).toBe(true);
    expect(order.statusLabel).toBe('Delivery needs attention');
    expect(order.packages[0]?.statusLabel).toBe('Sources disagree');
    expect(order.statusDetail).toMatch(/carrier/i);
    expect(order.statusDetail).toMatch(/supplier/i);
    expect(order.statusLabel).not.toMatch(/delivered/i);
    expect(order.actions[0]?.label).toBe('Contact support');
  });

  it('falls back to the worker status when the sync has not stamped a state', () => {
    const order = toBuyerOrder(UNSYNCED_ORDER_PAYLOAD);

    expect(order.state).toBe('FULFILLMENT_QUEUED');
    expect(order.statusLabel).toBe('Being prepared');
    expect(order.packages[0]?.arrivalLabel).toBe(
      'Arrival window issued when it ships',
    );
  });

  it('attributes the arrival window and translates the day range', () => {
    const order = toBuyerOrder(SPLIT_ORDER_PAYLOAD);

    expect(order.packages[0]?.arrivalLabel).toBe('Arrives in 12–18 days');
  });

  it('keeps blocked actions blocked with the reason as label', () => {
    const order = toBuyerOrder(SPLIT_ORDER_PAYLOAD);
    const track = order.actions.find((action) => action.id === 'track');
    const cancel = order.actions.find((action) => action.id === 'cancel');

    expect(track?.blockedReason).toBe(
      'No carrier tracking link yet — copy the number',
    );
    expect(cancel?.blockedReason).toBe(
      'Cannot be cancelled — one package has shipped',
    );
  });

  it('lets a refunded payment outrank parcel movement', () => {
    const order = toBuyerOrder({
      ...SPLIT_ORDER_PAYLOAD,
      paymentStatus: 'REFUNDED',
    });

    expect(order.state).toBe('REFUNDED');
    expect(order.statusLabel).toBe('Refunded');
    expect(order.paymentLine).toBe('Refund issued through Stripe.');
  });

  it('refuses an unsupported currency rather than mislabeling it', () => {
    expect(() =>
      toBuyerOrder({ ...SPLIT_ORDER_PAYLOAD, currency: 'PHP' }),
    ).toThrow(/Unsupported order currency/);
  });

  it('never leaks a supplier word into the rendered strings', () => {
    const text = JSON.stringify([
      toBuyerOrder(SPLIT_ORDER_PAYLOAD),
      toBuyerOrder(CONFLICT_ORDER_PAYLOAD),
      toBuyerOrder(UNSYNCED_ORDER_PAYLOAD),
    ]);

    expect(text).not.toMatch(/S3V-/);
    expect(text).not.toMatch(/CJ_/);
    expect(text).not.toMatch(/\breviews?\b/i);
    expect(text).not.toMatch(/cash on delivery/i);
  });

  it('assembles ship-to and the truncated Stripe reference', () => {
    const order = toBuyerOrder(SPLIT_ORDER_PAYLOAD);

    expect(order.shipTo.address).toBe(
      'Blk 4 Lot 10, Carnation Street, Phase 2, San Fernando, Pampanga, 2000, PH',
    );
    expect(order.shipTo.contact).toBe('aljon@example.com · 0927 173 9215');
    expect(order.stripeReferenceLabel).toMatch(/^Stripe reference cs_live_/);
    expect(order.stripeReferenceLabel).toContain('…');
  });
});

/**
 * Owner decision 2026-08-21: an order shows the listing as it was bought, so a
 * seller who renames a product or replaces its photos afterwards changes nothing
 * a past buyer sees.
 */
describe('toBuyerOrder - the listing as ordered', () => {
  function frozenLine() {
    return toBuyerOrder(FROZEN_LISTING_ORDER_PAYLOAD).packages[0]!.lines[0]!;
  }

  it('prefers the buyer-facing axes over the supplier token', () => {
    // `variantLabel` is `army green-L` — the supplier's own concatenated string.
    // The buyer chose `Colour: Army Green` and `Size: L`.
    expect(frozenLine().variant).toBe('Colour: Army Green · Size: L');
  });

  it('carries the frozen gallery, description, specification and category', () => {
    const { listing } = frozenLine();

    expect(listing?.description).toHaveLength(2);
    expect(listing?.specification).toHaveLength(2);
    expect(listing?.categoryPath).toContain('Outerwear');
    expect(listing?.specs?.brand).toBe('Generic');
  });

  /**
   * A stored address is still an address this deployment is about to fetch. The
   * portal checked the host on the way in; that is not a reason to skip the
   * check on the way out.
   */
  it('re-checks every frozen image against the host allow-list', () => {
    const { listing } = frozenLine();

    expect(listing?.imageUrls).toHaveLength(2);
    expect(listing?.imageUrls.join(' ')).not.toContain('untrusted.example.com');
  });

  it('falls back to the supplier token for an order with no snapshot', () => {
    const order = toBuyerOrder(SPLIT_ORDER_PAYLOAD);
    const line = order.packages[0]!.lines[0]!;

    expect(line.listing).toBeUndefined();
    expect(line.variant).toBe('Warm white-EU plug');
  });
});
