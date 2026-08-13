import Image from 'next/image';
import { formatMoney } from '@/lib/money';
import {
  getCartLineTotal,
  MAX_LINE_QUANTITY,
  type CartLineItem,
} from '@/lib/cart';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type CartLineItemRowProps = {
  line: CartLineItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
};

export default function CartLineItemRow({
  line,
  onDecrease,
  onIncrease,
  onRemove,
}: CartLineItemRowProps) {
  return (
    <div className="flex gap-3.5 border-b border-border p-3.5 last:border-b-0">
      <div className="relative aspect-square w-20 flex-none overflow-hidden rounded-lg bg-white">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt}
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        ) : (
          <ProductImagePlaceholder tone={line.tone} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-pretty text-ink">{line.title}</p>
        {/*
          Without this, two variants of one product render as two visually
          identical rows — the identity change would be invisible, which is a
          real bug rather than a cosmetic one.
        */}
        {line.variant?.optionSummary === undefined ? null : (
          <p className="mt-0.5 text-xs text-ink-muted">
            {line.variant.optionSummary}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDecrease}
            aria-label="Decrease quantity"
            className="h-11 w-11 cursor-pointer rounded-md border border-border-strong text-sm transition-all duration-200 hover:border-brand-600 hover:bg-brand-600/5 active:scale-95"
          >
            −
          </button>
          <span className="min-w-5 text-center text-sm">{line.quantity}</span>
          <button
            type="button"
            onClick={onIncrease}
            disabled={line.quantity >= MAX_LINE_QUANTITY}
            aria-label="Increase quantity"
            className="h-11 w-11 cursor-pointer rounded-md border border-border-strong text-sm transition-all duration-200 hover:border-brand-600 hover:bg-brand-600/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:bg-transparent disabled:active:scale-100"
          >
            +
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 min-h-11 cursor-pointer px-2 text-xs text-ink-subtle transition-all duration-200 hover:text-deal active:scale-95"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-lg font-semibold text-ink">
          {formatMoney(getCartLineTotal(line))}
        </div>
      </div>
    </div>
  );
}
