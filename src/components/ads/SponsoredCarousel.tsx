'use client';

import { useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { PSF_BRAND, PSF_SLIDES } from '@/lib/ads/sponsored-slides';
import SponsoredCreative from './SponsoredCreative';
import { useCarouselAutoplay } from './useCarouselAutoplay';

type SponsoredCarouselProps = {
  /** `card` fills one product-grid cell; `row` centres in one list-view row. */
  variant: 'card' | 'row';
};

/** The artwork is at most one grid cell wide, and half a phone screen at that. */
const CARD_SIZES = '(min-width: 1024px) 224px, (min-width: 640px) 33vw, 50vw';
const ROW_SIZES = '300px';

/**
 * The in-feed sponsored slot, cycling the advertiser's creatives on its own.
 *
 * ## The frame is now empty, on purpose
 *
 * No label above the artwork, no dots or pause button below it — the owner
 * removed both (2026-08-26), so the slot is the advertiser's three creatives
 * and nothing else. The artwork carries its own branding, its own call to
 * action, and its own comparison-rate warning; the frame just holds it.
 *
 * Two things survive that removal because they were never visible chrome:
 * every creative links with `rel="sponsored"`, which is what Google reads to
 * classify a paid link, and this section keeps its `aria-label`, which is what
 * a screen reader announces before the advertisement starts. Between them a
 * machine can still tell this is an advertisement; a sighted reader now has
 * only the artwork's own branding to go on, which is a disclosure decision the
 * owner made deliberately and which is written up in README.
 *
 * ## What is left of the motion controls
 *
 * Pointer and keyboard focus still pause it, so reading a slide is not a race,
 * and `prefers-reduced-motion` still stops it starting at all. What is gone is
 * the explicit pause button, and with it WCAG 2.2.2 — a visitor who wants the
 * rotation to stop can now only hover it. Recorded rather than quietly
 * accepted; the button is a two-line restore if that trade stops being worth
 * it.
 */
export default function SponsoredCarousel({ variant }: SponsoredCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [pausedByPointer, setPausedByPointer] = useState(false);

  useCarouselAutoplay(emblaApi, {
    paused: pausedByPointer,
    slideCount: PSF_SLIDES.length,
  });

  const isCard = variant === 'card';

  return (
    <section
      aria-label="Sponsored placement"
      aria-roledescription="carousel"
      className={`flex h-full flex-col justify-center overflow-hidden rounded-xl border border-border ${
        isCard ? '' : 'mx-auto w-full max-w-[300px]'
      }`}
      style={{ backgroundColor: PSF_BRAND.navy }}
      onMouseEnter={() => setPausedByPointer(true)}
      onMouseLeave={() => setPausedByPointer(false)}
      onFocusCapture={() => setPausedByPointer(true)}
      onBlurCapture={() => setPausedByPointer(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y items-stretch">
          {PSF_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className="min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`Advertisement ${index + 1} of ${PSF_SLIDES.length}`}
            >
              <SponsoredCreative
                slide={slide}
                isFirst={index === 0}
                sizes={isCard ? CARD_SIZES : ROW_SIZES}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
