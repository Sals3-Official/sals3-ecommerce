'use client';

import { z } from 'zod';
import getCsrfToken from '@/lib/auth/auth-csrf-client';
import type { CartLineItem } from '@/lib/cart';
import type { Money } from '@/lib/money';
import {
  collectKlaviyoBrowserContext,
  klaviyoBrowserContextSchema,
} from './browser-context';
import { hasAcceptedKlaviyoConsent } from './consent';
import {
  toKlaviyoCartPayload,
  toKlaviyoProductPayload,
  toKlaviyoViewedItemPayload,
} from './payloads';

type KlaviyoProperties = Record<string, unknown>;

type KlaviyoObject = {
  track?: (eventName: string, properties?: KlaviyoProperties) => unknown;
  identify?: (properties: KlaviyoProperties) => unknown;
  trackViewedItem?: (properties: KlaviyoProperties) => unknown;
};

declare global {
  interface Window {
    klaviyo?: unknown;
    _klOnsite?: unknown[];
  }
}

const profileSyncResponseSchema = z.object({
  status: z.enum(['synced', 'disabled', 'signed-out']),
  identify: z.record(z.string(), z.unknown()).optional(),
});

function getKlaviyoObject(): KlaviyoObject | undefined {
  if (typeof window === 'undefined' || !hasAcceptedKlaviyoConsent()) {
    return undefined;
  }

  const candidate = window.klaviyo;

  if (typeof candidate !== 'object' || candidate === null) {
    return undefined;
  }

  const record = candidate as Record<string, unknown>;

  return {
    track:
      typeof record.track === 'function'
        ? record.track.bind(candidate)
        : undefined,
    identify:
      typeof record.identify === 'function'
        ? record.identify.bind(candidate)
        : undefined,
    trackViewedItem:
      typeof record.trackViewedItem === 'function'
        ? record.trackViewedItem.bind(candidate)
        : undefined,
  };
}

export function trackKlaviyoEvent(
  eventName: string,
  properties?: KlaviyoProperties,
) {
  try {
    getKlaviyoObject()?.track?.(eventName, properties);
  } catch {
    // Tracking must never break shopping or auth flows.
  }
}

export function identifyKlaviyoProfile(properties: KlaviyoProperties) {
  try {
    getKlaviyoObject()?.identify?.(properties);
  } catch {
    // Profile enrichment is best-effort only.
  }
}

export function trackKlaviyoViewedProduct(input: {
  productId: string;
  title: string;
  imageUrl?: string;
  unitPrice: Money;
  category?: string;
}) {
  const product = toKlaviyoProductPayload(input);

  trackKlaviyoEvent('Viewed Product', product);

  try {
    getKlaviyoObject()?.trackViewedItem?.(toKlaviyoViewedItemPayload(input));
  } catch {
    // Recently viewed support is best-effort only.
  }
}

export function trackKlaviyoAddedToCart({
  items,
  addedItem,
  addedItemCategory,
}: {
  items: CartLineItem[];
  addedItem: CartLineItem;
  addedItemCategory?: string;
}) {
  trackKlaviyoEvent(
    'Added to Cart',
    toKlaviyoCartPayload({ items, addedItem, addedItemCategory }),
  );
}

export function trackKlaviyoCartViewed(items: CartLineItem[]) {
  trackKlaviyoEvent('Cart Viewed', toKlaviyoCartPayload({ items }));
}

export function trackKlaviyoCartItemRemoved(line: CartLineItem) {
  trackKlaviyoEvent('Cart Item Removed', {
    ProductID: line.productId,
    ProductName: line.title,
    Quantity: line.quantity,
    ItemPrice: line.unitPrice.amountMinor / 100,
  });
}

export function trackKlaviyoCartQuantityChanged(
  line: CartLineItem,
  nextQuantity: number,
) {
  trackKlaviyoEvent('Cart Quantity Changed', {
    ProductID: line.productId,
    ProductName: line.title,
    PreviousQuantity: line.quantity,
    NextQuantity: nextQuantity,
    ItemPrice: line.unitPrice.amountMinor / 100,
  });
}

export function trackKlaviyoBuyNowClicked(input: {
  productId: string;
  title: string;
  imageUrl?: string;
  unitPrice: Money;
  category?: string;
}) {
  trackKlaviyoEvent('Buy Now Clicked', toKlaviyoProductPayload(input));
}

export async function syncKlaviyoProfile() {
  if (!hasAcceptedKlaviyoConsent()) {
    return;
  }

  try {
    const browserContext = klaviyoBrowserContextSchema.parse(
      collectKlaviyoBrowserContext(),
    );
    const csrfToken = await getCsrfToken(
      'Unable to sync analytics profile securely.',
    );
    const response = await fetch('/api/klaviyo/profile-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrfToken, browserContext }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const parsed = profileSyncResponseSchema.safeParse(await response.json());

    if (parsed.success && parsed.data.identify) {
      identifyKlaviyoProfile(parsed.data.identify);
    }
  } catch {
    // Analytics sync is deliberately non-blocking.
  }
}
