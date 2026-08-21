'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/Icon';

type CategoryCarouselProps = {
  label: string;
  /** How many pages `children` holds; one page means nothing to page to. */
  pageCount: number;
  children: ReactNode;
};

/**
 * Slack in pixels before an edge counts as reached. Fractional `scrollLeft`
 * (fractional column widths, browser zoom, trackpad momentum) otherwise leaves
 * a "next" arrow enabled at the end that scrolls nowhere.
 */
const EDGE_SLACK = 2;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The paging shell around the category tiles.
 *
 * The track is a CSS scroll container holding one full-width page per child,
 * snapped per page. Paging is therefore `scrollBy(clientWidth)` — exactly one
 * page — rather than transform maths: the browser owns the geometry, so the
 * layout stays correct across breakpoints, RTL, and zoom, touch swipe works
 * natively with no gesture handler, and keyboard focus scrolls the next tile
 * into view on its own. `prefers-reduced-motion` drops the smooth scroll.
 *
 * The tiles are passed in as `children` so they stay server-rendered: only
 * this shell is client code, and the 19 inline category icons never enter the
 * client bundle.
 *
 * Arrows are rendered only when there is somewhere to go, and only from `md`
 * up — below that the track is swiped, and a 44px control parked over a 3-up
 * grid of tiles covers the tiles it is meant to reveal.
 */
export default function CategoryCarousel({
  label,
  pageCount,
  children,
}: CategoryCarouselProps) {
  const trackRef = useRef<HTMLElement | null>(null);
  const [canPageBack, setCanPageBack] = useState(false);
  const [canPageForward, setCanPageForward] = useState(false);

  const syncArrows = useCallback(() => {
    const track = trackRef.current;

    if (track === null) return;

    if (pageCount < 2) {
      setCanPageBack(false);
      setCanPageForward(false);

      return;
    }

    const furthest = track.scrollWidth - track.clientWidth;

    setCanPageBack(track.scrollLeft > EDGE_SLACK);
    setCanPageForward(track.scrollLeft < furthest - EDGE_SLACK);
  }, [pageCount]);

  useEffect(() => {
    const track = trackRef.current;

    if (track === null) return undefined;

    syncArrows();

    // The column count changes at `md`, so the same tile count can be
    // scrollable at one width and not at the next.
    const observer = new ResizeObserver(syncArrows);

    observer.observe(track);

    return () => observer.disconnect();
  }, [syncArrows]);

  const page = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;

    if (track === null) return;

    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, []);

  return (
    <div className="relative">
      <nav
        ref={trackRef}
        aria-label={label}
        onScroll={syncArrows}
        className="no-scrollbar flex snap-x snap-mandatory gap-px overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-border"
      >
        {children}
      </nav>
      {canPageBack ? (
        <button
          type="button"
          onClick={() => page(-1)}
          aria-label={`Show previous ${label.toLowerCase()}`}
          className="absolute top-1/2 -left-3 hidden min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-ink shadow-md transition duration-200 ease-out hover:bg-surface md:flex"
        >
          <ChevronLeftIcon />
        </button>
      ) : null}
      {canPageForward ? (
        <button
          type="button"
          onClick={() => page(1)}
          aria-label={`Show more ${label.toLowerCase()}`}
          className="absolute top-1/2 -right-3 hidden min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-ink shadow-md transition duration-200 ease-out hover:bg-surface md:flex"
        >
          <ChevronRightIcon />
        </button>
      ) : null}
    </div>
  );
}
