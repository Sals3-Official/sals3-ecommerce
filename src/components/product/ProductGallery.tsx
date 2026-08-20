'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import type { ProductImage } from '@/lib/product-detail';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductGalleryProps = {
  /**
   * Every approved photo, lead image first. Each carries its own alt text, so a
   * thumbnail is never announced as "image 3 of 5" — that describes the gallery,
   * not the picture.
   */
  images: ProductImage[];
  tone: PlaceholderTone;
};

export default function ProductGallery({ images, tone }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex];

  return (
    <div className="md:sticky md:top-20">
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
