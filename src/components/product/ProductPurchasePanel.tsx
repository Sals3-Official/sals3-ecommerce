'use client';

import { useState } from 'react';
import { formatMoney, type Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import type {
  ProductAvailability,
  ProductOptionAxis,
  ProductVariant,
} from '@/lib/product-detail';
import {
  defaultVariantFor,
  firstUnchosenAxis,
  initialSelection,
  optionSummary,
  resolveVariant,
  type VariantSelection,
} from '@/lib/product-variants';
import ProductAddToCartButtons from '@/components/product/ProductAddToCartButtons';
import ProductAvailabilityNotice from '@/components/product/ProductAvailabilityNotice';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductVariantFallbackSelector from '@/components/product/ProductVariantFallbackSelector';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';

type ProductPurchasePanelProps = {
  productId: string;
  title: string;
  category: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  basePrice: Money;
  baseOldPrice?: Money;
  baseAvailability?: ProductAvailability;
  axes: ProductOptionAxis[];
  variants: ProductVariant[];
};

/**
 * Price, options, stock, and purchase for a product with **several** variants.
 *
 * Mounted **only** when the payload carries real option axes, which no product
 * does today. Everything else — one variant, many variants with no axes, or none
 * at all — is served by the server-rendered `ProductRecordPanel`, whose selection
 * lives in the URL rather than in client state.
 *
 * That split is deliberate: a client selector that repaints the price is
 * client-side price mutation after paint, which ADR-016 prohibits. This component
 * still does that, and is kept only because the axis-based path has never mounted
 * in production. **When the portal starts publishing option axes, this needs the
 * same URL-addressable treatment `ProductOptionList` already has** — do not ship
 * axes to buyers on top of this as it stands.
 *
 * ## Gating, in precedence order
 *
 * 1. No axes → nothing to choose, enabled. (Handled by `ProductRecordPanel`, but
 *    the same rule holds here.)
 * 2. Exactly one variant → preselected, enabled.
 * 3. Selection incomplete → **disabled**, naming the missing axis
 *    ("Choose a colour"). Not a silently grey button.
 * 4. Resolved variant `UNAVAILABLE` → **disabled**, saying so.
 * 5. Availability `UNKNOWN` or absent → **enabled, no badge**. Fail-open,
 *    deliberately: `UNKNOWN` is the common state, and failing closed would take
 *    the entire catalogue offline over evidence we simply have not refreshed.
 *    This is a stated, accepted risk, not an oversight.
 */
export default function ProductPurchasePanel({
  productId,
  title,
  category,
  imageUrl,
  imageAlt,
  tone,
  basePrice,
  baseOldPrice,
  baseAvailability,
  axes,
  variants,
}: ProductPurchasePanelProps) {
  const hasOptionAxes = axes.length > 0;
  const [selection, setSelection] = useState<VariantSelection>(() =>
    initialSelection(variants, axes),
  );
  const [fallbackVariantId, setFallbackVariantId] = useState<string>(() => {
    if (hasOptionAxes) return '';

    return defaultVariantFor(variants, basePrice)?.id ?? '';
  });
  const fallbackSelected =
    variants.find((variant) => variant.id === fallbackVariantId) ??
    defaultVariantFor(variants, basePrice);
  const selected = hasOptionAxes
    ? resolveVariant(variants, axes, selection)
    : fallbackSelected;
  const missingAxis = firstUnchosenAxis(axes, selection);

  const price = selected?.price ?? basePrice;
  const availability = selected?.availability ?? baseAvailability;

  function reasonFor(): string | undefined {
    if (missingAxis !== undefined) {
      return `Choose a ${missingAxis.name.toLowerCase()}.`;
    }

    if (selected === undefined) {
      return hasOptionAxes
        ? 'That combination is not available.'
        : 'Choose a variant.';
    }

    if (selected.availability === 'UNAVAILABLE') {
      return hasOptionAxes
        ? 'This option is currently unavailable.'
        : 'This variant is currently unavailable.';
    }

    return undefined;
  }

  const reason = reasonFor();
  const summary =
    selected === undefined
      ? undefined
      : (optionSummary(selected) ??
        `${selected.sku} · ${formatMoney(selected.price)}`);
  const cartVariant =
    selected === undefined
      ? undefined
      : { id: selected.id, sku: selected.sku, optionSummary: summary };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4">
      <ProductPriceDisplay
        price={price}
        oldPrice={selected === undefined ? baseOldPrice : undefined}
      />
      {/*
        `shipLine` used to render here. It is the portal's deprecated
        "Delivery quoted at checkout" non-claim, and it is false — nothing is
        quoted and nothing is added at checkout. The truthful version now lives in
        the evidence ledger's Delivery row. The field stays on the wire (the
        contract is additive-only) and the home card still renders it; the PDP
        simply stops repeating it.
      */}
      {hasOptionAxes ? (
        <ProductVariantSelector
          axes={axes}
          variants={variants}
          selection={selection}
          onChange={(axisName, value) =>
            setSelection((current) => ({ ...current, [axisName]: value }))
          }
        />
      ) : (
        <ProductVariantFallbackSelector
          variants={variants}
          selectedVariantId={selected?.id}
          onChange={setFallbackVariantId}
        />
      )}
      <ProductAvailabilityNotice availability={availability} />
      <ProductAddToCartButtons
        productId={productId}
        title={title}
        category={category}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        tone={tone}
        unitPrice={price}
        variant={cartVariant}
        disabledReason={reason}
      />
    </div>
  );
}
