'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import {
  defaultVariantFor,
  optionSummary,
  variantById,
  variantCountInWords,
  variantsAboveFloor,
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
 * Selection is never empty. `defaultVariantFor` preselects on every product —
 * named axes included — so Add to Cart and Buy Now are live on arrival rather
 * than disabled behind a choice the page has not asked for. The default prefers
 * an available variant priced at the product's own displayed price, which is why
 * preselecting cannot move the lead price off the feed price (ADR-016).
 *
 * The chips show that combination as chosen, so the preselection is stated on
 * screen instead of being a hidden assumption in the cart line, and one click
 * replaces it. What is lost is the deliberate first choice the earlier client
 * panel forced; that was an owner decision, taken 2026-08-21.
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
  const [selectedVariantId, setSelectedVariantId] = useState(
    selectedVariant?.id,
  );
  const [selectionCameFromUrl, setSelectionCameFromUrl] =
    useState(selectedFromUrl);
  const selected =
    variantById(variants, selectedVariantId) ??
    defaultVariantFor(variants, detail.price);
  const price = selected?.price ?? detail.price;
  const availability = selected?.availability ?? detail.availability;
  const unavailable = selected?.availability === 'UNAVAILABLE';

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

  /**
   * Why purchase is blocked, in words a buyer can act on. Absent means enabled —
   * never a silently grey button.
   *
   * "Choose a colour." is gone with the empty selection that produced it: there
   * is always a variant now, so the only thing that can block a buy is that
   * variant being unavailable, and the fix for that is picking another chip.
   */
  function disabledReason(): string | undefined {
    if (unavailable) return 'This option is currently unavailable.';

    return undefined;
  }

  /**
   * What the figure above the note does and does not commit to.
   *
   * The v3.1 prototype's enabled-state line reads "Ready to add. Nothing is
   * added to this price at checkout." **That is false as of 2026-08-17**: live
   * CJ freight quotes ship in `quoteCheckoutShippingAction`, and the amount the
   * buyer picks is added to the Stripe session. Transcribing it would put a
   * false money claim on the page — see the same correction in
   * `ProductEvidenceLedger`'s Delivery row.
   */
  function priceNote(): string | undefined {
    if (selected !== undefined && selectionCameFromUrl) {
      return 'The exact price for this option. Delivery is quoted at checkout.';
    }

    const spread = variantsAboveFloor(variants, detail.price);

    if (spread === undefined) return undefined;

    if (spread.dearer === 0) return 'Every option is this price.';

    return `${variantCountInWords(spread.dearer)} of the ${variantCountInWords(
      spread.total,
    ).toLowerCase()} options cost more than this. Choose to see the exact price.`;
  }

  const note = priceNote();

  return (
    <Card divided>
      <CardSection>
        <ProductPriceDisplay
          price={price}
          oldPrice={selected === undefined ? detail.oldPrice : undefined}
          fromLabel={showFrom ? 'From' : undefined}
        />
        {note === undefined ? null : (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            {note}
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

      {/*
        The panel's only tinted band, and the only one it should ever have. The
        ledger is the element on this page a competitor cannot copy without
        admitting their own data is stale, so it gets the one visual signal that
        says "this part is different" — spent once, on that.
      */}
      <CardSection className="bg-surface">
        <ProductEvidenceLedger
          availability={availability}
          publishedAt={detail.publishedAt}
        />
      </CardSection>
    </Card>
  );
}
