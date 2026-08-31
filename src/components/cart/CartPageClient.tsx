'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { lineIdOf } from '@/lib/cart';
import { useCart } from '@/components/cart/CartProvider';
import useCartReprice from '@/components/checkout/useCartReprice';
import CheckoutPriceChangeNotice from '@/components/checkout/CheckoutPriceChangeNotice';
import CartLineItemRow from '@/components/cart/CartLineItemRow';
import {
  trackKlaviyoCartItemRemoved,
  trackKlaviyoCartQuantityChanged,
  trackKlaviyoCartViewed,
} from '@/lib/klaviyo/client';
import IndicativePriceLine from '@/components/fx/IndicativePriceLine';
import type { IndicativeRate } from '@/lib/fx/rates';

type CartPageClientProps = {
  /**
   * The indicative FX rate for the buyer's destination, resolved on the server
   * by the cart page.
   * `null` means no usable rate, and then no local figure renders at all.
   */
  indicativeRate: IndicativeRate | null;
  /**
   * The Market Rules funding buffer, resolved on the server beside the rate.
   * `null` means no local figure renders, same as a missing rate.
   */
  fxBufferPercent: number | null;
};

/**
 * "Continue shopping" goes to `/`, and `Proceed to Checkout` to `/checkout`.
 * Neither carries a country: checkout belongs to a person, and there is one
 * storefront to continue shopping in.
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
  indicativeRate,
  fxBufferPercent,
}: CartPageClientProps) {
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();
  /*
    The cart froze the price each line was added at, and showed it back
    indefinitely. That is right while someone is browsing — nothing should move
    under them — and wrong the moment they are looking at a total they intend to
    act on, because the Portal is the price authority and it may have moved on.

    Same one-shot read the checkout uses, and the same notice, so a shopper who
    left a tab open for a week is told here rather than two steps into checkout.
  */
  const { changes: priceChanges } = useCartReprice(items);

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
      <CheckoutPriceChangeNotice changes={priceChanges} />
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
            bufferPercent={fxBufferPercent}
            className="mt-1.5 text-right"
          />
          {/*
            Generic on purpose, same reasoning as the evidence ledger's
            Delivery row: this page does not know the buyer's destination
            (see this file's own note above), and `resolveDestination()`'s
            geo-IP guess is documented as "only a suggestion" -- fine for an
            approximate FX figure, not sound enough to anchor a specific
            dollar threshold claim on. No amount, no country; the real
            number is confirmed once an address exists, at checkout.
          */}
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
            <span
              aria-hidden="true"
              className="mt-1 size-[7px] shrink-0 rounded-full bg-teal-500"
            />
            Some destinations get free Standard delivery on qualifying orders
            &mdash; confirmed once you enter your address at checkout.
          </p>
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
