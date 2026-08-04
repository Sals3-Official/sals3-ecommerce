import type { AdSlot, Product } from '@/lib/home-placeholder-data';
import LoadMoreGrid from '@/components/home/LoadMoreGrid';

type ForYouSectionProps = {
  products: Product[];
  ad: AdSlot;
  regionNote: string;
};

export default function ForYouSection({
  products,
  ad,
  regionNote,
}: ForYouSectionProps) {
  const items = [
    ...products
      .slice(0, 3)
      .map((product) => ({ kind: 'product' as const, product })),
    { kind: 'ad' as const, ad },
    ...products
      .slice(3)
      .map((product) => ({ kind: 'product' as const, product })),
  ];

  return (
    <section className="mt-8" aria-labelledby="for-you-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="for-you-heading" className="text-xl font-bold">
          For you
        </h2>
        <span className="text-xs text-ink-subtle">{regionNote}</span>
      </div>
      <LoadMoreGrid items={items} initialCount={5} />
    </section>
  );
}
