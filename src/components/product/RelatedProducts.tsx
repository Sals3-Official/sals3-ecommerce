import type { Product } from '@/lib/home-placeholder-data';
import ProductGrid from '@/components/home/ProductGrid';
import type { MarketSegment } from '@/lib/destination/markets';

type RelatedProductsProps = {
  products: Product[];
  market: MarketSegment;
};

export default function RelatedProducts({
  products,
  market,
}: RelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-10 border-t border-border pt-6"
      aria-labelledby="related-products-heading"
    >
      <h2 id="related-products-heading" className="mb-3 text-xl font-bold">
        Related products
      </h2>
      <ProductGrid
        items={products.map((product) => ({ kind: 'product', product }))}
        market={market}
      />
    </section>
  );
}
