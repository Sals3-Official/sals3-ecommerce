import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import toCheckoutReceipt from './receipt';

vi.mock('server-only', () => ({}));

type SessionShape = Parameters<typeof toCheckoutReceipt>[0];

function lineItem(overrides: Record<string, unknown>) {
  return {
    id: 'li_1',
    description: 'Item',
    quantity: 1,
    amount_total: 1000,
    currency: 'usd',
    ...overrides,
  } as unknown as Stripe.LineItem;
}

function session(overrides: Record<string, unknown> = {}): SessionShape {
  return {
    currency: 'usd',
    amount_total: 3335,
    customer_details: { email: 'buyer@example.com' },
    metadata: {
      sals3_line_count: '2',
      sals3_shipping_total_minor: '409',
      sals3_shipping_options: 'pkg_1:opt_1:chan_1:409:12-20',
    },
    line_items: {
      data: [
        lineItem({
          id: 'li_hat',
          description: "Men's Cold-proof Woolen Hat",
          quantity: 2,
          amount_total: 1312,
          price: { product: { images: ['https://cdn.example/hat.jpg'] } },
        }),
        lineItem({
          id: 'li_scarf',
          description: 'Wool Scarf',
          quantity: 1,
          amount_total: 1614,
        }),
        lineItem({
          id: 'li_ship',
          description: 'Shipping - CJPacket Postal',
          amount_total: 409,
        }),
      ],
    },
    payment_intent: {
      shipping: {
        name: 'Buyer Example',
        phone: '+639171234567',
        address: {
          line1: '123 Main Street',
          line2: null,
          city: 'Manila',
          state: 'National Capital Region (NCR)',
          postal_code: '1000',
          country: 'PH',
        },
      },
    },
    ...overrides,
  } as unknown as SessionShape;
}

describe('toCheckoutReceipt', () => {
  it('separates the purchased items from the shipping line', () => {
    const receipt = toCheckoutReceipt(session());

    expect(receipt.items).toHaveLength(2);
    expect(receipt.items[0]).toMatchObject({
      title: "Men's Cold-proof Woolen Hat",
      quantity: 2,
      lineTotal: 'US$13.12',
      imageUrl: 'https://cdn.example/hat.jpg',
    });
    expect(receipt.items.map((item) => item.title)).not.toContain(
      'Shipping - CJPacket Postal',
    );
  });

  /*
   * The split is driven by the line count this app wrote at session creation,
   * not by matching a display name — a product legitimately named "Shipping
   * Container" must not be mistaken for the freight line.
   */
  it('uses the recorded line count rather than the description', () => {
    const receipt = toCheckoutReceipt(
      session({
        metadata: { sals3_line_count: '1' },
        line_items: {
          data: [
            lineItem({ id: 'li_a', description: 'Shipping Container Model' }),
            lineItem({ id: 'li_b', description: 'Shipping - CJPacket Postal' }),
          ],
        },
      }),
    );

    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]?.title).toBe('Shipping Container Model');
  });

  it('keeps legacy v1 carrier receipts readable', () => {
    const receipt = toCheckoutReceipt(session());

    expect(receipt.delivery).toMatchObject({
      service: 'CJPacket Postal',
      amount: 'US$4.09',
    });
    expect(receipt.delivery?.packages).toEqual([
      { id: 'pkg_1', arrivalTime: '12-20' },
    ]);
  });

  it('reports v2 Sals3 tiers instead of exposing CJ courier names', () => {
    const receipt = toCheckoutReceipt(
      session({
        metadata: {
          sals3_checkout_version: 'cj_freight_v2',
          sals3_line_count: '2',
          sals3_shipping_total_minor: '409',
          sals3_shipping_delivery: 'Standard:12-20',
        },
        line_items: {
          data: [
            lineItem({ id: 'li_a', description: 'Item A' }),
            lineItem({ id: 'li_b', description: 'Item B' }),
            lineItem({
              id: 'li_ship',
              description: 'Shipping - Standard',
              amount_total: 409,
            }),
          ],
        },
      }),
    );

    expect(receipt.delivery).toMatchObject({
      service: 'Standard',
      amount: 'US$4.09',
      packages: [
        {
          id: 'package-1',
          shippingTier: 'Standard',
          arrivalTime: '12-20',
        },
      ],
    });
    expect(JSON.stringify(receipt.delivery)).not.toContain('CJPacket');
  });

  /* Fields are read from the end, so a colon inside an id shifts nothing. */
  it('parses the arrival window even when an id contains a colon', () => {
    const receipt = toCheckoutReceipt(
      session({
        metadata: {
          sals3_line_count: '2',
          sals3_shipping_options: 'pkg:a:opt:1:chan_1:409:7-14',
        },
      }),
    );

    expect(receipt.delivery?.packages[0]?.arrivalTime).toBe('7-14');
  });

  it('lists every package when an order ships in more than one', () => {
    const receipt = toCheckoutReceipt(
      session({
        metadata: {
          sals3_line_count: '2',
          sals3_shipping_options:
            'pkg_1:opt_1:chan_1:409:12-20,pkg_2:opt_2:chan_2:512:5-9',
        },
      }),
    );

    expect(receipt.delivery?.packages).toEqual([
      { id: 'pkg_1', arrivalTime: '12-20' },
      { id: 'pkg_2', arrivalTime: '5-9' },
    ]);
  });

  it('flattens the shipping address Stripe recorded at payment time', () => {
    const receipt = toCheckoutReceipt(session());

    expect(receipt.shipTo).toEqual({
      fullName: 'Buyer Example',
      phone: '+639171234567',
      addressLine:
        '123 Main Street, Manila, National Capital Region (NCR), 1000, PH',
    });
  });

  it('omits an address that Stripe did not expand', () => {
    const receipt = toCheckoutReceipt(session({ payment_intent: 'pi_123' }));

    expect(receipt.shipTo).toBeUndefined();
  });

  it('drops the image of a deleted product rather than failing', () => {
    const receipt = toCheckoutReceipt(
      session({
        metadata: { sals3_line_count: '1' },
        line_items: {
          data: [
            lineItem({ price: { product: { deleted: true, images: ['x'] } } }),
          ],
        },
      }),
    );

    expect(receipt.items[0]?.imageUrl).toBeUndefined();
  });

  it('says so rather than guessing when the currency is unsupported', () => {
    const receipt = toCheckoutReceipt(
      session({
        currency: 'jpy',
        metadata: { sals3_line_count: '1' },
        line_items: {
          data: [lineItem({ currency: 'jpy', amount_total: 1000 })],
        },
      }),
    );

    expect(receipt.items[0]?.lineTotal).toBe('Amount unavailable');
  });
});
