import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CategoryCarousel from './CategoryCarousel';

/**
 * jsdom does no layout, so `scrollWidth`/`clientWidth` are 0 and the arrows
 * would never appear. These stubs stand in for a track that is exactly three
 * pages wide, which is what 21 tiles at five columns actually is.
 */
const PAGE_WIDTH = 900;
const TRACK_WIDTH = PAGE_WIDTH * 3;

function renderCarousel(scrollLeft = 0, pageCount = 3) {
  const view = render(
    <CategoryCarousel label="Categories" pageCount={pageCount}>
      <a href="/c/electronics">Electronics</a>
    </CategoryCarousel>,
  );
  const track = screen.getByRole('navigation', { name: 'Categories' });

  Object.defineProperties(track, {
    clientWidth: { value: PAGE_WIDTH, configurable: true },
    scrollWidth: { value: TRACK_WIDTH, configurable: true },
    scrollLeft: { value: scrollLeft, writable: true, configurable: true },
  });
  track.scrollBy = vi.fn();

  // The arrow state is read from the track, so it settles on the first
  // scroll/resize tick rather than on mount with a zero-size element.
  fireEvent.scroll(track);

  return { ...view, track };
}

describe('CategoryCarousel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('offers only the forward arrow at the start of the track', () => {
    renderCarousel(0);

    expect(
      screen.getByRole('button', { name: /show more categories/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /show previous categories/i }),
    ).not.toBeInTheDocument();
  });

  it('offers both arrows mid-track', () => {
    renderCarousel(PAGE_WIDTH);

    expect(
      screen.getByRole('button', { name: /show previous categories/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show more categories/i }),
    ).toBeInTheDocument();
  });

  it('drops the forward arrow at the end instead of leaving a dead control', () => {
    renderCarousel(TRACK_WIDTH - PAGE_WIDTH);

    expect(
      screen.queryByRole('button', { name: /show more categories/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show previous categories/i }),
    ).toBeInTheDocument();
  });

  it('pages by exactly one track width in each direction', () => {
    const { track } = renderCarousel(PAGE_WIDTH);

    fireEvent.click(
      screen.getByRole('button', { name: /show more categories/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /show previous categories/i }),
    );

    expect(track.scrollBy).toHaveBeenNthCalledWith(1, {
      left: PAGE_WIDTH,
      behavior: 'smooth',
    });
    expect(track.scrollBy).toHaveBeenNthCalledWith(2, {
      left: -PAGE_WIDTH,
      behavior: 'smooth',
    });
  });

  it('jumps without animation when the visitor asks for reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);

    const { track } = renderCarousel(0);

    fireEvent.click(
      screen.getByRole('button', { name: /show more categories/i }),
    );

    expect(track.scrollBy).toHaveBeenCalledWith({
      left: PAGE_WIDTH,
      behavior: 'auto',
    });
  });

  it('shows no arrows when there is only one page', () => {
    // Mid-track scroll offsets, which would otherwise light both arrows.
    renderCarousel(PAGE_WIDTH, 1);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
