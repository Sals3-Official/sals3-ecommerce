'use client';

import { useRouter } from 'next/navigation';
import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import { useCart } from '@/components/cart/CartProvider';

type ProductAddToCartButtonsProps = {
  productId: string;
  title: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  unitPrice: Money;
  inStock: boolean;
};

export default function ProductAddToCartButtons({
  productId,
  title,
  imageUrl,
  imageAlt,
  tone,
  unitPrice,
  inStock,
}: ProductAddToCartButtonsProps) {
  const { addItem } = useCart();
  const router = useRouter();

  function handleAddToCart() {
    addItem({ productId, title, imageUrl, imageAlt, tone, unitPrice });
  }

  function handleBuyNow() {
    addItem({ productId, title, imageUrl, imageAlt, tone, unitPrice });
    router.push('/cart');
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!inStock}
        className="min-h-11 flex-1 cursor-pointer rounded-lg border border-brand-600 px-6 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:active:scale-100"
      >
        Add to Cart
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={!inStock}
        className="bg-brand-gradient min-h-11 flex-1 cursor-pointer rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50 disabled:active:scale-100"
      >
        Buy Now
      </button>
    </div>
  );
}
