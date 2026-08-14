'use client';

import { useRouter } from 'next/navigation';
import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import type { CartLineVariant } from '@/lib/cart';
import { useCart } from '@/components/cart/CartProvider';
import Button from '@/components/ui/Button';
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
        <Button
          variant="outline"
          onClick={() => handleAddToCart()}
          disabled={disabled}
        >
          Add to Cart
        </Button>
        <Button
          variant="solid"
          onClick={() => handleBuyNow()}
          disabled={disabled}
        >
          Buy Now
        </Button>
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
