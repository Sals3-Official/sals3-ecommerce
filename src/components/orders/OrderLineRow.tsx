import Image from 'next/image';
import type { BuyerOrderLine } from '@/lib/orders/contracts';

/**
 * One ordered item, as it was accepted.
 *
 * ## The two column counts
 *
 * The ledger card puts unit price and quantity in their own columns so a buyer
 * can check the arithmetic across a row — `unit × qty = line total` is the
 * whole point of a statement layout. There is no room for five columns at
 * 390px and none needed on the detail page, so those two cells are `hidden` and
 * the same facts appear as one meta line under the title. `hidden` rather than
 * a second component: a `display:none` child takes no grid cell, so one grid
 * declaration serves both without the markup being written twice.
 *
 * ## The image
 *
 * The line's own frozen snapshot, never the live product image: what the buyer
 * bought must not change because a supplier swapped a photo. `next/image` here
 * routes through the repository's CJ CDN loader rather than Vercel's metered
 * optimizer. A line with no snapshot renders the sunken square instead of a
 * broken frame, and the square is `aria-hidden` because it says nothing.
 */

type OrderLineRowProps = {
  line: BuyerOrderLine;
  /** Three columns and a combined meta line, for the detail page. */
  compact?: boolean;
};

export default function OrderLineRow({
  line,
  compact = false,
}: OrderLineRowProps) {
  const metaLine = [
    line.variant,
    `Qty ${line.quantity}`,
    `${line.unitAmountLabel} each`,
  ]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

  return (
    <li
      className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3.5 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-3.5 ${
        compact ? '' : 'md:grid-cols-[64px_minmax(0,1fr)_120px_74px_96px]'
      }`}
    >
      {line.imageUrl === null ? (
        <span
          aria-hidden
          className="block h-12 w-12 rounded-lg border border-border bg-surface-sunken sm:h-16 sm:w-16"
        />
      ) : (
        <Image
          src={line.imageUrl}
          alt={line.title}
          width={64}
          height={64}
          className="h-12 w-12 rounded-lg border border-border bg-surface-sunken object-cover sm:h-16 sm:w-16"
        />
      )}

      <div className="min-w-0">
        <p className="text-sm leading-snug text-balance text-ink">
          {line.title}
        </p>
        <p
          className={`mt-1 text-[13px] text-ink-muted ${compact ? '' : 'md:hidden'}`}
        >
          {metaLine}
        </p>
        {line.variant === null ? null : (
          <p
            className={`mt-1 hidden text-[13px] text-ink-muted ${compact ? '' : 'md:block'}`}
          >
            {line.variant}
          </p>
        )}
        <p className="mt-1.5 text-xs text-ink-muted">
          Accepted as ordered on {line.acceptedOnLabel}
        </p>
      </div>

      {compact ? null : (
        <p className="hidden text-[13px] text-ink-muted md:block">
          {line.unitAmountLabel} each
        </p>
      )}
      {compact ? null : (
        <p className="hidden text-[13px] text-ink-muted md:block">
          Qty {line.quantity}
        </p>
      )}

      <p className="text-right font-display text-[15px] font-semibold whitespace-nowrap text-ink">
        {line.lineTotalLabel}
      </p>
    </li>
  );
}
