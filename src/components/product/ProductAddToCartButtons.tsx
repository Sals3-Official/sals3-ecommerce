'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import { cartLineId, type CartLineVariant } from '@/lib/cart';
import { useCart } from '@/components/cart/CartProvider';
import Button from '@/components/ui/Button';
import { CheckIcon } from '@/components/icons/Icon';
import { trackKlaviyoBuyNowClicked } from '@/lib/klaviyo/client';

/**
 * How long the button stays confirmed before it offers itself again. Long enough
 * to be read, short enough that a buyer who wants a second unit is one press
 * away rather than waiting out a state they have to clear.
 */
const CONFIRMED_MS = 1100;

type ProductAddToCartButtonsProps = {
  productId: string;
  title: string;
  category: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  unitPrice: Money;
  /** Absent for a product with no option axes — one implicit variant. */
  variant?: CartLineVariant;
  /** How many to add. Owned by the panel, beside the option selection. */
  quantity: number;
  /**
   * Why purchase is blocked, in words a buyer can act on. Present means both
   * buttons are disabled and this sentence is announced — never a silently grey
   * button, and never colour as the only signal.
   */
  disabledReason?: string;
};

export default function ProductAddToCartButtons({
  productId,
  title,
  category,
  imageUrl,
  imageAlt,
  tone,
  unitPrice,
  variant,
  quantity,
  disabledReason,
}: ProductAddToCartButtonsProps) {
  const { addItem, selectOnly } = useCart();
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  /**
   * The press has an answer before the toast arrives.
   *
   * `pressed` is separate from `confirmed` and outlives it: it is what keeps the
   * label from animating back in on first paint, when nothing has been pressed
   * and there is nothing to animate back from.
   */
  const [confirmed, setConfirmed] = useState(false);
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const disabled = disabledReason !== undefined;

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  function line() {
    return {
      productId,
      ...(variant === undefined ? {} : { variant }),
      title,
      category,
      imageUrl,
      imageAlt,
      tone,
      unitPrice,
    };
  }

  function handleAddToCart() {
    if (disabled) return;

    addItem(line(), quantity);

    /*
      Restarted rather than ignored on a second press: the buyer added again, so
      the confirmation is about that press, not the one before it.
    */
    if (timer.current !== undefined) clearTimeout(timer.current);
    setPressed(true);
    setConfirmed(true);
    timer.current = setTimeout(() => setConfirmed(false), CONFIRMED_MS);
  }

  function handleBuyNow() {
    if (disabled || isNavigating) return;

    trackKlaviyoBuyNowClicked({
      productId,
      title,
      category,
      imageUrl,
      unitPrice,
    });
    addItem(line(), quantity);
    /*
     * "Buy Now" means this item, not whatever else the cart already held.
     * Landing on a cart where three earlier saves are silently included in
     * the total would turn one buyer decision into a bill for several. The
     * rest of the cart is untouched — only *selection* narrows, so nothing is
     * removed and the buyer can still check everything back on if they meant
     * to buy it all together.
     */
    selectOnly(cartLineId(productId, variant?.id));
    /*
     * The push is wrapped so the button can show it is working. Navigating to
     * the cart is not instant — the route is server-rendered — and without this
     * the buyer gets an unchanged page after a click that did do something.
     */
    startNavigation(() => {
      router.push('/cart');
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        {/*
          The confirmation is a skin change on the same control, so it keeps its
          size and position under the finger that pressed it. It is not
          announced here: `SuccessToast` already says "Added to your cart." in a
          polite live region, and two announcements for one action is worse than
          none.
        */}
        <Button
          variant={confirmed ? 'confirm' : 'outline'}
          onClick={() => handleAddToCart()}
          disabled={disabled}
        >
          {confirmed ? (
            <span className="animate-s3-confirm-in inline-flex items-center gap-2">
              <CheckIcon />
              Added
            </span>
          ) : (
            <span
              className={
                pressed ? 'animate-s3-label-back inline-block' : 'inline-block'
              }
            >
              Add to Cart
            </span>
          )}
        </Button>
        <Button
          variant="solid"
          onClick={() => handleBuyNow()}
          disabled={disabled}
          isPending={isNavigating}
        >
          Buy Now
        </Button>
      </div>
      {/*
        Always in the DOM so the reason is announced when it appears, rather
        than the live region itself being inserted at the same moment. The
        reserved line height keeps the panel from shrinking when a buyer's first
        choice clears the sentence — which now happens on every product with
        options, not almost never.
      */}
      <p
        aria-live="polite"
        className="min-h-5 text-sm leading-5 text-ink-muted"
      >
        {disabledReason ?? ''}
      </p>
    </div>
  );
}
