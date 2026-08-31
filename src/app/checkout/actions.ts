'use server';

import { headers } from 'next/headers';
import {
  CreateCheckoutSessionInputSchema,
  type CreateCheckoutSessionInput,
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
import repriceCheckoutCart from '@/services/checkout/reprice';
import type { RepricedLine } from '@/lib/checkout/price-change';
import type { Money } from '@/lib/money';
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
  /**
   * A price moved between the summary the buyer read and this call. No Stripe
   * session is created: the buyer is shown what changed and presses pay again,
   * which is the difference between a corrected price and a silent one.
   */
  | { ok: false; message: string; priceChanged: RepricedLine[] }
  | { ok: false; message: string; priceChanged?: undefined };
export type QuoteCheckoutShippingResult =
  | { ok: true; quote: CheckoutFreightQuoteResponse }
  | { ok: false; message: string };

function requestKey(headersList: Headers): string {
  const forwarded = headersList.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || headersList.get('x-real-ip') || 'unknown';
}

export type RepriceCartResult =
  | { ok: true; lines: RepricedLine[]; changed: RepricedLine[] }
  | { ok: false; message: string };

/**
 * Today's price for every line in the cart, before the buyer is shown a total.
 *
 * The checkout summary used to render the price each line was *added* at, while
 * Stripe was handed the price read back from the Portal at pay time. When those
 * differed the buyer saw one total through Information and Delivery and was
 * charged another on the card form, with nothing saying so.
 *
 * No session check, unlike the two actions below. This spends no money and no
 * supplier quota, it reads only prices already public on every product page,
 * and requiring a session would mean a signed-out buyer browsing to checkout
 * still gets shown stale figures — the exact defect. Rate limited all the same,
 * because it fans out one Portal read per line.
 */
export async function repriceCartAction(input: {
  cart: { items: CheckoutCartLineInput[] };
  carriedPrices?: (Money | undefined)[];
}): Promise<RepriceCartResult> {
  const parsed = CreateCheckoutSessionInputSchema.pick({
    cart: true,
  }).safeParse({ cart: input.cart });

  if (!parsed.success) {
    return { ok: false, message: 'Check your cart, then try again.' };
  }

  const headersList = await headers();
  const allowed = checkRateLimit({
    key: `checkout-reprice:${requestKey(headersList)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!allowed) {
    return { ok: false, message: 'Too many attempts. Wait a minute.' };
  }

  try {
    const repriced = await repriceCheckoutCart(
      parsed.data.cart.items,
      input.carriedPrices ?? [],
    );

    return { ok: true, lines: repriced.lines, changed: repriced.changed };
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return { ok: false, message: error.message };
    }

    logCheckoutFailure('reprice', classifyStorefrontFailure(error), error);

    return {
      ok: false,
      message: 'We could not confirm prices just now. Try again.',
    };
  }
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
    /*
      Deliberately sequential, and it must stay that way.

      Overlapping this with the portal's own freight re-quote (inside
      `createPortalCheckoutIntent`, below) looks free — that call takes
      `parsed.data.cart`, not the validated one — but the price check below
      returns before paying, and a quote started in parallel would already have
      spent CJ freight quota on a checkout that is not going to complete. CJ
      points are a constrained shared budget by owner decision (ADR-013), and
      the case is guarded by a test that says so.

      It is also a poor trade even ignoring the budget: this is one Portal round
      trip and the quote behind it is several live CJ requests deep, so running
      them together saves the shorter of the two and the button still waits on
      the longer. The cost of the sequence is bounded; the cost of the quote is
      not.
    */
    const cart = await validateCheckoutCart(parsed.data.cart.items);
    /*
      The last gate before money moves.

      `useCartReprice` corrects the summary when checkout opens, but a buyer
      spends minutes on the address form and a seller can reprice inside that
      window. Without this the old defect simply moved: the summary would be
      right on arrival and wrong at the card form. Comparing here means the
      charge can never be a figure the buyer was not shown — it either matches
      what they read, or they are told and asked again.

      Compared against `unitPriceMinor`, which is what the client displayed;
      `cart` is still what gets charged, so a tampered value can only ever cause
      an extra confirmation, never a wrong price.
    */
    const moved = cart.lines
      .map((line, index) => {
        const shown = parsed.data.cart.items[index]?.unitPriceMinor;

        if (shown === undefined || shown === line.unitPrice.amountMinor) {
          return null;
        }

        return {
          productId: line.productId,
          ...(line.variantId === undefined
            ? {}
            : { variantId: line.variantId }),
          unitPrice: line.unitPrice,
          previousUnitPrice: {
            amountMinor: shown,
            currency: line.unitPrice.currency,
          },
          title: line.title,
        };
      })
      .filter((line) => line !== null);

    if (moved.length > 0) {
      return {
        ok: false,
        message:
          'A price changed while you were checking out. The total below is updated — press pay again to continue.',
        priceChanged: moved,
      };
    }

    /*
      No freight re-quote here. `createPortalCheckoutIntent` (below) already
      re-quotes freight live and validates this exact selection against it —
      that is `createCheckoutIntent`'s own `quoteCheckoutFreight` +
      `validateSelection` on the portal side, and it is the authoritative
      check: its result is what gets persisted for the order this intent
      becomes. Quoting again here first was a second full live CJ freight
      computation on every Pay press for a check the portal was about to
      repeat anyway — the duplicate `sals3-portal` was measured making on the
      one button that most needed to be fast.

      A stale or mismatched selection still produces the exact same buyer
      sentence it always did: the portal throws `CheckoutOrderError` for it,
      `createPortalCheckoutIntent` surfaces that as a `ProductsApiError` with
      `safeMessage` set to the portal's own text, and the catch block below
      already knows how to show a 422's `safeMessage` — nothing about that
      path changed, only where the check itself runs.
    */
    const { shippingSelection } = parsed.data;
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
      shippingQuotedAt: intent.shippingQuotedAt,
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
