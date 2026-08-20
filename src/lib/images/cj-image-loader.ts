'use client';

import CJ_IMAGE_HOSTS from '@/lib/cj-image-hosts';

/**
 * The `next/image` loader for the whole storefront (`next.config.ts`
 * `images.loaderFile`).
 *
 * Why a custom loader exists at all: the default loader routes every image
 * through Vercel's `/_next/image` optimizer, and that optimizer is metered.
 * When the account's Image Optimization allowance ran out, *every* request to
 * it began answering `402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` — verified
 * against production on 2026-08-14, including `?url=%2Fsals3-logo.webp`, a file
 * this app serves itself, so the failure was the optimizer and not any one
 * upstream host. Every product photo, every gallery thumbnail, and the brand
 * mark in the header rendered as a broken image; the few that still appeared
 * were `x-vercel-cache: HIT`s from before the allowance ran out. The portal hit
 * the identical failure a day earlier and fixed it the same way.
 *
 * Rather than pay for the optimizer or ship unresized originals, this loader
 * hands the resizing to CJ's own CDN, which already does it for free. Both
 * allow-listed hosts honour Alibaba-OSS `x-oss-process` instructions; measured
 * against a real product image on 2026-08-14:
 *
 * | request                                       | bytes   |
 * | --------------------------------------------- | ------- |
 * | original                                      | 491,243 |
 * | `image/resize,w_640/format,webp/quality,q_75` |  30,006 |
 * | `image/resize,w_128/format,webp/quality,q_75` |   2,156 |
 *
 * Those are the gallery's main photo and its 80px thumbnail, in WebP, off a CDN
 * that answers `cache-control: public, max-age=31536000`.
 *
 * Note what this does NOT do: it never proxies, and it never invents a host. A
 * non-CJ address — a local `/public` path, a seller upload on the Cloudflare
 * R2 public host, anything else — is returned untouched, so the browser
 * fetches exactly what the component asked for. (R2 has no `x-oss-process`
 * analogue; the portal already re-encodes every seller upload to a ≤2000px
 * WebP at write time, so the untouched original is the optimized rendition.)
 * The loader therefore cannot be turned into an open image proxy, and it is
 * not the security boundary for remote imagery either:
 * `getAllowedProductImageUrl` in `src/services/storefront/mappers.ts` drops
 * any address off `CJ_IMAGE_HOSTS` + the configured R2 host as the payload is
 * mapped, before a component sees it, and `next.config.ts` `remotePatterns`
 * still carries the same list.
 */

/** Instruction pipeline CJ's CDN understands. Unsupported params are ignored by the CDN, which then serves the original. */
const OSS_PROCESS_PARAM = 'x-oss-process';

/** Matches the default `images.qualities` entry Next uses when a component sets no `quality`. */
const DEFAULT_QUALITY = 75;

type ImageLoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

/**
 * True only for an absolute `https:` address on an allow-listed CJ host.
 *
 * Relative sources (`/home-promos/air-cooler.png`) throw in `new URL` without a
 * base and are meant to fail this check, so the caller returns them unchanged.
 */
function cjImageAddress(src: string): URL | null {
  let url: URL;

  try {
    url = new URL(src);
  } catch {
    return null;
  }

  return url.protocol === 'https:' && CJ_IMAGE_HOSTS.includes(url.hostname)
    ? url
    : null;
}

export default function cjImageLoader({
  src,
  width,
  quality,
}: ImageLoaderArgs): string {
  const url = cjImageAddress(src);

  if (url === null) return src;

  // `set`, not string concatenation: a stored address may already carry a query
  // string, and a second `x-oss-process` would make the CDN reject the request.
  url.searchParams.set(
    OSS_PROCESS_PARAM,
    `image/resize,w_${width}/format,webp/quality,q_${quality ?? DEFAULT_QUALITY}`,
  );

  return url.toString();
}
