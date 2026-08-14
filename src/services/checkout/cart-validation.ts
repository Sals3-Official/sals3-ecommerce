import 'server-only';

import { sumMoney, type CurrencyCode, type Money } from '@/lib/money';
import type { CheckoutCartLineInput } from '@/lib/checkout/schema';
import { fetchProductBySlug } from '@/services/storefront/products';
import type {
  ProductPayloadDetail,
  ProductVariantPayload,
} from '@/services/storefront/schemas';

export type CheckoutLine = {
  productId: string;
  variantId?: string;
  title: string;
  imageUrl?: string;
  unitPrice: Money;
  quantity: number;
};

export type ValidatedCheckoutCart = {
  lines: CheckoutLine[];
  subtotal: Money;
};

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

function variantLabel(variant: ProductVariantPayload): string | undefined {
  const options = variant.options ?? [];

  if (options.length === 0) return undefined;

  return options.map((option) => option.value).join(' · ');
}

function selectVariant(
  product: ProductPayloadDetail,
  line: CheckoutCartLineInput,
): ProductVariantPayload | undefined {
  const variants = product.variants ?? [];

  if (variants.length === 0) return undefined;

  if (line.variantId === undefined) {
    if (variants.length === 1) return variants[0];
    throw new CheckoutValidationError(
      `${product.title} needs an option selection before checkout.`,
    );
  }

  const variant = variants.find((candidate) => candidate.id === line.variantId);

  if (variant === undefined) {
    throw new CheckoutValidationError(
      `${product.title} changed since it was added to cart. Remove it and add it again.`,
    );
  }

  if (variant.availability === 'UNAVAILABLE') {
    throw new CheckoutValidationError(
      `${product.title} is no longer available in that option.`,
    );
  }

  return variant;
}

function linePrice(
  product: ProductPayloadDetail,
  variant: ProductVariantPayload | undefined,
): Money {
  return {
    amountMinor: variant?.priceMinor ?? product.priceMinor,
    currency: variant?.currency ?? product.currency,
  };
}

export async function validateCheckoutCart(
  inputLines: CheckoutCartLineInput[],
): Promise<ValidatedCheckoutCart> {
  const lines = await Promise.all(
    inputLines.map(async (line) => {
      const product = await fetchProductBySlug(line.productId);

      if (product === undefined) {
        throw new CheckoutValidationError(
          'A product in your cart is no longer available.',
        );
      }

      if (product.availability === 'UNAVAILABLE') {
        throw new CheckoutValidationError(
          `${product.title} is no longer available.`,
        );
      }

      const variant = selectVariant(product, line);
      const optionLabel =
        variant === undefined ? undefined : variantLabel(variant);
      const title =
        optionLabel === undefined
          ? product.title
          : `${product.title} - ${optionLabel}`;
      const unitPrice = linePrice(product, variant);

      return {
        productId: product.slug,
        ...(variant === undefined ? {} : { variantId: variant.id }),
        title,
        ...(product.imageUrl === undefined || product.imageUrl === null
          ? {}
          : { imageUrl: product.imageUrl }),
        unitPrice,
        quantity: line.quantity,
      };
    }),
  );

  const currencies = new Set<CurrencyCode>(
    lines.map((line) => line.unitPrice.currency),
  );

  if (currencies.size > 1) {
    throw new CheckoutValidationError(
      'Cart has more than one currency. Check out one currency at a time.',
    );
  }

  return {
    lines,
    subtotal: sumMoney(
      lines.map((line) => ({
        amountMinor: line.unitPrice.amountMinor * line.quantity,
        currency: line.unitPrice.currency,
      })),
    ),
  };
}
