import type { AdSlot, Product } from '@/lib/home-placeholder-data';
import AdCard from '@/components/home/AdCard';
import ProductCard from '@/components/home/ProductCard';

type GridItem =
  { kind: 'product'; product: Product } | { kind: 'ad'; ad: AdSlot };

type ProductGridProps = {
  items: GridItem[];
};

export default function ProductGrid({ items }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) =>
        item.kind === 'product' ? (
          <ProductCard key={item.product.id} product={item.product} />
        ) : (
          <AdCard key={item.ad.id} ad={item.ad} />
        ),
      )}
    </div>
  );
}
