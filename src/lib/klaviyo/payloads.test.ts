import { describe, expect, it } from 'vitest';
import type { CartLineItem } from '@/lib/cart';
import { usd } from '@/lib/money';
import {
  toKlaviyoCartPayload,
  toKlaviyoProductPayload,
  toKlaviyoViewedItemPayload,
} from './payloads';

const cartLine: CartLineItem = {
  productId: 'air-cooler',
  title: 'Quiet tower air cooler',
  category: 'home-living',
  imageAlt: 'Quiet tower air cooler',
  imageUrl: 'https://example.com/air-cooler.webp',
  tone: 'ocean',
  unitPrice: usd(199900),
  quantity: 2,
};

describe('Klaviyo payload mappers', () => {
  it('maps product detail into Klaviyo ecommerce fields', () => {
    expect(
      toKlaviyoProductPayload({
        productId: 'air-cooler',
        title: 'Quiet tower air cooler',
        imageUrl: 'https://example.com/air-cooler.webp',
        unitPrice: usd(199900),
        category: 'home-living',
        url: 'https://sals3.example/p/air-cooler',
      }),
    ).toMatchObject({
      ProductName: 'Quiet tower air cooler',
      ProductID: 'air-cooler',
      SKU: 'air-cooler',
      Categories: ['home-living'],
      Price: 1999,
      URL: 'https://sals3.example/p/air-cooler',
    });
  });

  it('maps recently viewed items separately from events', () => {
    expect(
      toKlaviyoViewedItemPayload({
        productId: 'air-cooler',
        title: 'Quiet tower air cooler',
        unitPrice: usd(199900),
        category: 'home-living',
      }),
    ).toMatchObject({
      Title: 'Quiet tower air cooler',
      ItemId: 'air-cooler',
      Categories: ['home-living'],
      Metadata: { Brand: 'Sals3', Price: 1999 },
    });
  });

  it('maps cart state and the newly added item', () => {
    expect(
      toKlaviyoCartPayload({
        items: [cartLine],
        addedItem: { ...cartLine, quantity: 1 },
        addedItemCategory: 'home-living',
      }),
    ).toMatchObject({
      $value: 3998,
      ItemNames: ['Quiet tower air cooler'],
      Categories: ['home-living'],
      AddedItemProductID: 'air-cooler',
      AddedItemQuantity: 1,
      Items: [
        {
          ProductID: 'air-cooler',
          Quantity: 2,
          ItemPrice: 1999,
          RowTotal: 3998,
        },
      ],
    });
  });
});
