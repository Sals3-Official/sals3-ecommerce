import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProductVariant } from '@/lib/product-detail';
import {
  PRODUCT_VARIANT_CHANGE_EVENT,
  type ProductVariantChangeDetail,
} from '@/lib/product-variant-events';
import ProductGallery from './ProductGallery';

/**
 * The buyer-visible half of variant photos.
 *
 * A seller assigns a photo to `Black` in the Portal and expects a buyer picking
 * Black to see it. Everything between the two is plumbing; this is the only
 * place the promise is actually kept, so these cases assert the rendered
 * picture rather than any of the plumbing.
 */

const BLACK = 'https://media.example.com/seller-media/p/black.webp';
const WHITE = 'https://media.example.com/seller-media/p/white.webp';
const LEAD = 'https://media.example.com/seller-media/p/lead.webp';

const IMAGES = [
  { url: LEAD, alt: 'Jacket, front' },
  { url: BLACK, alt: 'Jacket in black' },
  { url: WHITE, alt: 'Jacket in white' },
];

function variant(id: string, imageUrl?: string): ProductVariant {
  return {
    id,
    sku: `SKU-${id}`,
    price: { amountMinor: 4299, currency: 'USD' },
    availability: 'AVAILABLE',
    ...(imageUrl === undefined ? {} : { imageUrl }),
  };
}

const VARIANTS = [
  variant('black-s', BLACK),
  variant('black-m', BLACK),
  variant('white-s', WHITE),
  variant('sizeless'),
];

/** What the option chips broadcast. The gallery is a third subscriber to it. */
function chooseVariant(variantId: string) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent<ProductVariantChangeDetail>(
        PRODUCT_VARIANT_CHANGE_EVENT,
        { detail: { variantId } },
      ),
    );
  });
}

/** The large frame, not a thumbnail: thumbnails render every photo always. */
function shownPhotoAlt(): string | null {
  return screen.getByRole('img', { name: /Jacket/ }).getAttribute('alt');
}

describe('ProductGallery following the selected variant', () => {
  it('opens on the arriving variant"s photo, not the lead image', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={VARIANTS}
        selectedVariantId="white-s"
      />,
    );

    // A shared `?variant=` link must land on the picture it promises.
    expect(shownPhotoAlt()).toBe('Jacket in white');
  });

  it('changes the photo when the buyer picks a different colour', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={VARIANTS}
        selectedVariantId="black-s"
      />,
    );

    chooseVariant('white-s');

    expect(shownPhotoAlt()).toBe('Jacket in white');
  });

  it('shows one colour"s photo for every size of it', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={VARIANTS}
        selectedVariantId="white-s"
      />,
    );

    // `black-m` carries the same address as `black-s` because the producer
    // already resolved the group. If this repository ever re-derived grouping
    // instead, this is where the two answers would part.
    chooseVariant('black-m');

    expect(shownPhotoAlt()).toBe('Jacket in black');
  });

  it('follows browser back, which the record panel answers without the event', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={VARIANTS}
        selectedVariantId="black-s"
      />,
    );

    // `handlePopState` in ProductRecordPanel updates its own state and does not
    // dispatch PRODUCT_VARIANT_CHANGE_EVENT. A gallery listening only to the
    // event would sit on Black while the panel returned to White.
    window.history.pushState({}, '', '/p/jacket?variant=white-s');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(shownPhotoAlt()).toBe('Jacket in white');
  });

  it('leaves the gallery where it is for a variant with no photo', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={VARIANTS}
        selectedVariantId="black-s"
      />,
    );

    chooseVariant('sizeless');

    // Not a reset to the lead image: the buyer chose a size, not a new picture,
    // and yanking the view back reads as the page losing their place.
    expect(shownPhotoAlt()).toBe('Jacket in black');
  });

  it('ignores a photo address the gallery does not carry', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={[variant('stale', 'https://media.example.com/gone.webp')]}
        selectedVariantId="stale"
      />,
    );

    // The two payloads are cached separately, so a variant can name a photo
    // this gallery has not got yet. That resolves to no match and must render
    // the lead image rather than an empty frame.
    expect(shownPhotoAlt()).toBe('Jacket, front');
  });

  it('renders exactly as before for a product with no variants', () => {
    render(<ProductGallery images={IMAGES} tone="ocean" />);

    // The field is optional on both sides of the wire; a consumer that never
    // receives it must be unchanged.
    expect(shownPhotoAlt()).toBe('Jacket, front');
  });
});

/**
 * A variation photo is no longer a gallery slide, and the gallery has to show it
 * anyway.
 *
 * The Portal's `loadApprovedImages` served product-level rows only from
 * 2026-08-28, because a product using variation photos properly turned its
 * gallery into twenty-one near-identical close-ups of the option the buyer had
 * not chosen yet. This component found the variant's picture with
 * `images.findIndex(...)`, so the moment that stopped being a slide the lookup
 * returned `-1` and **every** design fell back to one generic supplier cover —
 * observed live on `Knitted Tam Beanie`, 8 of 8 designs clicked.
 *
 * The strip and the picture are two different things now: the strip is the
 * curated gallery, and the frame shows the variation's own photograph whether or
 * not it is in the strip.
 */
describe('ProductGallery when the variant photo is not a gallery slide', () => {
  const FLAG_UK = 'https://media.example.com/seller-media/p/flag-uk.webp';
  const FLAG_PERU = 'https://media.example.com/seller-media/p/flag-peru.webp';

  /** Product-level photos only, exactly what the Portal now serves. */
  const CURATED = [
    { url: LEAD, alt: 'Beanie, front' },
    { url: WHITE, alt: 'Beanie, worn' },
  ];

  function design(id: string, value: string, imageUrl?: string) {
    return {
      ...variant(id, imageUrl),
      options: [{ name: 'Design', value }],
    };
  }

  const DESIGNS = [
    design('uk', 'United Kingdom', FLAG_UK),
    design('peru', 'Peru', FLAG_PERU),
    design('plain', 'Plain'),
  ];

  function shownAlt(): string | null {
    return screen.getByRole('img', { name: /Beanie/ }).getAttribute('alt');
  }

  it('shows the variation"s own photo even though no thumbnail carries it', () => {
    render(
      <ProductGallery
        images={CURATED}
        tone="ocean"
        variants={DESIGNS}
        selectedVariantId="uk"
      />,
    );

    expect(shownAlt()).toBe('Beanie, front — United Kingdom');
  });

  it('follows a chip to another design that is also not a slide', () => {
    render(
      <ProductGallery
        images={CURATED}
        tone="ocean"
        variants={DESIGNS}
        selectedVariantId="uk"
      />,
    );

    chooseVariant('peru');

    expect(shownAlt()).toBe('Beanie, front — Peru');
  });

  /**
   * The alt names the option, not the product. On a product whose whole purpose
   * is telling twenty-one designs apart, the same product title on every one of
   * them is the announcement a screen-reader user cannot navigate by.
   */
  it('names the chosen design in the alt text', () => {
    render(
      <ProductGallery
        images={CURATED}
        tone="ocean"
        variants={DESIGNS}
        selectedVariantId="peru"
      />,
    );

    expect(shownAlt()).toContain('Peru');
  });

  it('leaves the view alone for a design with no photo of its own', () => {
    render(
      <ProductGallery
        images={CURATED}
        tone="ocean"
        variants={DESIGNS}
        selectedVariantId="uk"
      />,
    );

    chooseVariant('plain');

    // Not reset to the lead image: the buyer picked an option, not a picture.
    expect(shownAlt()).toBe('Beanie, front — United Kingdom');
  });

  it('hands control back to the strip when the buyer picks a thumbnail', () => {
    render(
      <ProductGallery
        images={CURATED}
        tone="ocean"
        variants={DESIGNS}
        selectedVariantId="uk"
      />,
    );

    act(() => {
      screen.getByRole('button', { name: 'Show photo 2 of 2' }).click();
    });

    expect(shownAlt()).toBe('Beanie, worn');
  });

  /**
   * While an off-strip variation photo is showing, no thumbnail may claim to be
   * the one on screen — `aria-pressed` would be announcing a picture the frame
   * is not displaying.
   */
  it('marks no thumbnail as pressed while an off-strip photo is showing', () => {
    render(
      <ProductGallery
        images={CURATED}
        tone="ocean"
        variants={DESIGNS}
        selectedVariantId="uk"
      />,
    );

    const pressed = screen
      .getAllByRole('button', { name: /Show photo/ })
      .filter((b) => b.getAttribute('aria-pressed') === 'true');

    expect(pressed).toHaveLength(0);
  });

  /**
   * The old path still has to work: when a variant"s photo *is* a slide, the
   * index drives it and the strip highlight stays honest.
   */
  it('still uses the strip when the variant photo is one of the slides', () => {
    render(
      <ProductGallery
        images={IMAGES}
        tone="ocean"
        variants={VARIANTS}
        selectedVariantId="white-s"
      />,
    );

    const pressed = screen
      .getAllByRole('button', { name: /Show photo/ })
      .filter((b) => b.getAttribute('aria-pressed') === 'true');

    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.getAttribute('aria-label')).toBe('Show photo 3 of 3');
  });
});
