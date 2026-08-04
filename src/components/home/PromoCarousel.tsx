'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/Icon';
import { homePromoSlides } from '@/lib/home-promo-slides';

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
          className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-900 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          aria-label="Show next featured deal"
          className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-900 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronRightIcon />
        </button>
      </div>
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
            className="min-h-11 min-w-11 rounded-full p-3"
          >
            <span
              className={`block h-2.5 w-2.5 rounded-full ${
                index === selectedIndex ? 'bg-brand-700' : 'bg-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
