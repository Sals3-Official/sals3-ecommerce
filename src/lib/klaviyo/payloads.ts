import type { CartLineItem } from '@/lib/cart';
import type { Money } from '@/lib/money';

type ProductPayloadInput = {
  productId: string;
  title: string;
  imageUrl?: string;
  unitPrice: Money;
  category?: string;
  quantity?: number;
  url?: string;
};

function moneyToKlaviyoValue(money: Money) {
  return money.amountMinor / 100;
}

function productUrl(productId: string, explicitUrl?: string) {
  if (explicitUrl) {
    return explicitUrl;
  }

  if (typeof window === 'undefined') {
    return `/p/${productId}`;
  }

  return new URL(`/p/${productId}`, window.location.origin).toString();
}

function categories(category?: string) {
  return category ? [category] : [];
}

export function toKlaviyoProductPayload(input: ProductPayloadInput) {
  return {
    ProductName: input.title,
    ProductID: input.productId,
    SKU: input.productId,
    Categories: categories(input.category),
    ImageURL: input.imageUrl,
    URL: productUrl(input.productId, input.url),
    Brand: 'Sals3',
    Price: moneyToKlaviyoValue(input.unitPrice),
    CompareAtPrice: undefined,
    ...(input.quantity ? { Quantity: input.quantity } : {}),
  };
}

export function toKlaviyoViewedItemPayload(input: ProductPayloadInput) {
  return {
    Title: input.title,
    ItemId: input.productId,
    Categories: categories(input.category),
    ImageUrl: input.imageUrl,
    Url: productUrl(input.productId, input.url),
    Metadata: {
      Brand: 'Sals3',
      Price: moneyToKlaviyoValue(input.unitPrice),
    },
  };
}

function cartLineToKlaviyoItem(line: CartLineItem, category?: string) {
  const itemPrice = moneyToKlaviyoValue(line.unitPrice);

  return {
    ProductID: line.productId,
    SKU: line.productId,
    ProductName: line.title,
    Quantity: line.quantity,
    ItemPrice: itemPrice,
    RowTotal: itemPrice * line.quantity,
    ProductURL: productUrl(line.productId),
    ImageURL: line.imageUrl,
    ProductCategories: categories(category),
  };
}

export function toKlaviyoCartPayload({
  items,
  addedItem,
  addedItemCategory,
}: {
  items: CartLineItem[];
  addedItem?: CartLineItem;
  addedItemCategory?: string;
}) {
  const klaviyoItems = items.map((line) =>
    cartLineToKlaviyoItem(
      line,
      addedItem?.productId === line.productId ? addedItemCategory : undefined,
    ),
  );
  const subtotal = items.reduce(
    (total, line) =>
      total + moneyToKlaviyoValue(line.unitPrice) * line.quantity,
    0,
  );
  const categorySet = new Set<string>();

  klaviyoItems.forEach((item) => {
    item.ProductCategories.forEach((category) => categorySet.add(category));
  });

  return {
    $value: subtotal,
    ItemNames: items.map((line) => line.title),
    CartURL:
      typeof window === 'undefined'
        ? '/cart'
        : new URL('/cart', window.location.origin).toString(),
    Items: klaviyoItems,
    Categories: Array.from(categorySet),
    ...(addedItem
      ? {
          AddedItemProductName: addedItem.title,
          AddedItemProductID: addedItem.productId,
          AddedItemSKU: addedItem.productId,
          AddedItemCategories: categories(addedItemCategory),
          AddedItemImageURL: addedItem.imageUrl,
          AddedItemURL: productUrl(addedItem.productId),
          AddedItemPrice: moneyToKlaviyoValue(addedItem.unitPrice),
          AddedItemQuantity: addedItem.quantity,
        }
      : {}),
  };
}
