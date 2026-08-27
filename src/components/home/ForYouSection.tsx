import type { Product } from '@/lib/home-placeholder-data';
import ProductGrid from '@/components/home/ProductGrid';
import ProductPagination from '@/components/home/ProductPagination';
import { marketHref, type MarketSegment } from '@/lib/destination/markets';

type ForYouSectionProps = {
  products: Product[];
  regionNote: string;
  market: MarketSegment;
  pagination?: {
    currentPage: number;
    totalPages: number;
  };
};

/** The same cadence the category listing uses: the slot follows a run of real
 * products rather than opening the grid, and a grid too short to have a run
 * carries no slot at all. */
const AD_SLOT_AFTER = 3;

/**
 * The section's own address, one market deep. `#for-you` keeps the jump on the
 * grid rather than the top of the home page.
 */
function pageHref(market: MarketSegment, page: number): string {
  const home = marketHref(market, '/');

  return page === 1 ? `${home}#for-you` : `${home}?page=${page}#for-you`;
}

export default function ForYouSection({
  products,
  regionNote,
  market,
  pagination,
}: ForYouSectionProps) {
  const productItems = products.map((product) => ({
    kind: 'product' as const,
    product,
  }));
  const items =
    products.length > AD_SLOT_AFTER
      ? [
          ...productItems.slice(0, AD_SLOT_AFTER),
          { kind: 'ad' as const, slotKey: 'for-you-ad' },
          ...productItems.slice(AD_SLOT_AFTER),
        ]
      : productItems;

  return (
    <section className="mt-8" aria-labelledby="for-you-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="for-you-heading" className="text-xl font-bold">
          For you
        </h2>
        <span className="text-xs text-ink-subtle">{regionNote}</span>
      </div>
      {/*
        An empty catalogue is a real, reachable state now that the feed reads
        the Sals3 catalogue: a successful response with zero published products
        is not a failure, so it does not fall back to placeholders. Without this
        the shopper gets a blank grid and no explanation — the one case where
        rendering nothing is worse than saying the true thing.
      */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-ink-muted">
          No products are listed yet. Check back soon.
        </p>
      ) : (
        <ProductGrid items={items} market={market} />
      )}
      {pagination && pagination.totalPages > 1 ? (
        <ProductPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          getPageHref={(target) => pageHref(market, target)}
        />
      ) : null}
    </section>
  );
}
