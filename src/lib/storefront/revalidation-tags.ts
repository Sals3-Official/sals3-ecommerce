/**
 * The cache tags the Portal is allowed to expire on this storefront.
 *
 * Kept in their own module, importable from both the fetch policy that
 * *declares* the tags and the route handler that *expires* them, so the two can
 * never drift into naming a tag differently — a tag that nothing invalidates is
 * exactly the state `services/storefront/client.ts` warned about before this
 * existed.
 */

/** Every cached product-page read carries this. */
export const STOREFRONT_PRODUCT_TAG = 'storefront-product';

/**
 * One product's own tag, so a publish or a pause expires that listing rather
 * than every product page at once.
 *
 * Next caps a tag at 256 characters. A slug is already bounded well below that
 * by the Portal's own slug rules, and `productTags` is the only thing that
 * builds one, so the cap is asserted here rather than trusted.
 */
export function productTag(slug: string): string {
  return `${STOREFRONT_PRODUCT_TAG}:${slug}`.slice(0, 256);
}

/** What a product-page fetch declares: the shared tag, and its own. */
export function productTags(slug: string): string[] {
  return [STOREFRONT_PRODUCT_TAG, productTag(slug)];
}

/**
 * Whether the Portal may expire this tag.
 *
 * An allow-list by prefix, not a block-list: the revalidation endpoint takes
 * tag names from a caller over the network, and without this a leaked secret
 * would let someone expire *any* tag in the application — session data, FX
 * rates, anything a future `'use cache'` block declares. Restricting it to the
 * catalogue tags keeps the blast radius to "the storefront re-reads some
 * products", which is the whole job.
 */
export function isRevalidatableTag(tag: string): boolean {
  return (
    tag === STOREFRONT_PRODUCT_TAG ||
    tag.startsWith(`${STOREFRONT_PRODUCT_TAG}:`)
  );
}
