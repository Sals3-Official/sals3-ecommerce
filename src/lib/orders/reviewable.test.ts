import { describe, expect, it } from 'vitest';
import type {
  BuyerOrder,
  BuyerOrderLine,
  BuyerOrderPackage,
} from './contracts';
import reviewableLinesOf from './reviewable';

const LINE: BuyerOrderLine = {
  id: 'line-1',
  title: 'Men Cargo Shorts 6 Pocket',
  variant: 'Digital Black / 31"-35"',
  quantity: 1,
  unitAmountLabel: 'US$14.90',
  lineTotalLabel: 'US$14.90',
  acceptedOnLabel: '12 Aug 2026',
  imageUrl: null,
  reviewable: false,
};

function orderWith(packages: Partial<BuyerOrderPackage>[]): BuyerOrder {
  return {
    id: 'o1',
    number: 'S3-2608-1194',
    placedAt: '2026-08-12T00:00:00.000Z',
    metaLine: 'Placed 12 Aug 2026',
    state: 'DELIVERED',
    statusLabel: 'Delivered',
    tone: 'delivered',
    statusDetail: 'Arrived',
    nextStep: 'Nothing needed',
    hasException: false,
    itemsLabel: '1 item',
    subtotalLabel: 'US$14.90',
    shippingLabel: 'US$0.00',
    totalChargedLabel: 'US$14.90',
    paymentLine: 'Paid by card',
    stripeReferenceLabel: 'Stripe reference cs_test',
    footNote: 'Prices as charged',
    timeline: [],
    actions: [],
    shipTo: { name: 'Aljon Garrigues', address: '', contact: '' },
    packages: packages.map((pkg, index) => ({
      id: `p${index}`,
      label: `Package ${index + 1}`,
      shippingTier: null,
      carrier: 'Carrier',
      trackingNumber: null,
      trackingUrl: null,
      arrivalLabel: 'Arrived',
      state: 'DELIVERED',
      statusLabel: 'Delivered',
      tone: 'delivered',
      lines: [],
      events: [],
      ...pkg,
    })),
  };
}

/**
 * The helper that decides whether the card draws a button at all. It reads the
 * portal's answer and adds no rule of its own — every case here is about which
 * of the payload's own signals wins.
 */
describe('reviewableLinesOf', () => {
  it('returns nothing when no line is reviewable', () => {
    const order = orderWith([{ lines: [LINE, { ...LINE, id: 'line-2' }] }]);

    expect(reviewableLinesOf(order)).toEqual([]);
  });

  it('collects reviewable lines across every package', () => {
    const order = orderWith([
      { lines: [{ ...LINE, id: 'a', reviewable: true }] },
      { lines: [{ ...LINE, id: 'b', reviewable: false }] },
      { lines: [{ ...LINE, id: 'c', reviewable: true }] },
    ]);

    expect(reviewableLinesOf(order).map((line) => line.id)).toEqual(['a', 'c']);
  });

  /** A written review wins over a flag that disagrees with it. */
  it('drops a line that already carries a review', () => {
    const order = orderWith([
      {
        lines: [
          { ...LINE, id: 'a', reviewable: true },
          {
            ...LINE,
            id: 'b',
            reviewable: true,
            review: { id: 'r1', rating: 5 },
          },
        ],
      },
    ]);

    expect(reviewableLinesOf(order).map((line) => line.id)).toEqual(['a']);
  });

  /**
   * Every field here is serialized into the browser payload for every order on
   * the page. The frozen listing, the money strings and the accepted date stay
   * on the server.
   */
  it('carries only the four fields the dialog renders', () => {
    const order = orderWith([
      {
        lines: [
          {
            ...LINE,
            reviewable: true,
            imageUrl: 'https://cdn.example.com/a.jpg',
            listing: { options: [], imageUrls: [] },
          },
        ],
      },
    ]);

    expect(reviewableLinesOf(order)).toEqual([
      {
        id: 'line-1',
        title: 'Men Cargo Shorts 6 Pocket',
        variant: 'Digital Black / 31"-35"',
        imageUrl: 'https://cdn.example.com/a.jpg',
      },
    ]);
  });
});
