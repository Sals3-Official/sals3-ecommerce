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
 * Which gallery photo a variant points at.
 *
 * Matched by address rather than carried as an index: `imageUrl` is the same
 * string the gallery was built from (both come from `product_media_sources`
 * through one projection), and an index would be a second ordering that can
 * disagree with the first. A variant whose photo is not in the gallery — a race
 * between the two cached payloads — resolves to `-1` and simply leaves the
 * gallery where it was, which is why this returns a *found* index rather than
 * clamping to 0 and silently jumping to the lead photo.
 */
function galleryIndexOfVariant(
  images: ProductImage[],
  variants: ProductVariant[],
  variantId: string | undefined,
): number {
  const url = variants.find((variant) => variant.id === variantId)?.imageUrl;

  if (url === undefined) return -1;

  return images.findIndex((image) => image.url === url);
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
  const selected = images[selectedIndex];

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
      const index = galleryIndexOfVariant(images, variants, variantId);

      if (index !== -1) setSelectedIndex(index);
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
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={index === selectedIndex}
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
