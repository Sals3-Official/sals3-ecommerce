import type { ProductDescriptionBlock } from '@/lib/product-detail';
import DescriptionBlockList from './DescriptionBlockList';

type ProductDescriptionProps = {
  blocks?: ProductDescriptionBlock[];
};

/**
 * The seller-authored description as a product-page section: the heading, the
 * spacing, and `DescriptionBlockList` for the blocks themselves.
 *
 * The block rendering moved out when the order page needed the same blocks
 * without this page's heading — see `DescriptionBlockList` for the allow-list
 * reasoning and the adjacency rule.
 *
 * Returns `null` when there are no blocks — the current state of every product,
 * because a CJ-sourced draft starts from an honestly empty document that the
 * seller fills in. An empty heading would suggest a description exists and is
 * blank.
 */
export default function ProductDescription({
  blocks,
}: ProductDescriptionProps) {
  if (blocks === undefined || blocks.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
        About this product
      </h2>
      <DescriptionBlockList
        blocks={blocks}
        className="mt-4 flex flex-col gap-4.5"
      />
    </section>
  );
}
