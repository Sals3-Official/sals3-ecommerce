import Image from 'next/image';
import { formatMoney } from '@/lib/money';
import { getCartLineTotal, type CartLineItem } from '@/lib/cart';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type CheckoutOrderSummaryProps = {
  items: CartLineItem[];
  itemCount: number;
};

export default function CheckoutOrderSummary({
  items,
  itemCount,
}: CheckoutOrderSummaryProps) {
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
    </section>
  );
}
