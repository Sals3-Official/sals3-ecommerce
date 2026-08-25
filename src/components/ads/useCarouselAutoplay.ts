'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

type EmblaApi = NonNullable<UseEmblaCarouselType[1]>;

export const AUTOPLAY_INTERVAL_MS = 6000;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onStoreChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);

  query.addEventListener('change', onStoreChange);

  return () => {
    query.removeEventListener('change', onStoreChange);
  };
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * The server has no media queries, so it answers "no preference". Reading the
 * setting through `useSyncExternalStore` rather than an effect is what keeps
 * that honest: React re-reads the real value as it hydrates, instead of the
 * markup carrying a guess that a second render then has to correct.
 */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

/**
 * Advances a carousel on a timer.
 *
 * Written by hand rather than by adding `embla-carousel-autoplay`: this is one
 * `setInterval`, and a dependency is not worth it for that.
 *
 * Three things stop the timer, and they are not interchangeable. `paused` is
 * the pointer/focus courtesy — reading a slide should not become a race
 * against it. `prefers-reduced-motion` is an accessibility setting, so it does
 * not merely pause: the carousel never starts at all. A single slide has
 * nothing to advance to.
 *
 * It returns nothing. It used to report whether it was running, for a
 * pause button that the owner has since removed (2026-08-26) — with no control
 * left to label, a caller has nothing to do with the answer.
 */
export function useCarouselAutoplay(
  emblaApi: EmblaApi | undefined,
  { paused, slideCount }: { paused: boolean; slideCount: number },
): void {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const isPlaying =
    !paused &&
    !prefersReducedMotion &&
    slideCount > 1 &&
    emblaApi !== undefined;

  useEffect(() => {
    if (!isPlaying || emblaApi === undefined) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [emblaApi, isPlaying]);
}
