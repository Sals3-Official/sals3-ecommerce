'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductCardImageProps = {
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
};

/**
 * Fixed 1:1 container (build spec §4.2: the photo is the most colourful
 * item on the card, nothing crops or letterboxes it). No real photo →
 * reuse the existing tone placeholder. Real photo → show a skeleton until
 * the network fetch completes, so the grid never pops in a blank square.
 */
export default function ProductCardImage({
  imageUrl,
  imageAlt,
  tone,
}: ProductCardImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (!imageUrl) {
    return <ProductImagePlaceholder tone={tone} />;
  }

  return (
    <div className="relative aspect-square bg-white">
      {loaded ? null : (
        <div
          className="absolute inset-0 animate-pulse bg-border"
          aria-hidden="true"
        />
      )}
      <Image
        src={imageUrl}
        alt={imageAlt}
        fill
        sizes="(min-width: 1024px) 224px, (min-width: 640px) 33vw, 50vw"
        className="object-contain p-3"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
