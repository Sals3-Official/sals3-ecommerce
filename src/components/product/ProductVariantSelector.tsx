'use client';

import type { ProductOptionAxis, ProductVariant } from '@/lib/product-detail';
import {
  isValueSelectable,
  type VariantSelection,
} from '@/lib/product-variants';

type ProductVariantSelectorProps = {
  axes: ProductOptionAxis[];
  variants: ProductVariant[];
  selection: VariantSelection;
  onChange: (axisName: string, value: string) => void;
};

/**
 * One radio group per option axis.
 *
 * ## Unavailable values stay visible
 *
 * A combination that does not exist is rendered inactive, not removed. Removing
 * it hides that the combination exists at all, and a screen-reader user would
 * never learn the size they want is out of stock — they would simply not find
 * it. `aria-disabled` plus a diagonal strike says "this one, not available",
 * which is the actual fact.
 *
 * ## Roles, not styled buttons
 *
 * `radiogroup`/`radio` with `aria-checked` is what makes this operable by
 * keyboard and legible to assistive technology; `tabIndex` puts one stop on the
 * group and arrow keys move within it, matching how a native radio group
 * behaves. Selection is also never colour-only — the chosen value carries a
 * check mark.
 */
export default function ProductVariantSelector({
  axes,
  variants,
  selection,
  onChange,
}: ProductVariantSelectorProps) {
  function moveWithin(axis: ProductOptionAxis, from: string, step: number) {
    const index = axis.values.indexOf(from);
    const next =
      axis.values[(index + step + axis.values.length) % axis.values.length];

    if (next !== undefined) onChange(axis.name, next);
  }

  return (
    <div className="flex flex-col gap-4">
      {axes.map((axis) => {
        const chosen = selection[axis.name];
        const labelId = `variant-axis-${axis.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        return (
          <div key={axis.name} className="flex flex-col gap-1.5">
            <span id={labelId} className="text-sm font-medium text-ink">
              {axis.name}
              {chosen === undefined ? null : (
                <span className="ml-1 font-normal text-ink-muted">
                  {chosen}
                </span>
              )}
            </span>
            <div
              role="radiogroup"
              aria-labelledby={labelId}
              className="flex flex-wrap gap-2"
            >
              {axis.values.map((value) => {
                const selected = chosen === value;
                const selectable = isValueSelectable(
                  variants,
                  selection,
                  axis.name,
                  value,
                );

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={!selectable}
                    // Focusable even when unavailable, so it can be discovered;
                    // one tab stop per group, then arrow keys.
                    tabIndex={selected || chosen === undefined ? 0 : -1}
                    onClick={() => {
                      if (selectable) onChange(axis.name, value);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'ArrowRight' ||
                        event.key === 'ArrowDown'
                      ) {
                        event.preventDefault();
                        moveWithin(axis, value, 1);
                      }

                      if (
                        event.key === 'ArrowLeft' ||
                        event.key === 'ArrowUp'
                      ) {
                        event.preventDefault();
                        moveWithin(axis, value, -1);
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
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
