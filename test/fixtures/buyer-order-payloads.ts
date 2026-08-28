import type { BuyerOrderPayload } from '@/services/storefront/orders';

/**
 * Portal `GET /api/storefront/orders*` payloads, as the wire shape.
 *
 * Used by the `from-api` mapper tests and by the route tests (through a
 * mocked `services/storefront/orders`), so both sides of the seam are
 * exercised against the same documents. Shapes mirror
 * `sals3-portal/src/modules/orders/buyer-read.ts`.
 */

/** Two packages, one shipped with events, one still being prepared. */
export const SPLIT_ORDER_PAYLOAD: BuyerOrderPayload = {
  orderNumber: 'S3-20260812-9F3C1A7B2E',
  placedAt: '2026-08-12T14:08:00.000Z',
  paymentStatus: 'PAID',
  currency: 'USD',
  amountTotalMinor: 13780,
  stripeCheckoutSessionId: 'cs_live_a1B2c3D4e5F6g7H8i9xYz',
  shipTo: {
    name: 'Aljon Garrigues',
    addressLine1: 'Blk 4 Lot 10, Carnation Street',
    addressLine2: 'Phase 2',
    city: 'San Fernando',
    region: 'Pampanga',
    postalCode: '2000',
    country: 'PH',
    email: 'aljon@example.com',
    phone: '0927 173 9215',
  },
  packages: [
    {
      packageId: 'pkg_1',
      shippingTier: 'Standard',
      carrier: 'CJPacket Ordinary',
      trackingNumber: 'CJP7742119055',
      parcelState: 'SHIPPED',
      fulfillmentStatus: 'CJ_PAID',
      shippingAmountMinor: 1284,
      arrivalDays: '12-18',
      lines: [
        {
          id: 'line-1',
          title: 'Solar wall lamp, motion sensor, 3 colour modes',
          variantLabel: 'Warm white-EU plug',
          quantity: 2,
          unitAmountMinor: 2299,
          imageUrl: null,
          acceptedAt: '2026-08-12T14:09:00.000Z',
        },
      ],
      events: [
        {
          id: 'evt-1',
          source: 'CARRIER',
          label: 'Handed to the carrier',
          occurredAt: '2026-08-14T09:22:00.000Z',
          isException: false,
        },
        {
          id: 'evt-2',
          source: 'CARRIER',
          label: 'Departed sorting facility, Shenzhen',
          occurredAt: '2026-08-15T22:41:00.000Z',
          isException: false,
        },
      ],
    },
    {
      packageId: 'pkg_2',
      shippingTier: 'Express',
      carrier: 'CJPacket Sensitive',
      trackingNumber: null,
      parcelState: 'FULFILLING',
      fulfillmentStatus: 'CJ_PAID',
      shippingAmountMinor: 1000,
      arrivalDays: null,
      lines: [
        {
          id: 'line-2',
          title: 'Wireless earbuds, active noise cancelling',
          variantLabel: 'Midnight black',
          quantity: 1,
          unitAmountMinor: 4599,
          imageUrl: null,
          acceptedAt: '2026-08-12T14:09:00.000Z',
        },
      ],
      events: [
        {
          id: 'evt-3',
          source: 'SUPPLIER',
          label: 'Preparing the package',
          occurredAt: '2026-08-13T03:55:00.000Z',
          isException: false,
        },
      ],
    },
  ],
};

/** Carrier says delivered, supplier disagrees — the sync stamped a conflict. */
export const CONFLICT_ORDER_PAYLOAD: BuyerOrderPayload = {
  orderNumber: 'S3-20260805-A31F7C0D96',
  placedAt: '2026-08-05T16:30:00.000Z',
  paymentStatus: 'PAID',
  currency: 'USD',
  amountTotalMinor: 6140,
  stripeCheckoutSessionId: 'cs_live_g7H8i9J0k1L2m3N4o5pQr',
  shipTo: SPLIT_ORDER_PAYLOAD.shipTo,
  packages: [
    {
      packageId: 'pkg_1',
      shippingTier: 'Expedited',
      carrier: 'CJPacket Ordinary',
      trackingNumber: 'CJP7590441220',
      parcelState: 'TRACKING_CONFLICT',
      fulfillmentStatus: 'CJ_PAID',
      shippingAmountMinor: 641,
      arrivalDays: '10-15',
      lines: [
        {
          id: 'line-3',
          title: 'LED desk lamp, 3 brightness levels',
          variantLabel: 'White-USB-C',
          quantity: 1,
          unitAmountMinor: 5499,
          imageUrl: null,
          acceptedAt: '2026-08-05T16:31:00.000Z',
        },
      ],
      events: [
        {
          id: 'evt-4',
          source: 'CARRIER',
          label: 'Reported delivered',
          occurredAt: '2026-08-17T13:02:00.000Z',
          isException: true,
        },
      ],
    },
  ],
};

/** Fresh order the status sync has never touched — worker status only. */
export const UNSYNCED_ORDER_PAYLOAD: BuyerOrderPayload = {
  orderNumber: 'S3-20260819-2B6E44F017',
  placedAt: '2026-08-19T08:12:00.000Z',
  paymentStatus: 'PAID',
  currency: 'USD',
  amountTotalMinor: 13980,
  stripeCheckoutSessionId: 'cs_live_c3D4e5F6g7H8i9J0k1lMn',
  shipTo: SPLIT_ORDER_PAYLOAD.shipTo,
  packages: [
    {
      packageId: 'pkg_1',
      shippingTier: null,
      carrier: 'CJPacket Ordinary',
      trackingNumber: null,
      parcelState: null,
      fulfillmentStatus: 'PENDING',
      shippingAmountMinor: 1080,
      arrivalDays: '14-20',
      lines: [
        {
          id: 'line-4',
          title: 'Ergonomic mesh office chair',
          variantLabel: 'Graphite-headrest',
          quantity: 1,
          unitAmountMinor: 12900,
          imageUrl: null,
          acceptedAt: '2026-08-19T08:13:00.000Z',
        },
      ],
      events: [],
    },
  ],
};

const ALL_PAYLOADS: BuyerOrderPayload[] = [
  SPLIT_ORDER_PAYLOAD,
  CONFLICT_ORDER_PAYLOAD,
  UNSYNCED_ORDER_PAYLOAD,
];

export default ALL_PAYLOADS;

/**
 * An order whose line carries the frozen listing (portal migration `0026` and
 * the capture that follows it).
 *
 * The listing deliberately disagrees with the line's own frozen columns in one
 * visible way: the buyer chose `Colour: Army Green` / `Size: L` from the mapped
 * axes, while `variantLabel` holds the supplier's own `army green-L` token. That
 * is the pair the mapper has to prefer, and the reason it exists.
 */
export const FROZEN_LISTING_ORDER_PAYLOAD: BuyerOrderPayload = {
  ...SPLIT_ORDER_PAYLOAD,
  orderNumber: 'S3-20260821-FROZENLIST',
  packages: [
    {
      ...SPLIT_ORDER_PAYLOAD.packages[0]!,
      lines: [
        {
          id: 'line-frozen',
          title: "Men's Casual Retro Corduroy Jacket Coat",
          variantLabel: 'army green-L',
          quantity: 1,
          unitAmountMinor: 725,
          imageUrl: 'https://cf.cjdropshipping.com/frozen/cover.jpg',
          acceptedAt: '2026-08-21T01:09:00.000Z',
          listing: {
            version: 1,
            productSlug: 'mens-casual-retro-corduroy-jacket-coat',
            title: "Men's Casual Retro Corduroy Jacket Coat",
            categoryPath: 'Apparel & Accessories > Clothing > Outerwear',
            options: [
              { name: 'Colour', value: 'Army Green' },
              { name: 'Size', value: 'L' },
            ],
            imageUrls: [
              'https://cf.cjdropshipping.com/frozen/cover.jpg',
              'https://cf.cjdropshipping.com/frozen/back.jpg',
              // Not on the allow-list: this one must be dropped, and dropping
              // it must not cost the other two or the panel.
              'https://untrusted.example.com/frozen/side.jpg',
            ],
            description: {
              blocks: [
                { type: 'heading', level: 2, text: 'About this jacket' },
                { type: 'paragraph', text: 'Corduroy, cotton, regular fit.' },
              ],
            },
            specification: [
              { label: 'Material', value: '100% Cotton' },
              { label: 'Fit Type', value: 'Regular Fit' },
            ],
            specs: { brand: 'Generic', condition: 'NEW', weightGrams: 700 },
          },
        },
      ],
    },
  ],
};
