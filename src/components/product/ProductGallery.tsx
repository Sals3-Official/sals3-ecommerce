'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import type { ProductImage, ProductVariant } from '@/lib/product-detail';
import {
  PRODUCT_VARIANT_CHANGE_EVENT,
  type ProductVariantChangeDetail,
} from '@/lib/product-variant-events';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductGalleryProps = {
  /**
   * Every approved photo, lead image first. Each carries its own alt text, so a
   * thumbnail is never announced as "image 3 of 5" — that describes the gallery,
   * not the picture.
   */
  images: ProductImage[];
  tone: PlaceholderTone;
  /**
   * Every variant, so a chip click can be answered with that variant's own
   * photo. Omitted for a product with no axes, where nothing can change.
   */
  variants?: ProductVariant[];
  /** The variant the page arrived on, so the gallery opens on its photo. */
  selectedVariantId?: string;
};

/**
 * A variant's own photograph, if it has one.
 *
 * Matched by address rather than carried as an index: both this and the gallery
 * come from `product_media_sources` through one projection, and an index would
 * be a second ordering that can disagree with the first.
 */
function variantPhotoUrl(
  variants: ProductVariant[],
  variantId: string | undefined,
): string | undefined {
  return variants.find((variant) => variant.id === variantId)?.imageUrl;
}

/**
 * Which gallery slide a variant's photo is, or `-1` when it is not one.
 *
 * ## Why `-1` is the ordinary case now, not a race
 *
 * This used to be the *only* way a variant photo reached the screen, and its
 * own comment explained a `-1` as "a race between the two cached payloads".
 * That was true while the Portal served variation photos as gallery slides —
 * and that was exactly the defect the Portal fixed on 2026-08-28: a product
 * using variation photos properly turned its gallery into twenty-one
 * near-identical close-ups of the option the buyer had not chosen yet.
 *
 * The Portal's `loadApprovedImages` now serves product-level rows only, so a
 * variation photo is **never** a gallery slide. Leaving the lookup as the only
 * path made the storefront worse than before: on the 21-design
 * `Knitted Tam Beanie` every design fell back to one generic supplier cover,
 * because `findIndex` could no longer find anything.
 *
 * So the index is now only about the thumbnail strip — highlighting a slide
 * when the variant's photo happens to be one. The picture the buyer sees is
 * decided by `variantPhotoUrl` above, gallery membership or not, which is the
 * same separation the marketplace editors make: a curated strip of product
 * photos, plus a per-variation picture that is not one of them.
 */
function galleryIndexOfVariant(
  images: ProductImage[],
  variants: ProductVariant[],
  variantId: string | undefined,
): number {
  const url = variantPhotoUrl(variants, variantId);

  if (url === undefined) return -1;

  return images.findIndex((image) => image.url === url);
}

/**
 * The variation's own photograph as something the frame can render, or `null`
 * when the strip should stay in charge.
 *
 * Returns `null` in two different-looking cases that want the same answer: the
 * variant has no photo (the buyer picked a size, not a picture), and the
 * variant's photo is already a slide (so `selectedIndex` can point at it and
 * the strip highlight stays honest).
 *
 * ## The alt text
 *
 * Named after the option the buyer actually chose — `Argentina`, not the
 * product title — because on a product whose whole purpose is telling
 * twenty-one designs apart, "Knitted Tam Beanie" on every one of them is the
 * announcement a screen-reader user cannot navigate by. Falls back to the
 * gallery's own alt when the variant carries no options, which is the single
 * implicit variant of an axis-less product, where the design-name idea does not
 * apply.
 */
function offGalleryVariantPhoto(
  images: ProductImage[],
  variants: ProductVariant[],
  variantId: string | undefined,
): ProductImage | null {
  const url = variantPhotoUrl(variants, variantId);

  if (url === undefined) return null;
  if (images.some((image) => image.url === url)) return null;

  const variant = variants.find((item) => item.id === variantId);
  const optionLabel = variant?.options
    ?.map((option) => option.value)
    .join(', ');
  const productAlt = images[0]?.alt ?? '';

  return {
    url,
    alt:
      optionLabel === undefined || optionLabel === ''
        ? productAlt
        : `${productAlt} — ${optionLabel}`,
  };
}

export default function ProductGallery({
  images,
  tone,
  variants = [],
  selectedVariantId,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const index = galleryIndexOfVariant(images, variants, selectedVariantId);

    return index === -1 ? 0 : index;
  });
  /**
   * A variation photo that is not in the strip, shown in place of the slide.
   *
   * `null` whenever the strip is authoritative — no variant chosen, the variant
   * has no photo of its own, the buyer picked a thumbnail, or the variant's
   * photo *is* a slide (in which case `selectedIndex` already points at it and
   * a second copy here could only disagree).
   */
  const [variantPhoto, setVariantPhoto] = useState<ProductImage | null>(() =>
    offGalleryVariantPhoto(images, variants, selectedVariantId),
  );
  // The variation's own picture wins: it is the more specific answer to "what
  // does the thing I picked look like".
  const selected = variantPhoto ?? images[selectedIndex];

  /**
   * Follow the buyer's variant choice, over the same event the record panel
   * already listens to.
   *
   * Not lifted state and not a provider: `PRODUCT_VARIANT_CHANGE_EVENT` is the
   * seam this page already has between the option chips and the panel, and a
   * second mechanism for the same fact is a second thing that can disagree
   * about which variant is selected. The gallery is a third subscriber to one
   * broadcast.
   *
   * A chip whose variant has no photo of its own leaves the gallery alone
   * rather than resetting it to the lead image — the buyer chose a size, not a
   * new picture, and yanking the view back would read as the page losing their
   * place.
   */
  useEffect(() => {
    function showVariant(variantId: string | undefined) {
      // No photo of its own — the buyer chose a size, not a new picture, so
      // leave the view exactly where it is rather than yanking it back to the
      // lead image.
      if (variantPhotoUrl(variants, variantId) === undefined) return;

      const index = galleryIndexOfVariant(images, variants, variantId);

      if (index === -1) {
        setVariantPhoto(offGalleryVariantPhoto(images, variants, variantId));

        return;
      }

      setSelectedIndex(index);
      setVariantPhoto(null);
    }

    function handleVariantChange(event: Event) {
      showVariant(
        (event as CustomEvent<ProductVariantChangeDetail>).detail.variantId,
      );
    }

    /**
     * Back and forward, for the same reason the record panel listens to them.
     *
     * `handlePopState` there updates the panel's own state without dispatching
     * `PRODUCT_VARIANT_CHANGE_EVENT`, so a gallery listening only to the event
     * would sit on the previous colour while the panel returned to the one the
     * URL names - two halves of one page disagreeing about what is selected.
     * Reading the query string is what the panel does, so both halves answer to
     * the same source rather than to each other.
     */
    function handlePopState() {
      showVariant(
        new URLSearchParams(window.location.search).get('variant') ?? undefined,
      );
    }

    window.addEventListener(PRODUCT_VARIANT_CHANGE_EVENT, handleVariantChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener(
        PRODUCT_VARIANT_CHANGE_EVENT,
        handleVariantChange,
      );
      window.removeEventListener('popstate', handlePopState);
    };
  }, [images, variants]);

  return (
    <div>
      {/*
        4:5 rather than square. Apparel is the catalogue's shape and a portrait
        frame gives a jacket more of the first screen without pushing the record
        panel below the fold.
      */}
      <div className="relative aspect-4/5 overflow-hidden rounded-xl border border-border bg-white">
        {selected ? (
          <Image
            src={selected.url}
            alt={selected.alt}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-contain p-4"
            priority
          />
        ) : (
          <ProductImagePlaceholder tone={tone} />
        )}
      </div>
      {images.length > 1 ? (
        <div
          role="group"
          aria-label="Product photos"
          /*
            A five-column grid, not a flex row: `flex-1` divided one gallery's
            thumbnails across the full width, so a two-photo product got two
            half-width thumbnails and a five-photo product got five narrow ones.
            A fixed column count keeps every thumbnail the same size whatever
            the count, and the twelfth photo wraps to a second row instead of
            shrinking the first eleven.
          */
          className="mt-2.5 grid grid-cols-5 gap-2"
        >
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => {
                setSelectedIndex(index);
                // Picking a thumbnail is the buyer overriding the variation's
                // own picture; leaving it set would make the strip highlight a
                // slide the frame above is not showing.
                setVariantPhoto(null);
              }}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={variantPhoto === null && index === selectedIndex}
              /* `min-w-11` as well as `min-h-11`: a 44px-tall target that is
                 only 30px wide is not a 44x44 target. */
              className={`relative aspect-square min-h-11 min-w-11 cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition-all duration-200 active:scale-95 ${
                index === selectedIndex
                  ? 'border-brand-blue-500'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
