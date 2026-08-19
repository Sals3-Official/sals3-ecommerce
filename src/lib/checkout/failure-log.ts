import 'server-only';

import { ProductsApiError } from '@/services/storefront/client';

/**
 * Why a checkout step failed, and whether retrying could possibly help.
 *
 * This exists because a real failure was undiagnosable. A buyer reported
 * "Delivery options are unavailable. Try again in a moment." and the Vercel
 * logs for that minute held two lines — `λ POST /checkout`, `λ POST /checkout`
 * — and nothing else: the quote path had no logging at all, and both branches
 * of the catch returned the same sentence, so an item that genuinely cannot
 * ship was indistinguishable from a broken upstream.
 *
 * `unshippable` is the distinction that matters most. The portal raises it when
 * no offer for a cart item satisfies its dropship conditions, which is a fact
 * about the catalogue, not a hiccup — telling that buyer to "try again in a
 * moment" sends them into a loop that spends rate-limit budget and can never
 * succeed.
 */
export type CheckoutFailureReason =
  'unshippable' | 'upstream' | 'validation' | 'payment';

export type CheckoutFailure = {
  reason: CheckoutFailureReason;
  /** HTTP status from the portal, when the failure came from it. */
  status?: number;
  /** The portal's own buyer-safe sentence, when it sent one. */
  safeMessage?: string;
};

export function classifyStorefrontFailure(error: unknown): CheckoutFailure {
  if (!(error instanceof ProductsApiError)) {
    return { reason: 'upstream' };
  }

  if (error.status === 422) {
    return {
      reason: 'unshippable',
      status: 422,
      ...(error.safeMessage === undefined
        ? {}
        : { safeMessage: error.safeMessage }),
    };
  }

  return {
    reason: 'upstream',
    ...(error.status === undefined ? {} : { status: error.status }),
  };
}

/**
 * One structured line per failed checkout step.
 *
 * Deliberately free of the address, the email, the phone, and the cart: rule 35
 * forbids logging personal data, and none of it is needed to answer the
 * question this log exists for — which step failed, against which upstream, and
 * with what status. The error's own message is included because this app writes
 * every one of them (`Storefront <subject> request failed.`); nothing here
 * echoes an upstream body.
 */
export function logCheckoutFailure(
  step: 'shipping-quote' | 'checkout-session',
  failure: CheckoutFailure,
  error: unknown,
): void {
  // eslint-disable-next-line no-console
  console.error('[checkout] step failed', {
    step,
    reason: failure.reason,
    ...(failure.status === undefined ? {} : { status: failure.status }),
    error:
      error instanceof Error ? `${error.name}: ${error.message}` : 'unknown',
  });
}
