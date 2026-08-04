import Link from 'next/link';
import type { Product } from '@/lib/home-placeholder-data';
import ProductCard from '@/components/home/ProductCard';

type DealsSectionProps = {
  deals: Product[];
};

export default function DealsSection({ deals }: DealsSectionProps) {
  return (
    <section className="mt-6.5" aria-labelledby="deals-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 id="deals-heading" className="text-xl font-bold">
            Deals
          </h2>
          <span className="text-xs text-ink-subtle">Ends 4 August, 23:59</span>
        </div>
        <Link href="/deals" className="text-sm">
          See all deals
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {deals.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
