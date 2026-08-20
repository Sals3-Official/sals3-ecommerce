/**
 * The Cloudflare R2 public host allowed to serve seller-uploaded imagery —
 * the storefront's counterpart to the portal's `CLOUDFLARE_R2_PUBLIC_BASE_URL`
 * (an `r2.dev` subdomain or a custom domain bound to the bucket).
 *
 * Dependency-free, like `cj-image-hosts.ts` and for the same reason: the
 * `next/image` loader may import it, and anything the loader imports ships to
 * the browser. `NEXT_PUBLIC_` because the value is inlined at build time into
 * that client bundle — it is a public read host, not a secret.
 *
 * `null` (unset, or not a parseable https URL) means seller-uploaded images
 * are simply not renderable yet: `getAllowedProductImageUrl` drops them, the
 * same honest posture the portal's own uploader takes when its R2 env vars
 * are missing. A malformed value must never widen the allow-list.
 */
function hostnameOf(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') return null;

  try {
    const url = new URL(value);

    return url.protocol === 'https:' ? url.hostname : null;
  } catch {
    return null;
  }
}

const R2_IMAGE_HOST = hostnameOf(process.env.NEXT_PUBLIC_R2_IMAGE_BASE_URL);

export default R2_IMAGE_HOST;
