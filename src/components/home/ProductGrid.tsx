import type { Product } from '@/lib/home-placeholder-data';
import SponsoredCarousel from '@/components/ads/SponsoredCarousel';
import ProductCard from '@/components/home/ProductCard';

/**
 * `slotKey` is a property of the slot, not of what fills it. The slot's content
 * is now a carousel over the whole campaign rather than one creative, so there
 * is nothing creative-shaped left to key on.
 */
type GridItem =
  { kind: 'product'; product: Product } | { kind: 'ad'; slotKey: string };

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
          <SponsoredCarousel key={item.slotKey} variant="card" />
        ),
      )}
    </div>
  );
}
