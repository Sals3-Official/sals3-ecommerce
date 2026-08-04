'use client';

import { useState } from 'react';
import type { AdSlot, Product } from '@/lib/home-placeholder-data';
import ProductCard from '@/components/home/ProductCard';
import AdCard from '@/components/home/AdCard';

type GridItem =
  { kind: 'product'; product: Product } | { kind: 'ad'; ad: AdSlot };

type LoadMoreGridProps = {
  items: GridItem[];
  initialCount: number;
};

export default function LoadMoreGrid({
  items,
  initialCount,
}: LoadMoreGridProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visibleItems.map((item) =>
          item.kind === 'product' ? (
            <ProductCard key={item.product.id} product={item.product} />
          ) : (
            <AdCard key={item.ad.id} ad={item.ad} />
          ),
        )}
      </div>
      {hasMore ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount(items.length)}
            className="rounded-lg border border-border-strong bg-white px-6.5 py-2.75 text-sm font-bold hover:border-brand-600"
          >
            Load more
          </button>
        </div>
      ) : null}
    </>
  );
}
