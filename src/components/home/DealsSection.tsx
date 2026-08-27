import Link from 'next/link';
import type { Product } from '@/lib/home-placeholder-data';
import ProductCard from '@/components/home/ProductCard';
import type { MarketSegment } from '@/lib/destination/markets';

type DealsSectionProps = {
  deals: Product[];
  market: MarketSegment;
};

export default function DealsSection({ deals, market }: DealsSectionProps) {
  // A "Deals" heading with nothing under it is worse than no section. An empty
  // catalogue is a real, reachable state now that the feed reads published
  // products, so this returns nothing rather than an empty grid.
  if (deals.length === 0) return null;

  return (
    <section className="mt-6.5" aria-labelledby="deals-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 id="deals-heading" className="text-xl font-bold">
            Deals
          </h2>
          {/*
            No end date is claimed. The previous "Ends 4 August, 23:59" was
            hardcoded — a deadline no promotion entity exists to back, printed
            on a live page.
          */}
        </div>
        <Link href="/deals" className="text-sm">
          See all deals
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {deals.map((product) => (
          <ProductCard key={product.id} product={product} market={market} />
        ))}
      </div>
    </section>
  );
}
