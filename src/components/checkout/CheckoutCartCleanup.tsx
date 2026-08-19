'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import {
  CLEARED_CHECKOUTS_STORAGE_KEY,
  hasClearedCheckout,
  rememberClearedCheckout,
} from '@/lib/cart';

type CheckoutCartCleanupProps = {
  /** The Stripe session this receipt belongs to. */
  sessionId: string;
};

/**
 * Empties the cart once a checkout is paid.
 *
 * Renders nothing. It exists because the cart lives in `localStorage` behind a
 * client provider while the receipt is a Server Component, so the one thing
 * that has to happen in the browser is isolated here rather than turning the
 * whole page into a client component.
 *
 * Two rules, both load-bearing:
 *
 * 1. **Only where a receipt is shown.** The page also renders "Checkout not
 *    completed" and "Checkout not verified"; clearing there would destroy the
 *    cart of a buyer who needs to retry a declined payment. The parent decides
 *    by rendering this component only alongside a receipt.
 * 2. **Once per checkout.** A receipt is a page buyers return to — Back after
 *    shopping on, a link out of history, a second tab. Clearing on every render
 *    would wipe a cart filled *after* the purchase, which looks exactly like
 *    the app losing data. The Stripe session id is recorded on first clear and
 *    checked on every later visit.
 */
export default function CheckoutCartCleanup({
  sessionId,
}: CheckoutCartCleanupProps) {
  const { clear } = useCart();

  useEffect(() => {
    if (sessionId === '') {
      return;
    }

    const stored = window.localStorage.getItem(CLEARED_CHECKOUTS_STORAGE_KEY);

    if (hasClearedCheckout(stored, sessionId)) {
      return;
    }

    // Recorded first: if the write below were to fail, a second visit must not
    // read a stale "not yet cleared" and empty a cart the buyer refilled.
    window.localStorage.setItem(
      CLEARED_CHECKOUTS_STORAGE_KEY,
      rememberClearedCheckout(stored, sessionId),
    );
    clear();
  }, [clear, sessionId]);

  return null;
}
