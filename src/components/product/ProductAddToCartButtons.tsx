'use client';

import { useRouter } from 'next/navigation';
import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
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
};

export default function ProductAddToCartButtons({
  productId,
  title,
  category,
  imageUrl,
  imageAlt,
  tone,
  unitPrice,
}: ProductAddToCartButtonsProps) {
  const { addItem } = useCart();
  const router = useRouter();

  function handleAddToCart() {
    addItem({
      productId,
      title,
      category,
      imageUrl,
      imageAlt,
      tone,
      unitPrice,
    });
  }

  function handleBuyNow() {
    trackKlaviyoBuyNowClicked({
      productId,
      title,
      category,
      imageUrl,
      unitPrice,
    });
    addItem({
      productId,
      title,
      category,
      imageUrl,
      imageAlt,
      tone,
      unitPrice,
    });
    router.push('/cart');
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleAddToCart}
        className="min-h-11 flex-1 cursor-pointer rounded-lg border border-brand-600 px-6 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 active:scale-[0.98]"
      >
        Add to Cart
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        className="bg-brand-gradient min-h-11 flex-1 cursor-pointer rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
      >
        Buy Now
      </button>
    </div>
  );
}
