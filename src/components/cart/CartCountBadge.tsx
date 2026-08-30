'use client';

import { useCart } from '@/components/cart/CartProvider';

/**
 * The cart count, and the second half of the Add to Cart confirmation.
 *
 * The button says the press landed; this says where it landed. It is the beat
 * that carries the gesture, because it is the thing the buyer has to look at
 * next and the only part of the page that changes outside the buy rail.
 *
 * ## Why it animates on `lastAddedAt` and not on the count
 *
 * The count also changes when `CartProvider` hydrates from `localStorage` after
 * mount, so a badge watching `itemCount` would animate on every page load with a
 * non-empty cart — decoration that claims something happened. `lastAddedAt` is
 * set only by `addItem`, so this fires exactly when a buyer adds something.
 *
 * ## Why there is no state and no timer here
 *
 * The animation ends itself, so nothing has to switch it off. Keying the pill on
 * `lastAddedAt` remounts it when an add happens, the CSS animation runs once on
 * that mount, and `both` leaves it at its final frame. An effect that set a flag
 * and cleared it on a timer would do the same thing with a render, a timeout and
 * a cleanup — and calling `setState` inside an effect to react to a prop is the
 * cascading-render pattern the lint rule exists to catch, not an exception to it.
 *
 * Motion is CSS in `globals.css`, which puts it under the site-wide
 * `prefers-reduced-motion` rule: for a reader who asked for less, the count
 * still updates, it just stops moving.
 */
export default function CartCountBadge() {
  const { itemCount, lastAddedAt } = useCart();

  if (itemCount === 0) {
    return null;
  }

  const added = lastAddedAt !== undefined;

  return (
    <span
      key={lastAddedAt ?? 'restored'}
      className={`inline-block rounded-full bg-[var(--header-badge-bg)] px-1.5 py-0.5 text-xs font-bold text-[color:var(--header-badge-fg)] tabular-nums ${
        added ? 'animate-s3-count-bump' : ''
      }`}
    >
      <span
        className={added ? 'animate-s3-count-in inline-block' : 'inline-block'}
      >
        {itemCount > 99 ? '99+' : itemCount}
      </span>
    </span>
  );
}
