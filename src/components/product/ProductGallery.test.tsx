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
