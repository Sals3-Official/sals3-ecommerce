import type { AdSlot, Product } from '@/lib/home-placeholder-data';
import ProductGrid from '@/components/home/ProductGrid';
import ProductPagination from '@/components/home/ProductPagination';

type ForYouSectionProps = {
  products: Product[];
  ad: AdSlot;
  regionNote: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
  };
};

export default function ForYouSection({
  products,
  ad,
  regionNote,
  pagination,
}: ForYouSectionProps) {
  const productItems = products.map((product) => ({
    kind: 'product' as const,
    product,
  }));
  const items =
    products.length > 3
      ? [
          ...productItems.slice(0, 3),
          { kind: 'ad' as const, ad },
          ...productItems.slice(3),
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
        <ProductGrid items={items} />
      )}
      {pagination && pagination.totalPages > 1 ? (
        <ProductPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
