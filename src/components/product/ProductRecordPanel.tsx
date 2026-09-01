'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import {
  optionSummary,
  variantById,
  variantCountInWords,
  variantsAboveFloor,
} from '@/lib/product-variants';
import chooseSentence from '@/lib/product-choice-sentence';
import {
  PRODUCT_VARIANT_CHANGE_EVENT,
  type ProductVariantChangeDetail,
} from '@/lib/product-variant-events';
import Card, { CardSection } from '@/components/ui/Card';
import FreeShippingNotice from '@/components/shipping/FreeShippingNotice';
import ProductAddToCartButtons from '@/components/product/ProductAddToCartButtons';
import ProductEvidenceLedger from '@/components/product/ProductEvidenceLedger';
import ProductOptionList from '@/components/product/ProductOptionList';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantityStepper, {
  stepQuantity,
} from '@/components/product/ProductQuantityStepper';
import { usePublishSelectedSku } from './selected-sku';

type ProductRecordPanelProps = {
  detail: ProductDetail;
  /**
   * The variant in play, resolved on the server: the `?variant=` one, or the
   * sole variant of a product that has only one. Absent means the buyer has not
   * chosen yet — no longer an impossible state.
   */
  selectedVariant?: ProductVariant;
  /** Whether that selection came from the URL rather than from being the only one. */
  selectedFromUrl: boolean;
  /**
   * Whether the page below rendered its reviews section, which decides whether
   * the evidence ledger's reviews row can link down to it.
   */
  reviewsAnchored?: boolean;
  /**
   * The free-shipping threshold for the buyer's likely destination, and the
   * name to show it under — resolved on the server by `page.tsx` from
   * `fetchFreeShippingThresholds()` against `resolveDestination()`'s guess.
   * See `FreeShippingNotice` for what absence of either means.
   */
  freeShippingThresholdAmountMinor?: number;
  freeShippingDestinationLabel?: string;
};

/**
 * Selection starts empty on any product that has something to choose.
 *
 * This reverses the 2026-08-21 owner decision that had `defaultVariantFor`
 * preselect on every product so the buttons were live on arrival. The owner
 * asked for the deliberate first choice back on 2026-08-31: what a buyer takes
 * to checkout should be a thing they picked, not a thing the page picked and
 * showed them. So both actions are disabled until a variant exists, with the
 * reason said in words above them — the same contract the unavailable state has
 * always used, now reached by a second route.
 *
 * A product with exactly one variant still arrives resolved. There is nothing to
 * choose, so a gate there would sit in front of a door with nothing behind it.
 *
 * ## What this does not yet do
 *
 * On a product with two or more named axes the first chip click still resolves
 * the axes the buyer has not answered: `ProductOptionList.chipTarget` narrows to
 * a real variant, preferring an available one, so clicking Black on a
 * colour-and-size product lands on some size rather than on a half-selection.
 * That is the existing rule and it is what keeps every chip live instead of
 * dead. Forcing an answer per axis needs the panel to hold a partial selection
 * rather than one variant id, which is a change to how selection is modelled
 * here, not a condition on this gate.
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
  reviewsAnchored,
  freeShippingThresholdAmountMinor,
  freeShippingDestinationLabel,
}: ProductRecordPanelProps) {
  const variants = useMemo(() => detail.variants ?? [], [detail.variants]);
  const axes = useMemo(() => detail.options ?? [], [detail.options]);
  const hasOptions = variants.length > 1;
  const [selectedVariantId, setSelectedVariantId] = useState(
    selectedVariant?.id,
  );
  const [selectionCameFromUrl, setSelectionCameFromUrl] =
    useState(selectedFromUrl);
  const [quantity, setQuantity] = useState(1);
  /*
    No default behind it any more: `undefined` here means the buyer has not
    chosen, and that is a state the page is now allowed to be in.

    The one fallback left is the product with a single variant, resolved here as
    well as in `page.tsx` rather than only there. The panel must not need the
    page to have thought of it: dropped on its own — in a test, or on any screen
    that reuses it — a one-variant product would otherwise arrive with nothing
    selected, and since it also has nothing to choose, its buttons would go live
    against no variant at all.
  */
  const selected =
    variantById(variants, selectedVariantId) ??
    (hasOptions ? undefined : variants[0]);
  const price = selected?.price ?? detail.price;
  const availability = selected?.availability ?? detail.availability;
  const unavailable = selected?.availability === 'UNAVAILABLE';
  // A product with one variant arrives resolved, and one with none buys against
  // its own price. Only a real set of options can be unanswered.
  const needsChoice = hasOptions && selected === undefined;

  // Mirrored outward for the specifications band, which prints the code and sits
  // in a different branch of the page. Publish only — the selection above stays
  // owned here, so this cannot affect what the buttons act on.
  usePublishSelectedSku(selected?.sku);

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
   * never a silently grey button, and never colour as the only signal.
   *
   * Two reasons now, and the order matters: nothing chosen is checked first
   * because with nothing chosen there is no availability to report. The sentence
   * names the axis in the seller's own word for it, so a buyer reads the same
   * label the chips above are grouped under.
   */
  function disabledReason(): string | undefined {
    if (needsChoice) return chooseSentence(axes[0]?.name);
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

      {/*
        Its own band, above the actions and below the options, because that is
        the order the decision is made in: which one, how many, then buy. The
        number survives an option change on purpose — a buyer who wanted three
        of the black one still wants three of the blue one.
      */}
      <CardSection>
        <ProductQuantityStepper
          value={quantity}
          onStep={(delta) =>
            setQuantity((current) => stepQuantity(current, delta))
          }
        />
      </CardSection>

      {/*
        Last thing seen before the buy buttons, on purpose: a nudge only
        works if it lands before the decision, not after it. `emphasize`
        pulses this one card for exactly that reason — see
        `FreeShippingNotice` and the `s3-free-shipping-glow` keyframe in
        `globals.css`. The cart's copy of this component does not carry it:
        it sits in an order summary a buyer is already reading line by line.
      */}
      <CardSection>
        <FreeShippingNotice
          thresholdAmountMinor={freeShippingThresholdAmountMinor}
          destinationLabel={freeShippingDestinationLabel}
          emphasize
        />
      </CardSection>

      <CardSection>
        <ProductAddToCartButtons
          productId={detail.id}
          title={detail.title}
          category={detail.category}
          imageUrl={detail.imageUrl}
          imageAlt={detail.imageAlt}
          tone={detail.tone}
          unitPrice={price}
          quantity={quantity}
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
        The ledger is the element on this page a competitor cannot copy without
        admitting their own data is stale. It used to carry a tinted band to say
        so; the tint is gone because the panel reads as one record only while
        every band shares a ground, and its last position already separates it.
      */}
      <CardSection>
        <ProductEvidenceLedger
          availability={availability}
          publishedAt={detail.publishedAt}
          rating={detail.rating}
          reviewsAnchored={reviewsAnchored}
        />
      </CardSection>
    </Card>
  );
}
