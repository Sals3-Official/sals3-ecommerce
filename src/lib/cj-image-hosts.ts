/**
 * The CJdropshipping hosts allowed to serve product imagery.
 *
 * This lives in its own dependency-free module on purpose. Two very different
 * callers need it, and only one of them may pull the storefront mappers in:
 *
 * - `src/services/storefront/mappers.ts` re-checks every image address in a
 *   portal payload against this list before a component ever renders it;
 * - `src/lib/images/cj-image-loader.ts` is the `next/image` loader, which Next
 *   serializes into the client bundle, so anything it imports ships to the
 *   browser — importing the mappers would drag `@/lib/money` and the whole
 *   payload-mapping graph along with it.
 *
 * Keeping the list here means both read one source of truth. The portal's own
 * `src/lib/cj/image-hosts.ts` carries the same list for the same reason, and
 * `next.config.ts` `remotePatterns` must stay in step with all of them.
 */
const CJ_IMAGE_HOSTS = ['cf.cjdropshipping.com', 'oss-cf.cjdropshipping.com'];

export default CJ_IMAGE_HOSTS;
