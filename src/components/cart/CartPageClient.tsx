'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { lineIdOf } from '@/lib/cart';
import { useCart } from '@/components/cart/CartProvider';
import CartLineItemRow from '@/components/cart/CartLineItemRow';
import {
  trackKlaviyoCartItemRemoved,
  trackKlaviyoCartQuantityChanged,
  trackKlaviyoCartViewed,
} from '@/lib/klaviyo/client';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';
import IndicativePriceLine from '@/components/fx/IndicativePriceLine';
import type { IndicativeRate } from '@/lib/fx/rates';

type CartPageClientProps = {
  market: MarketSegment;
  /**
   * The market's indicative FX rate, resolved on the server by the cart page.
   * `null` means no usable rate, and then no local figure renders at all.
   */
  indicativeRate: IndicativeRate | null;
};

/**
 * `market` scopes "Continue shopping" back into the shopfront the buyer came
 * from. `Proceed to Checkout` deliberately stays a bare `/checkout`: checkout
 * belongs to a person, not to a country.
 *
 * The subtotal is the only figure here that gets an approximate local twin. Not
 * the line rows: one conversion per page, beside the number the buyer is
 * weighing, is the whole point — a column of approximate line prices multiplies
 * the chance of one being read as the charge for no gain, and the subtotal is
 * what `Proceed to Checkout` is actually about.
 *
 * The local figure is display text and stops here. `subtotal` is what reaches
 * checkout, unchanged and in USD.
 */
export default function CartPageClient({
  market,
  indicativeRate,
}: CartPageClientProps) {
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();

  useEffect(() => {
    if (items.length > 0) {
      trackKlaviyoCartViewed(items);
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <h1 className="mb-1.5 text-xl font-bold">Your cart is empty</h1>
        <p className="mb-4 text-sm text-ink-muted">
          Nothing is reserved and nothing is charged. Go find something you
          like.
        </p>
        <Link
          href={marketHref(market, '/')}
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
          {items.map((line) => {
            // The composite line id, not the product id: two variants of one
            // product are two rows, and a product-keyed handler would change
            // the quantity of whichever row sorted first.
            const id = lineIdOf(line);

            return (
              <CartLineItemRow
                key={id}
                line={line}
                onDecrease={() => {
                  trackKlaviyoCartQuantityChanged(line, line.quantity - 1);
                  setQuantity(id, line.quantity - 1);
                }}
                onIncrease={() => {
                  trackKlaviyoCartQuantityChanged(line, line.quantity + 1);
                  setQuantity(id, line.quantity + 1);
                }}
                onRemove={() => {
                  trackKlaviyoCartItemRemoved(line);
                  removeItem(id);
                }}
              />
            );
          })}
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
          <IndicativePriceLine
            price={subtotal}
            rate={indicativeRate}
            className="mt-1.5 text-right"
          />
          <Link
            href="/checkout"
            className="bg-brand-gradient mt-3.5 flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-white transition-all duration-200 hover:no-underline hover:opacity-90 active:scale-[0.98]"
          >
            Proceed to Checkout
          </Link>
          <p className="mt-2 text-xs text-ink-faint">
            Payment opens in Stripe. Cards and eligible bank debit are
            supported.
          </p>
        </div>
      </div>
    </div>
  );
}
