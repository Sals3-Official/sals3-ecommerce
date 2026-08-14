'use server';

import { headers } from 'next/headers';
import {
  CreateCheckoutSessionInputSchema,
  type CreateCheckoutSessionInput,
} from '@/lib/checkout/schema';
import checkRateLimit from '@/lib/rate-limit';
import {
  CheckoutValidationError,
  validateCheckoutCart,
} from '@/services/checkout/cart-validation';
import { createStripeCheckoutSession } from '@/services/stripe/checkout';
import { ProductsApiError } from '@/services/storefront/client';

export type CreateCheckoutSessionResult =
  { ok: true; url: string } | { ok: false; message: string };

function requestKey(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || headersList.get('x-real-ip') || 'unknown';
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
    const url = await createStripeCheckoutSession({
      cart,
      address: parsed.data.address,
    });

    return { ok: true, url };
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return { ok: false, message: error.message };
    }

    if (error instanceof ProductsApiError) {
      return {
        ok: false,
        message: 'Catalogue check failed. Try again in a moment.',
      };
    }

    return {
      ok: false,
      message: 'Stripe checkout failed. Try again in a moment.',
    };
  }
}
