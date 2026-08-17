'use server';

import { headers } from 'next/headers';
import {
  CreateCheckoutSessionInputSchema,
  type CreateCheckoutSessionInput,
  type CheckoutShippingSelection,
  type CheckoutCartLineInput,
} from '@/lib/checkout/schema';
import checkRateLimit from '@/lib/rate-limit';
import {
  CheckoutValidationError,
  validateCheckoutCart,
} from '@/services/checkout/cart-validation';
import { createStripeCheckoutSession } from '@/services/stripe/checkout';
import { ProductsApiError } from '@/services/storefront/client';
import requestCheckoutFreightQuotes from '@/services/checkout/freight-quotes';
import type { CheckoutFreightQuoteResponse } from '@/services/storefront/schemas';

export type CreateCheckoutSessionResult =
  { ok: true; url: string } | { ok: false; message: string };
export type QuoteCheckoutShippingResult =
  | { ok: true; quote: CheckoutFreightQuoteResponse }
  | { ok: false; message: string };

function requestKey(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || headersList.get('x-real-ip') || 'unknown';
}

function selectionTotal(selection: CheckoutShippingSelection): number {
  return selection.packageSelections.reduce(
    (total, selected) => total + selected.amountMinor,
    0,
  );
}

function validateShippingSelection(
  quoted: CheckoutFreightQuoteResponse,
  selection: CheckoutShippingSelection,
): CheckoutShippingSelection {
  const selections = selection.packageSelections.map((selected) => {
    const match = quoted.quotes.find(
      (quote) =>
        quote.packageId === selected.packageId &&
        quote.optionId === selected.optionId &&
        quote.channelId === selected.channelId &&
        quote.amountMinor === selected.amountMinor,
    );

    if (match === undefined) {
      throw new CheckoutValidationError(
        'Shipping changed. Refresh delivery options and choose again.',
      );
    }

    return {
      packageId: match.packageId,
      quoteId: match.quoteId,
      optionId: match.optionId,
      channelId: match.channelId,
      cjLogisticName: match.cjLogisticName,
      arrivalTime: match.arrivalTime,
      amountMinor: match.amountMinor,
      currency: match.currency,
    };
  });
  const selectedPackages = new Set(selections.map((quote) => quote.packageId));

  if (selectedPackages.size !== quoted.packages.length) {
    throw new CheckoutValidationError(
      'Choose a delivery option for every package.',
    );
  }

  if (selectionTotal({ packageSelections: selections }) <= 0) {
    throw new CheckoutValidationError('Choose a delivery option.');
  }

  return { packageSelections: selections };
}

export async function quoteCheckoutShippingAction(input: {
  cart: { items: CheckoutCartLineInput[] };
  address: CreateCheckoutSessionInput['address'];
}): Promise<QuoteCheckoutShippingResult> {
  const parsed = CreateCheckoutSessionInputSchema.pick({
    cart: true,
    address: true,
  }).safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check your cart and address, then try again.',
    };
  }

  const headersList = await headers();
  const allowed = checkRateLimit({
    key: `checkout-shipping:${requestKey(headersList)}`,
    limit: 12,
    windowMs: 60_000,
  });

  if (!allowed) {
    return {
      ok: false,
      message:
        'Too many delivery quote attempts. Wait a minute, then try again.',
    };
  }

  try {
    const quote = await requestCheckoutFreightQuotes(parsed.data);

    return { ok: true, quote };
  } catch (error) {
    if (error instanceof ProductsApiError && error.status === 422) {
      return {
        ok: false,
        message:
          error.safeMessage ??
          'Delivery options are unavailable. Try again in a moment.',
      };
    }

    return {
      ok: false,
      message: 'Delivery options are unavailable. Try again in a moment.',
    };
  }
}

export async function createCheckoutSessionAction(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  const parsed = CreateCheckoutSessionInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check your cart and address, then try again.',
    };
  }

  const headersList = await headers();
  const allowed = checkRateLimit({
    key: `checkout:${requestKey(headersList)}`,
    limit: 8,
    windowMs: 60_000,
  });

  if (!allowed) {
    return {
      ok: false,
      message: 'Too many checkout attempts. Wait a minute, then try again.',
    };
  }

  try {
    const cart = await validateCheckoutCart(parsed.data.cart.items);
    const quoted = await requestCheckoutFreightQuotes({
      cart: parsed.data.cart,
      address: parsed.data.address,
    });
    const shippingSelection = validateShippingSelection(
      quoted,
      parsed.data.shippingSelection,
    );
    const url = await createStripeCheckoutSession({
      cart,
      address: parsed.data.address,
      shippingSelection,
      shippingQuotedAt: quoted.quotedAt,
    });

    return { ok: true, url };
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return { ok: false, message: error.message };
    }

    if (error instanceof ProductsApiError) {
      return {
        ok: false,
        message:
          error.status === 422 && error.safeMessage !== undefined
            ? error.safeMessage
            : 'Catalogue check failed. Try again in a moment.',
      };
    }

    return {
      ok: false,
      message: 'Stripe checkout failed. Try again in a moment.',
    };
  }
}
