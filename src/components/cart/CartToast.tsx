'use client';

import SuccessToast from '@/components/ui/SuccessToast';
import type { CartToastMessage } from '@/lib/cart';

type CartToastProps = {
  toast: CartToastMessage | null;
  onDismiss: () => void;
};

/**
 * The cart's "Added to your cart." toast.
 *
 * The look, the four-second timer and the polite live region moved to
 * `SuccessToast` when the review flow needed the same toast on the orders page.
 * What stays here is the cart's own contract: a nullable message, so
 * `CartProvider` can hold `null` between adds without branching at the call
 * site, and the remount-per-message it already does with `key={toast?.id}`.
 */
export default function CartToast({ toast, onDismiss }: CartToastProps) {
  if (!toast) {
    return null;
  }

  return <SuccessToast text={toast.text} onDismiss={onDismiss} />;
}
