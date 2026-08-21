'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/Icon';
import { homePromoSlides } from '@/lib/home-promo-slides';

/**
 * The brand gradient with a white chevron, the same navy-to-brand-blue run
 * `.bg-brand-gradient` gives every solid brand action. White on the light end
 * of that gradient measures 3.74:1 — under the 4.5:1 body-text minimum, over
 * the 3:1 WCAG 1.4.11 minimum for a graphical control, which is what a
 * chevron is. `border-white/30` keeps the circle readable where a slide's own
 * photo is dark.
 */
const ARROW_CLASS =
  'bg-brand-gradient pointer-events-auto flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/30 text-white shadow-md transition duration-200 ease-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45';

export default function PromoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const hasMultipleSlides = homePromoSlides.length > 1;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(hasMultipleSlides);
  const [canScrollNext, setCanScrollNext] = useState(hasMultipleSlides);

  const updateCarouselState = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return undefined;
    }

    emblaApi.on('select', updateCarouselState);
    emblaApi.on('reInit', updateCarouselState);

    return () => {
      emblaApi.off('select', updateCarouselState);
      emblaApi.off('reInit', updateCarouselState);
    };
  }, [emblaApi, updateCarouselState]);

  return (
    <section
      className="relative mt-5"
      aria-label="Featured deals"
      aria-roledescription="carousel"
    >
      {/* The arrows live inside this wrapper, not the <section>: `inset-y-0`
          on the section also spans the dot row below the banner, which pushed
          both arrows below the image's true centre. */}
      <div className="relative">
        <div
          className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
          ref={emblaRef}
        >
          <div className="flex touch-pan-y">
            {homePromoSlides.map((slide, index) => (
              <div
                key={slide.id}
                className="min-w-0 flex-[0_0_100%]"
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${homePromoSlides.length}`}
              >
                <Link
                  href={slide.href}
                  className="relative block aspect-[1734/662] overflow-hidden hover:no-underline"
                >
                  <Image
                    src={slide.imageSrc}
                    alt={slide.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1152px"
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <span className="sr-only">{slide.title}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 left-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label="Show previous featured deal"
            className={ARROW_CLASS}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            aria-label="Show next featured deal"
            className={ARROW_CLASS}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
      {/* The active dot wears `.bg-brand-gradient` — the same navy-to-brand-blue
          run as the arrows and every primary action — and widens to a 24px
          pill so that gradient has room to read; at 10px square it collapses
          into a flat navy. Only the width animates: a gradient cannot
          cross-fade to a flat colour, so the inactive slate is a straight
          swap. */}
      <div
        className="mt-3 flex justify-center gap-2"
        aria-label="Featured deal slides"
      >
        {homePromoSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Show featured deal ${index + 1}`}
            aria-current={index === selectedIndex ? 'true' : undefined}
            className="group flex min-h-11 min-w-4 items-center justify-center"
          >
            <span
              className={`block h-2.5 shrink-0 rounded-full transition-[width] duration-200 ease-out ${
                index === selectedIndex
                  ? 'bg-brand-gradient w-6'
                  : 'w-2.5 bg-slate-300 group-hover:bg-slate-400'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
