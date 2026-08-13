'use client';

import { useRouter } from 'next/navigation';
import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import type { CartLineVariant } from '@/lib/cart';
import { useCart } from '@/components/cart/CartProvider';
import { trackKlaviyoBuyNowClicked } from '@/lib/klaviyo/client';

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
  disabledReason,
}: ProductAddToCartButtonsProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const disabled = disabledReason !== undefined;

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

    addItem(line());
  }

  function handleBuyNow() {
    if (disabled) return;

    trackKlaviyoBuyNowClicked({
      productId,
      title,
      category,
      imageUrl,
      unitPrice,
    });
    addItem(line());
    router.push('/cart');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={disabled}
          aria-disabled={disabled}
          className="min-h-11 flex-1 cursor-pointer rounded-lg border border-brand-600 px-6 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border-strong disabled:text-ink-faint disabled:hover:bg-transparent disabled:active:scale-100"
        >
          Add to Cart
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={disabled}
          aria-disabled={disabled}
          className="bg-brand-gradient min-h-11 flex-1 cursor-pointer rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-none disabled:bg-surface-sunken disabled:text-ink-faint disabled:hover:opacity-100 disabled:active:scale-100"
        >
          Buy Now
        </button>
      </div>
      {/*
        Always in the DOM so the reason is announced when it appears, rather
        than the live region itself being inserted at the same moment.
      */}
      <p aria-live="polite" className="min-h-0 text-sm text-ink-muted">
        {disabledReason ?? ''}
      </p>
    </div>
  );
}
