import Image from 'next/image';
import { formatMoney, money } from '@/lib/money';
import { getCartLineTotal, type CartLineItem } from '@/lib/cart';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';
import type { SelectedShippingQuote } from './CheckoutShippingOptions';

type CheckoutOrderSummaryProps = {
  items: CartLineItem[];
  itemCount: number;
  shipping: SelectedShippingQuote[];
};

export default function CheckoutOrderSummary({
  items,
  itemCount,
  shipping,
}: CheckoutOrderSummaryProps) {
  const shippingTotal = shipping.reduce(
    (total, selected) => total + selected.amountMinor,
    0,
  );
  const currency =
    items[0]?.unitPrice.currency ?? shipping[0]?.currency ?? 'USD';
  const merchandiseTotal = items.reduce(
    (total, line) => total + getCartLineTotal(line).amountMinor,
    0,
  );

  return (
    <section
      aria-labelledby="checkout-summary-heading"
      className="h-fit rounded-xl border border-border bg-white p-4"
    >
      <h2
        id="checkout-summary-heading"
        className="font-display text-xl font-semibold"
      >
        Order summary
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart.
      </p>
      <div className="mt-4 divide-y divide-border">
        {items.map((line) => (
          <div
            key={`${line.productId}:${line.variant?.id ?? 'base'}`}
            className="py-3"
          >
            <div className="flex gap-3">
              <div className="relative aspect-square w-16 flex-none overflow-hidden rounded-lg bg-white">
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.imageAlt}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                ) : (
                  <ProductImagePlaceholder tone={line.tone} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{line.title}</p>
                {line.variant?.optionSummary === undefined ? null : (
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {line.variant.optionSummary}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-muted">
                  Qty {line.quantity}
                </p>
              </div>
              <p className="font-display text-base font-semibold text-ink">
                {formatMoney(getCartLineTotal(line))}
              </p>
            </div>
          </div>
        ))}
      </div>
      <dl className="mt-4 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Shipping</dt>
          <dd className="font-semibold text-ink">
            {shippingTotal === 0
              ? 'Select delivery'
              : formatMoney(money(shippingTotal, currency))}
          </dd>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="font-display text-lg font-semibold text-ink">
            {formatMoney(money(merchandiseTotal + shippingTotal, currency))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
