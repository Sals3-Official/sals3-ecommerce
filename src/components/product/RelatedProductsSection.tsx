import { unstable_cache as unstableCache } from 'next/cache';
import RelatedProducts from '@/components/product/RelatedProducts';
import type { Product as HomeProduct } from '@/lib/home-placeholder-data';
import { fetchProductsByCategory, toHomeProduct } from '@/services/products';

const RELATED_PRODUCT_COUNT = 6;

const getCachedRelatedProducts = unstableCache(
  async (
    category: string,
    excludeId: string,
    limit: number,
  ): Promise<HomeProduct[]> => {
    const products = await fetchProductsByCategory(category, {
      limit: limit + 1,
    });

    return products
      .filter((product) => product.slug !== excludeId)
      .slice(0, limit)
      .map(toHomeProduct);
  },
  ['pdp-related-products'],
  { revalidate: 30, tags: ['pdp-related-products'] },
);

/**
 * Related products are best-effort and deliberately short-cached: the main PDP
 * product stays live, while this non-critical rail stops re-scanning the
 * storefront lists on every variant URL.
 */
async function getRelatedProducts(
  category: string,
  excludeId: string,
): Promise<HomeProduct[]> {
  try {
    return await getCachedRelatedProducts(
      category,
      excludeId,
      RELATED_PRODUCT_COUNT,
    );
  } catch {
    return [];
  }
}

/**
 * The related rail, fetched on its own clock behind the page's one `<Suspense>`.
 *
 * Moved out of `p/[id]/page.tsx` on 2026-09-01 when it stopped being awaited
 * with the product. On a cold `pdp-related-products` cache this is up to four
 * *serial* Portal round trips — two sections × two pages, serialised on purpose
 * in `collectAllProducts` — and holding the buy box behind them was the largest
 * single contributor to the 1,682ms a cold product page measured in production.
 *
 * It is its own module rather than a local function for two reasons. The
 * `await` has to happen *inside* the boundary or nothing streams, and a nested
 * async component is not renderable by `@testing-library/react`, which drives
 * the page test — a module can be mocked, a local function cannot.
 */
export default async function RelatedProductsSection({
  category,
  excludeId,
}: {
  category: string;
  excludeId: string;
}) {
  const products = await getRelatedProducts(category, excludeId);

  return <RelatedProducts products={products} />;
}

/**
 * Holds the section's place while it streams.
 *
 * The heading is real: whether there are related products is unknown, but that
 * the section is being looked for is not. If the read comes back empty
 * `RelatedProducts` renders `null` and this disappears — acceptable at the very
 * bottom of the page, where nothing below it can be pushed around.
 */
export function RelatedProductsSectionSkeleton() {
  return (
    <section className="mt-10 border-t border-border pt-6" aria-busy>
      <h2 className="mb-3 text-xl font-bold">Related products</h2>
      <div className="animate-s3pulse grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {['a', 'b', 'c', 'd', 'e'].map((slot) => (
          <div
            key={slot}
            aria-hidden
            className="overflow-hidden rounded-xl border border-border bg-white"
          >
            <span className="block aspect-square w-full bg-surface-sunken" />
            <div className="flex flex-col gap-1.5 px-2.5 pt-2.5 pb-3">
              <span className="block h-[7px] w-[86%] rounded bg-surface-sunken-strong" />
              <span className="block h-[13px] w-[54%] rounded bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
