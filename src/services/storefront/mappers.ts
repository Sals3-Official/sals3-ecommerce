import { money } from '@/lib/money';
import type {
  Category as HomeCategory,
  PlaceholderTone,
  Product as HomeProduct,
} from '@/lib/home-placeholder-data';
import type {
  ProductDetail,
  ProductImage,
  ProductOptionAxis,
  ProductVariant,
} from '@/lib/product-detail';
import type {
  Product,
  ProductCategory,
  ProductPayloadDetail,
  ProductVariantPayload,
} from './schemas';

/**
 * Payload → view model. Pure functions; no fetching, no formatting.
 *
 * ## What these deliberately no longer do
 *
 * They used to synthesise `oldPrice` as `Math.max(oldPriceMinor, priceMinor)`,
 * which turned "no comparison price" into a comparison price equal to the
 * current one — harmless on the card (the badge needs strictly greater) but a
 * value the rest of the app then had to keep reasoning about. `oldPrice` is now
 * absent unless the portal sends a genuinely higher one.
 *
 * The `tone` gradient is the one invented value that stays: it is a placeholder
 * *background*, chosen only when there is no image, and it claims nothing about
 * the product.
 */

/**
 * Hosts whose images this app will render. Mirrors `next.config.ts`'s
 * `images.remotePatterns` and the portal's own `lib/cj/image-hosts.ts` — all
 * three must agree, and a URL that reaches here is still re-checked because a
 * payload is data, not a promise.
 */
const PRODUCT_IMAGE_HOSTS = [
  'cf.cjdropshipping.com',
  'oss-cf.cjdropshipping.com',
];

const PRODUCT_TONES: PlaceholderTone[] = ['ocean', 'dusk', 'meadow', 'clay'];

function toneFor(index: number): PlaceholderTone {
  return PRODUCT_TONES[index % PRODUCT_TONES.length]!;
}

export function getAllowedProductImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (url === null || url === undefined) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol === 'https:' &&
      PRODUCT_IMAGE_HOSTS.includes(parsedUrl.hostname)
    ) {
      return parsedUrl.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function toHomeProduct(product: Product, index: number): HomeProduct {
  const oldPrice =
    product.oldPriceMinor !== undefined &&
    product.oldPriceMinor > product.priceMinor
      ? money(product.oldPriceMinor, product.currency)
      : undefined;

  return {
    id: product.slug,
    title: product.title,
    price: money(product.priceMinor, product.currency),
    ...(oldPrice === undefined ? {} : { oldPrice }),
    ratingLine: product.ratingLine ?? 'No reviews yet',
    shipLine: product.shipLine ?? 'Delivery quoted at checkout',
    tone: toneFor(index),
    imageUrl: getAllowedProductImageUrl(product.imageUrl),
    imageAlt: product.imageAlt,
  };
}

export function toHomeCategory(category: ProductCategory): HomeCategory {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
  };
}

function toProductVariant(variant: ProductVariantPayload): ProductVariant {
  return {
    id: variant.id,
    sku: variant.sku,
    price: money(variant.priceMinor, variant.currency),
    availability: variant.availability,
    ...(variant.options === undefined || variant.options.length === 0
      ? {}
      : { options: variant.options }),
  };
}

/**
 * The option axes a selector needs, derived from the variants.
 *
 * Order is first-seen: the portal returns each variant's options in the
 * seller's own `position` order, so following it keeps "Colour" before "Size"
 * without a second source of truth that could disagree about which values
 * exist.
 */
export function toProductOptionAxes(
  variants: ProductVariant[],
): ProductOptionAxis[] {
  const axes = new Map<string, string[]>();

  variants.forEach((variant) => {
    (variant.options ?? []).forEach((option) => {
      const values = axes.get(option.name) ?? [];

      if (!values.includes(option.value)) values.push(option.value);

      axes.set(option.name, values);
    });
  });

  return [...axes.entries()].map(([name, values]) => ({ name, values }));
}

function toProductImages(
  payload: ProductPayloadDetail,
  title: string,
): ProductImage[] {
  const fromList = (payload.images ?? [])
    .map((image) => ({
      url: getAllowedProductImageUrl(image.url),
      alt: image.alt ?? title,
    }))
    .filter((image): image is ProductImage => image.url !== undefined);

  if (fromList.length > 0) return fromList;

  // The legacy single-image field, for a portal that has not shipped `images`
  // yet. Not a duplicate of the list — a fallback for it.
  const single = getAllowedProductImageUrl(payload.imageUrl);

  return single === undefined
    ? []
    : [{ url: single, alt: payload.imageAlt ?? title }];
}

export function toProductDetail(
  product: ProductPayloadDetail,
  index = 0,
): ProductDetail {
  const images = toProductImages(product, product.title);
  const variants = (product.variants ?? []).map(toProductVariant);
  const options = toProductOptionAxes(variants);
  const oldPrice =
    product.oldPriceMinor !== undefined &&
    product.oldPriceMinor > product.priceMinor
      ? money(product.oldPriceMinor, product.currency)
      : undefined;

  return {
    id: product.slug,
    title: product.title,
    category: product.category,
    ...(product.categoryName === undefined
      ? {}
      : { categoryName: product.categoryName }),
    ...(product.categoryPath === undefined
      ? {}
      : { categoryPath: product.categoryPath }),
    price: money(product.priceMinor, product.currency),
    ...(oldPrice === undefined ? {} : { oldPrice }),
    ...(product.ratingLine === undefined
      ? {}
      : { ratingLine: product.ratingLine }),
    ...(product.shipLine === undefined ? {} : { shipLine: product.shipLine }),
    imageUrl: images[0]?.url,
    imageAlt: product.imageAlt ?? product.title,
    tone: toneFor(index),
    images,
    ...(product.availability === undefined
      ? {}
      : { availability: product.availability }),
    ...(product.description === undefined ||
    product.description.blocks.length === 0
      ? {}
      : { description: product.description.blocks }),
    ...(variants.length === 0 ? {} : { variants }),
    ...(options.length === 0 ? {} : { options }),
    ...(product.specs === undefined ? {} : { specs: product.specs }),
  };
}
