'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { useCart } from '@/components/cart/CartProvider';
import CartLineItemRow from '@/components/cart/CartLineItemRow';

export default function CartPageClient() {
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <h1 className="mb-1.5 text-xl font-bold">Your cart is empty</h1>
        <p className="mb-4 text-sm text-ink-muted">
          Nothing is reserved and nothing is charged. Go find something you
          like.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:no-underline hover:opacity-90 active:scale-[0.98]"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3.5 text-xl font-bold">
        Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_336px]">
        <div className="rounded-xl border border-border bg-white">
          {items.map((line) => (
            <CartLineItemRow
              key={line.productId}
              line={line}
              onDecrease={() => setQuantity(line.productId, line.quantity - 1)}
              onIncrease={() => setQuantity(line.productId, line.quantity + 1)}
              onRemove={() => removeItem(line.productId)}
            />
          ))}
        </div>
        <div className="h-fit rounded-xl border border-border bg-white p-4">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Items</span>
            <span>{itemCount}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2.5 font-display text-xl font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="bg-brand-gradient mt-3.5 min-h-11 w-full cursor-not-allowed rounded-lg text-sm font-bold text-white opacity-50"
          >
            Proceed to Checkout
          </button>
          <p className="mt-2 text-xs text-ink-faint">
            Checkout is not built yet. This button does not work.
          </p>
        </div>
      </div>
    </div>
  );
}
