'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductGalleryProps = {
  images: string[];
  imageAlt: string;
  tone: PlaceholderTone;
};

export default function ProductGallery({
  images,
  imageAlt,
  tone,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];

  return (
    <div className="md:sticky md:top-20">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-white">
        {selectedImage ? (
          <Image
            src={selectedImage}
            alt={imageAlt}
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
        <div className="mt-2 flex gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={index === selectedIndex}
              className={`relative aspect-square min-h-11 flex-1 cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition-all duration-200 active:scale-95 ${
                index === selectedIndex
                  ? 'border-brand-600'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              <Image
                src={image}
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
