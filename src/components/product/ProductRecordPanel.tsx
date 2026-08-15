'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import {
  defaultVariantFor,
  optionSummary,
  variantById,
  variantCountInWords,
} from '@/lib/product-variants';
import {
  PRODUCT_VARIANT_CHANGE_EVENT,
  type ProductVariantChangeDetail,
} from '@/lib/product-variant-events';
import Card, { CardSection } from '@/components/ui/Card';
import ProductAddToCartButtons from '@/components/product/ProductAddToCartButtons';
import ProductEvidenceLedger from '@/components/product/ProductEvidenceLedger';
import ProductOptionList from '@/components/product/ProductOptionList';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';

type ProductRecordPanelProps = {
  detail: ProductDetail;
  /** The variant in play — resolved from `?variant=`, or the honest default. */
  selectedVariant?: ProductVariant;
  /** Whether the selection came from the URL rather than from the default. */
  selectedFromUrl: boolean;
};

/**
 * With real named axes, nothing is preselected: the buyer picks deliberately,
 * exactly as the client panel used to require. Both states are server-rendered —
 * "From {floor}" with purchase disabled, then the chosen variant's exact price —
 * so keeping that behaviour costs no ADR-016 compliance.
 *
 * Without axes there is nothing to choose, so `defaultVariantFor` preselects and
 * purchase stays enabled.
 */

/**
 * The buy rail as **one record**, not a stack of cards.
 *
 * Before this, the rail was four separate
 * `rounded-xl border border-border bg-white p-4` cards at identical visual
 * weight, which communicates no hierarchy: price, options, actions and delivery
 * read as four unrelated widgets rather than as one document about one item. Now
 * it is a single bounded panel divided by hairlines, in the order a buyer needs:
 * what it costs, what to choose, how to buy, and what is actually known.
 *
 * Initial selection still arrives from the server-rendered URL. After hydration,
 * same-page option clicks reuse the already-loaded variant payload so the buyer
 * does not pay a fresh PDP request for every chip.
 *
 * `ProductShippingCard` used to sit below this panel claiming shipping is quoted
 * at checkout. It is gone: no quote happens, nothing is added at checkout, and
 * the truthful version of that statement is now the ledger's Delivery row.
 */
export default function ProductRecordPanel({
  detail,
  selectedVariant,
  selectedFromUrl,
}: ProductRecordPanelProps) {
  const variants = useMemo(() => detail.variants ?? [], [detail.variants]);
  const axes = useMemo(() => detail.options ?? [], [detail.options]);
  const hasOptions = variants.length > 1;
  const hasOptionAxes = axes.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState(
    selectedVariant?.id,
  );
  const [selectionCameFromUrl, setSelectionCameFromUrl] =
    useState(selectedFromUrl);
  const selected =
    variantById(variants, selectedVariantId) ??
    (hasOptionAxes ? undefined : defaultVariantFor(variants, detail.price));
  const price = selected?.price ?? detail.price;
  const availability = selected?.availability ?? detail.availability;
  const unavailable = selected?.availability === 'UNAVAILABLE';
  // Only reachable on an axes product, where nothing is preselected.
  const unchosen = hasOptionAxes && selected === undefined;

  // "From" only while the figure is the floor of a range the buyer has not
  // narrowed. Once a variant is chosen the price is that variant's exact price
  // and the qualifier would be false.
  const showFrom = hasOptions && !selectionCameFromUrl;

  // Named options first, then the supplier's label. Never the SKU: a cart line
  // reading `S3V-2268B366F762` tells a buyer nothing about what they added, and
  // an absent sub-label is better than a digest.
  const summary =
    selected === undefined
      ? undefined
      : (optionSummary(selected) ?? selected.label);

  useEffect(() => {
    function selectVariant(variantId: string | undefined) {
      const next = variantById(variants, variantId);

      setSelectedVariantId(next?.id);
      setSelectionCameFromUrl(next !== undefined);
    }

    function handlePopState() {
      selectVariant(
        new URLSearchParams(window.location.search).get('variant') ?? undefined,
      );
    }

    function handleVariantChange(event: Event) {
      const { variantId } = (event as CustomEvent<ProductVariantChangeDetail>)
        .detail;

      selectVariant(variantId);
    }

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(PRODUCT_VARIANT_CHANGE_EVENT, handleVariantChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(
        PRODUCT_VARIANT_CHANGE_EVENT,
        handleVariantChange,
      );
    };
  }, [variants]);

  /**
   * Context under the price. Never the SKU: it is a SHA-256 digest and means
   * nothing to a buyer — the earlier version of this line rendered it, which is
   * the defect the option labels exist to fix. When a variant is chosen the
   * supplier's own label identifies it; with no label there is nothing honest to
   * name it by, so only the count is stated.
   */
  function countLine(): string | undefined {
    if (!hasOptions) return undefined;

    const total = variantCountInWords(variants.length).toLowerCase();

    if (selectionCameFromUrl && selected !== undefined) {
      return selected.label === undefined
        ? `One of ${total} options`
        : `${selected.label} · one of ${total}`;
    }

    return `${variantCountInWords(variants.length)} supplier options`;
  }

  /**
   * Why purchase is blocked, in words a buyer can act on. Absent means enabled —
   * never a silently grey button.
   */
  function disabledReason(): string | undefined {
    if (unchosen) {
      return `Choose a ${(axes[0]?.name ?? 'option').toLowerCase()}.`;
    }

    if (unavailable) return 'This option is currently unavailable.';

    return undefined;
  }

  const count = countLine();

  return (
    <Card divided>
      <CardSection>
        <ProductPriceDisplay
          price={price}
          oldPrice={selected === undefined ? detail.oldPrice : undefined}
          fromLabel={showFrom ? 'From' : undefined}
        />
        {count === undefined ? null : (
          <p className="mt-2 font-display text-lg text-ink-muted tabular-nums">
            {count}
          </p>
        )}
      </CardSection>

      {hasOptions ? (
        <CardSection>
          <ProductOptionList
            productId={detail.id}
            variants={variants}
            selectedVariantId={selected?.id}
            axes={axes}
          />
        </CardSection>
      ) : null}

      <CardSection>
        <ProductAddToCartButtons
          productId={detail.id}
          title={detail.title}
          category={detail.category}
          imageUrl={detail.imageUrl}
          imageAlt={detail.imageAlt}
          tone={detail.tone}
          unitPrice={price}
          variant={
            selected === undefined
              ? undefined
              : {
                  id: selected.id,
                  sku: selected.sku,
                  optionSummary: summary,
                }
          }
          disabledReason={disabledReason()}
        />
      </CardSection>

      <CardSection>
        <ProductEvidenceLedger
          availability={availability}
          publishedAt={detail.publishedAt}
        />
      </CardSection>
    </Card>
  );
}
