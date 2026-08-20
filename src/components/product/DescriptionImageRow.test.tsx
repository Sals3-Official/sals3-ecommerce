import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DescriptionImageRow from './DescriptionImageRow';

const SIZE_CHART = {
  type: 'image' as const,
  url: 'https://pub-5bd4708f2c2e4597ab8bd6234faae447.r2.dev/description-media/p/size-chart.webp',
  alt: 'Size chart for the shell jacket',
  caption: 'Measurements taken flat, in centimetres',
};

const COLLAR = {
  type: 'image' as const,
  url: 'https://pub-5bd4708f2c2e4597ab8bd6234faae447.r2.dev/description-media/p/collar.webp',
  alt: 'Spread collar detail',
};

describe('DescriptionImageRow', () => {
  it('renders a figure with the alt text from the payload and a lazy load', () => {
    render(<DescriptionImageRow images={[SIZE_CHART]} />);

    const image = screen.getByAltText('Size chart for the shell jacket');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('renders a caption when the seller wrote one, and no figcaption when they did not', () => {
    const { container: withCaption } = render(
      <DescriptionImageRow images={[SIZE_CHART]} />,
    );

    expect(withCaption.querySelector('figcaption')?.textContent).toBe(
      'Measurements taken flat, in centimetres',
    );

    const { container: withoutCaption } = render(
      <DescriptionImageRow images={[COLLAR]} />,
    );

    expect(withoutCaption.querySelector('figcaption')).toBeNull();
  });

  /**
   * A single image runs full width at 16:9; consecutive images share a grid at
   * 4:3. The aspect ratio is reserved either way so a mis-shaped upload cannot
   * reflow the description around it after the photo loads.
   */
  it('runs one image full width and reserves 16:9', () => {
    const { container } = render(<DescriptionImageRow images={[SIZE_CHART]} />);

    expect(container.querySelector('.aspect-video')).not.toBeNull();
    expect(container.querySelector('.grid')).toBeNull();
  });

  it('pairs two consecutive images in a grid at 4:3', () => {
    const { container } = render(
      <DescriptionImageRow images={[SIZE_CHART, COLLAR]} />,
    );

    expect(container.querySelectorAll('figure')).toHaveLength(2);
    expect(container.firstElementChild?.className).toContain('grid');
    // Stacks on mobile, pairs from the `sm` breakpoint up.
    expect(container.firstElementChild?.className).toContain('grid-cols-1');
    expect(container.firstElementChild?.className).toContain('sm:grid-cols-');
    // Matched on the class attribute rather than by selector: the Tailwind
    // arbitrary-value class `aspect-[4/3]` is not a valid CSS selector without
    // escaping that jsdom rejects outright.
    const reserved = [...container.querySelectorAll('figure > div')].filter(
      (node) => node.className.includes('aspect-[4/3]'),
    );

    expect(reserved).toHaveLength(2);
  });
});
