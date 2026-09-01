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
import FreeShippingNotice from '@/components/shipping/FreeShippingNotice';

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
  /**
   * The free-shipping threshold for the buyer's likely destination, and the
   * name to show it under — resolved on the server from
   * `fetchFreeShippingThresholds()` against the same `resolveDestination()`
   * guess the FX figures above use. Absent for the same reasons a rate can be
   * absent: Global, an unmeasured country, or the Portal read failed.
   */
  freeShippingThresholdAmountMinor?: number;
  freeShippingDestinationLabel?: string;
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
 * The local figure is display text and stops here. `selectedSubtotal` — not
 * the whole cart's — is what reaches checkout, unchanged and in USD: a line
 * left unchecked here is a line `/checkout` never sees or charges for.
 */
export default function CartPageClient({
  indicativeRate,
  fxBufferPercent,
  freeShippingThresholdAmountMinor,
  freeShippingDestinationLabel,
}: CartPageClientProps) {
  const {
    items,
    itemCount,
    selectedItems,
    selectedItemCount,
    selectedSubtotal,
    isLineSelected,
    setLineSelected,
    selectAll,
    selectNone,
    setQuantity,
    removeItem,
  } = useCart();
  const allSelected = selectedItems.length === items.length;
  const noneSelected = selectedItems.length === 0;
  const someSelected = !allSelected && !noneSelected;
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
          {/*
            The master checkbox toggles the same per-line state each row
            reads — there is no separate "all" flag to keep in sync, so this
            can never disagree with the rows under it. Indeterminate is set
            imperatively because it is DOM-only state with no JSX/React prop.
          */}
          <label
            htmlFor="cart-select-all"
            className="flex cursor-pointer items-center gap-2.5 border-b border-border p-3.5"
          >
            <input
              id="cart-select-all"
              type="checkbox"
              checked={allSelected}
              ref={(node) => {
                if (node) {
                  // eslint-disable-next-line no-param-reassign -- `indeterminate` has no JSX/React prop; a ref callback mutating the DOM node is the only way to set it.
                  node.indeterminate = someSelected;
                }
              }}
              onChange={(event) => {
                if (event.target.checked) {
                  selectAll();
                } else {
                  selectNone();
                }
              }}
              aria-label={
                allSelected ? 'Deselect all items' : 'Select all items'
              }
              className="h-4 w-4 cursor-pointer accent-brand-600"
            />
            <span className="text-sm font-semibold text-ink">
              Select all ({items.length})
            </span>
          </label>
          {items.map((line) => {
            // The composite line id, not the product id: two variants of one
            // product are two rows, and a product-keyed handler would change
            // the quantity of whichever row sorted first.
            const id = lineIdOf(line);

            return (
              <CartLineItemRow
                key={id}
                line={line}
                selected={isLineSelected(id)}
                onToggleSelected={(selected) => {
                  setLineSelected(id, selected);
                }}
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
          {/*
            Every figure below this point is about the checkout "Proceed"
            leads to, so every one of them is scoped to the SELECTED lines,
            not the whole cart — the heading above stays the total, because
            that answers a different question ("what's in my cart") than
            this panel does ("what am I about to pay for").
          */}
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Items</span>
            <span>{selectedItemCount}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2.5 font-display text-xl font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(selectedSubtotal)}</span>
          </div>
          <IndicativePriceLine
            price={selectedSubtotal}
            rate={indicativeRate}
            bufferPercent={fxBufferPercent}
            className="mt-1.5 text-right"
          />
          {/*
            Same signal the FX figure above already runs on:
            `resolveDestination()`'s geo-IP guess, narrowed to a checkout
            country by `destinationToCheckoutCountry`. When neither exists —
            Global, an unmeasured country, or the Portal read failed —
            `FreeShippingNotice` falls back to its amount-free copy. Same
            component and treatment as the PDP, so the offer is one
            recognisable thing rather than a different-looking mention each
            time.

            Left reading the whole cart's subtotal rather than the selected
            one: it is advisory copy ("Estimated... confirmed at checkout"),
            shares this component with the PDP buy rail where "selection"
            has no meaning at all, and nothing here charges anyone.
          */}
          <FreeShippingNotice
            className="mt-3"
            thresholdAmountMinor={freeShippingThresholdAmountMinor}
            destinationLabel={freeShippingDestinationLabel}
          />
          {noneSelected ? (
            <button
              type="button"
              disabled
              className="mt-3.5 flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg bg-surface-sunken-strong text-sm font-bold text-ink-faint"
            >
              Select an item to check out
            </button>
          ) : (
            <Link
              href="/checkout"
              className="bg-brand-gradient mt-3.5 flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-white transition-all duration-200 hover:no-underline hover:opacity-90 active:scale-[0.98]"
            >
              Proceed to Checkout
            </Link>
          )}
          <p className="mt-2 text-xs text-ink-faint">
            Payment opens in Stripe. Cards and eligible bank debit are
            supported.
          </p>
        </div>
      </div>
    </div>
  );
}
