'use client';

import { formatMoney } from '@/lib/money';
import type { ProductVariant } from '@/lib/product-detail';

type ProductVariantFallbackSelectorProps = {
  variants: ProductVariant[];
  selectedVariantId?: string;
  onChange: (variantId: string) => void;
};

function labelFor(variant: ProductVariant): string {
  return `${variant.sku} · ${formatMoney(variant.price)}`;
}

export default function ProductVariantFallbackSelector({
  variants,
  selectedVariantId,
  onChange,
}: ProductVariantFallbackSelectorProps) {
  const available = variants.filter(
    (variant) => variant.availability !== 'UNAVAILABLE',
  );
  const labelId = 'variant-fallback-label';

  function moveWithin(fromId: string, step: number) {
    if (available.length === 0) return;

    const index = Math.max(
      available.findIndex((variant) => variant.id === fromId),
      0,
    );
    const next =
      available[(index + step + available.length) % available.length];

    if (next !== undefined) onChange(next.id);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium text-ink">
        Variant
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-2"
      >
        {variants.map((variant) => {
          const selected = selectedVariantId === variant.id;
          const selectable = variant.availability !== 'UNAVAILABLE';

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!selectable}
              tabIndex={selected || selectedVariantId === undefined ? 0 : -1}
              onClick={() => {
                if (selectable) onChange(variant.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  moveWithin(variant.id, 1);
                }

                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  moveWithin(variant.id, -1);
                }
              }}
              className={`relative min-h-11 cursor-pointer rounded-lg border-2 px-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                selected
                  ? 'border-brand-600 text-brand-600'
                  : 'border-border text-ink hover:border-border-strong'
              } ${
                selectable
                  ? ''
                  : 'cursor-not-allowed text-ink-faint before:absolute before:inset-x-1 before:top-1/2 before:h-px before:-rotate-12 before:bg-border-strong'
              }`}
            >
              {selected ? (
                <span aria-hidden="true" className="mr-1">
                  ✓
                </span>
              ) : null}
              {labelFor(variant)}
              {selectable ? null : (
                <span className="ml-1 font-normal text-ink-faint">
                  Unavailable
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
