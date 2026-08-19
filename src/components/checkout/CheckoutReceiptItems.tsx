import Image from 'next/image';
import type { ReceiptItem } from '@/services/checkout/receipt';

type CheckoutReceiptItemsProps = {
  items: ReceiptItem[];
};

/**
 * What was actually bought, as recorded by Stripe at payment time.
 *
 * A Server Component with no interactivity on purpose: this is a record, not a
 * cart. Nothing here is editable, and the quantities and totals are the ones
 * that were charged — never the browser's cart, which by this point may already
 * have been cleared or changed in another tab.
 */
export default function CheckoutReceiptItems({
  items,
}: CheckoutReceiptItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="receipt-items-heading"
      className="mt-5 rounded-lg border border-border"
    >
      <h2
        id="receipt-items-heading"
        className="border-b border-border px-4 py-3 text-xs font-semibold tracking-wide text-ink-muted uppercase"
      >
        {items.length === 1 ? '1 item' : `${items.length} items`}
      </h2>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3.5 p-3.5">
            <div className="relative aspect-square w-16 flex-none overflow-hidden rounded-lg bg-surface-sunken">
              {item.imageUrl === undefined ? null : (
                <Image
                  src={item.imageUrl}
                  /*
                   * The title is the only description Stripe stored, and a
                   * decorative `alt=""` would leave a screen-reader user with a
                   * quantity and a price attached to nothing.
                   */
                  alt={item.title}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-pretty text-ink">{item.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold whitespace-nowrap text-ink">
                {item.lineTotal}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
