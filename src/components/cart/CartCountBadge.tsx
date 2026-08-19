'use client';

import { useCart } from '@/components/cart/CartProvider';

export default function CartCountBadge() {
  const { itemCount } = useCart();

  if (itemCount === 0) {
    return null;
  }

  return (
    <span className="rounded-full bg-[var(--header-badge-bg)] px-1.5 py-0.5 text-xs font-bold text-[color:var(--header-badge-fg)]">
      {itemCount > 99 ? '99+' : itemCount}
    </span>
  );
}
