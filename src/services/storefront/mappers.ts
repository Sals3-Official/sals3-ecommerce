import CJ_IMAGE_HOSTS from '@/lib/cj-image-hosts';
import R2_IMAGE_HOST from '@/lib/r2-image-host';
import { money } from '@/lib/money';
import type {
  Category as HomeCategory,
  PlaceholderTone,
  Product as HomeProduct,
} from '@/lib/home-placeholder-data';
import type {
  ProductDescriptionBlock,
  ProductDetail,
  ProductImage,
  ProductOptionAxis,
  ProductVariant,
} from '@/lib/product-detail';
import type {
  Product,
  ProductCategory,
  ProductDescriptionBlock as ProductDescriptionBlockPayload,
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

const PRODUCT_TONES: PlaceholderTone[] = ['ocean', 'dusk', 'meadow', 'clay'];

function toneFor(index: number): PlaceholderTone {
  return PRODUCT_TONES[index % PRODUCT_TONES.length]!;
}

/**
 * Hosts whose images this app will render: the CJ CDN hosts (supplier
 * originals) plus the configured Cloudflare R2 public host (the seller's own
 * uploads, `NEXT_PUBLIC_R2_IMAGE_BASE_URL`). Both come from dependency-free
 * modules `src/lib/images/cj-image-loader.ts` can also read.
 * `next.config.ts`'s `images.remotePatterns` and the portal's own allow-lists
 * must agree with them, and a URL that reaches here is still re-checked
 * because a payload is data, not a promise.
 */
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
      (CJ_IMAGE_HOSTS.includes(parsedUrl.hostname) ||
        (R2_IMAGE_HOST !== null && parsedUrl.hostname === R2_IMAGE_HOST))
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
    ...(variant.label === undefined ? {} : { label: variant.label }),
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

/**
 * Description blocks, with each image block re-checked against the host
 * allow-list — the same gate the gallery goes through, applied per block so a
 * disallowed or malformed image address costs that photo, never the seller's
 * words around it. `alt` falls back to the product title, the same non-claim
 * the gallery uses when the portal supplies no per-image text.
 */
export function toDescriptionBlocks(
  blocks: ProductDescriptionBlockPayload[],
  title: string,
): ProductDescriptionBlock[] {
  return blocks.flatMap((block): ProductDescriptionBlock[] => {
    if (block.type !== 'image') return [block];

    const url = getAllowedProductImageUrl(block.url);

    if (url === undefined) return [];

    return [
      {
        type: 'image',
        url,
        alt: block.alt ?? title,
        ...(block.caption === undefined ? {} : { caption: block.caption }),
      },
    ];
  });
}

export function toProductDetail(
  product: ProductPayloadDetail,
  index = 0,
): ProductDetail {
  const images = toProductImages(product, product.title);
  const descriptionBlocks =
    product.description === undefined
      ? []
      : toDescriptionBlocks(product.description.blocks, product.title);
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
    ...(product.publishedAt === undefined
      ? {}
      : { publishedAt: product.publishedAt }),
    ...(product.availability === undefined
      ? {}
      : { availability: product.availability }),
    ...(descriptionBlocks.length === 0
      ? {}
      : { description: descriptionBlocks }),
    ...(variants.length === 0 ? {} : { variants }),
    ...(options.length === 0 ? {} : { options }),
    ...(product.specs === undefined ? {} : { specs: product.specs }),
    // Absent and empty are kept apart here as everywhere else: a product whose
    // every attribute is unanswered arrives as `[]` from `salvagedArray`, and
    // an empty array must not become a heading over nothing.
    ...(product.specification === undefined ||
    product.specification.length === 0
      ? {}
      : { specification: product.specification }),
    ...(product.metaDescription === undefined
      ? {}
      : { metaDescription: product.metaDescription }),
  };
}
