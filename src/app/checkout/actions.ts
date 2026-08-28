'use server';

import { headers } from 'next/headers';
import {
  CreateCheckoutSessionInputSchema,
  type CreateCheckoutSessionInput,
  type CheckoutShippingSelection,
  type CheckoutCartLineInput,
} from '@/lib/checkout/schema';
import { getRevocationCheckedBuyerSession } from '@/lib/auth/dal';
import {
  classifyStorefrontFailure,
  logCheckoutFailure,
} from '@/lib/checkout/failure-log';
import checkRateLimit from '@/lib/rate-limit';
import {
  CheckoutValidationError,
  validateCheckoutCart,
} from '@/services/checkout/cart-validation';
import { createStripeCheckoutSession } from '@/services/stripe/checkout';
import { ProductsApiError } from '@/services/storefront/client';
import requestCheckoutFreightQuotes from '@/services/checkout/freight-quotes';
import createPortalCheckoutIntent from '@/services/checkout/intent';
import type { CheckoutFreightQuoteResponse } from '@/services/storefront/schemas';

/**
 * Shown when an action runs without a signed-in buyer.
 *
 * Both actions below check the session themselves rather than trusting the
 * guard on `/checkout`. A Server Action is an independently addressable POST
 * endpoint whose id ships inside the public client bundle, so a page-level
 * redirect is a UI gate only — these two spend real money and real CJ quota
 * and must re-verify (rules 18 and 19, and the bundled Next auth guide's
 * "treat Server Actions with the same security considerations as
 * public-facing API endpoints").
 *
 * The message is deliberately the same sentence for a missing, expired,
 * forged, and revoked session: the caller is told what to do, not what the
 * server knows about them (rule 34).
 */
const SIGNED_OUT_MESSAGE = 'Sign in to continue to checkout.';

/**
 * Two failures, two sentences.
 *
 * `UNSHIPPABLE_MESSAGE` carries no "try again": the portal raises it when a
 * cart item has no offer that can be shipped at all, so retrying spends
 * rate-limit budget on an outcome that cannot change. Only a genuinely
 * transient upstream failure invites another attempt.
 */
const UNSHIPPABLE_MESSAGE =
  'An item in your cart cannot be delivered to this address. Remove it, or use a different address.';
const QUOTE_UNAVAILABLE_MESSAGE =
  'Delivery options are unavailable. Try again in a moment.';

export type CreateCheckoutSessionResult =
  | { ok: true; clientSecret: string; sessionId: string }
  | { ok: false; message: string };
export type QuoteCheckoutShippingResult =
  | { ok: true; quote: CheckoutFreightQuoteResponse }
  | { ok: false; message: string };

function requestKey(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || headersList.get('x-real-ip') || 'unknown';
}

function validateShippingSelection(
  quoted: CheckoutFreightQuoteResponse,
  selection: CheckoutShippingSelection,
): CheckoutShippingSelection {
  const selections = selection.packageSelections.map((selected) => {
    const match = quoted.quotes.find(
      (quote) =>
        quote.packageId === selected.packageId &&
        quote.shippingTier === selected.shippingTier &&
        quote.optionId === selected.optionId &&
        quote.channelId === selected.channelId &&
        quote.amountMinor === selected.amountMinor &&
        quote.currency === selected.currency,
    );

    if (match === undefined) {
      throw new CheckoutValidationError(
        'Shipping changed. Refresh delivery options and choose again.',
      );
    }

    return {
      packageId: match.packageId,
      shippingTier: match.shippingTier,
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

  if (
    selections.length !== quoted.packages.length ||
    selectedPackages.size !== quoted.packages.length
  ) {
    throw new CheckoutValidationError(
      'Choose a delivery option for every package.',
    );
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

  // After the rate limit on purpose: a flood is refused before it can force
  // unbounded session verifications, and a signed-out caller is refused before
  // spending any CJ freight-quote budget.
  if (!(await getRevocationCheckedBuyerSession())) {
    return { ok: false, message: SIGNED_OUT_MESSAGE };
  }

  try {
    const quote = await requestCheckoutFreightQuotes(parsed.data);

    return { ok: true, quote };
  } catch (error) {
    const failure = classifyStorefrontFailure(error);

    logCheckoutFailure('shipping-quote', failure, error);

    if (failure.reason === 'unshippable') {
      return {
        ok: false,
        message: failure.safeMessage ?? UNSHIPPABLE_MESSAGE,
      };
    }

    return { ok: false, message: QUOTE_UNAVAILABLE_MESSAGE };
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

  // Kept, not discarded: `buyer.uid` is what makes the resulting order belong
  // to this account rather than to whichever contact address the buyer typed
  // into the form.
  const buyer = await getRevocationCheckedBuyerSession();

  if (!buyer) {
    return { ok: false, message: SIGNED_OUT_MESSAGE };
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
    const intent = await createPortalCheckoutIntent({
      cart: parsed.data.cart,
      address: parsed.data.address,
      shippingSelection,
      buyerUid: buyer.uid,
    });
    const session = await createStripeCheckoutSession({
      cart,
      address: parsed.data.address,
      shippingSelection,
      shippingQuotedAt: quoted.quotedAt,
      checkoutIntentId: intent.checkoutIntentId,
      buyerUid: buyer.uid,
    });

    return { ok: true, ...session };
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      // Already a buyer-facing sentence, and the buyer can act on it — a stale
      // quote or an unselected package, not a fault worth logging as one.
      return { ok: false, message: error.message };
    }

    if (error instanceof ProductsApiError) {
      const failure = classifyStorefrontFailure(error);

      logCheckoutFailure('checkout-session', failure, error);

      if (failure.reason === 'unshippable') {
        return {
          ok: false,
          message: failure.safeMessage ?? UNSHIPPABLE_MESSAGE,
        };
      }

      return {
        ok: false,
        message: 'Catalogue check failed. Try again in a moment.',
      };
    }

    logCheckoutFailure('checkout-session', { reason: 'payment' }, error);

    return {
      ok: false,
      message: 'Stripe checkout failed. Try again in a moment.',
    };
  }
}
