import type { ProductDescriptionBlock } from '@/lib/product-detail';
import DescriptionImageRow from './DescriptionImageRow';

type ProductDescriptionProps = {
  blocks?: ProductDescriptionBlock[];
};

type DescriptionImageBlock = Extract<
  ProductDescriptionBlock,
  { type: 'image' }
>;

/**
 * Consecutive image blocks fold into one row — the same adjacency rule the
 * portal's description studio previews, so "Two images side by side" (two
 * consecutive `image` blocks) renders side by side here too. Every other
 * block is its own group of one.
 */
function groupBlocks(
  blocks: readonly ProductDescriptionBlock[],
): ProductDescriptionBlock[][] {
  return blocks.reduce<ProductDescriptionBlock[][]>((groups, block) => {
    const previous = groups[groups.length - 1];
    const continuesImageRow =
      block.type === 'image' && previous?.[0]?.type === 'image';

    if (continuesImageRow && previous !== undefined) {
      return [...groups.slice(0, -1), [...previous, block]];
    }

    return [...groups, [block]];
  }, []);
}

/**
 * The seller-authored description, rendered from an allow-listed block union.
 *
 * There is no `html` block and no `dangerouslySetInnerHTML` here, and there must
 * never be. CJ's own product `description` **is** unsanitised supplier HTML;
 * the portal deliberately never puts it in the content document, and this
 * renderer has no branch that could interpret a string as markup even if it
 * arrived. Every text block below is placed by React, which escapes it, and an
 * `image` block's address has already passed the mapper's host allow-list.
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
    <section className="mt-8">
      <h2 className="text-base font-bold text-ink">About this product</h2>
      <div className="mt-3 flex flex-col gap-3">
        {groupBlocks(blocks).map((group, groupIndex) => {
          // Index-based keys: blocks have no ids, and this list is never
          // reordered or filtered — it is re-rendered whole from one payload.
          const first = group[0];
          const key = `${first?.type}-${groupIndex}`;

          if (first === undefined) return null;

          if (first.type === 'image') {
            return (
              <DescriptionImageRow
                key={key}
                images={group as DescriptionImageBlock[]}
              />
            );
          }

          const block = first;

          if (block.type === 'paragraph') {
            return (
              <p key={key} className="text-sm text-ink-muted">
                {block.text}
              </p>
            );
          }

          if (block.type === 'heading') {
            // Only h2/h3 exist in the union — the product title owns the page's
            // single h1.
            return block.level === 2 ? (
              <h3 key={key} className="text-sm font-bold text-ink">
                {block.text}
              </h3>
            ) : (
              <h4 key={key} className="text-sm font-semibold text-ink">
                {block.text}
              </h4>
            );
          }

          if (block.type === 'bulletList') {
            return (
              <ul
                key={key}
                className="list-disc pl-5 text-sm text-ink-muted marker:text-ink-faint"
              >
                {block.items.map((item) => (
                  <li key={item} className="mt-1">
                    {item}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <dl key={key} className="flex flex-col gap-1">
              {block.entries.map((entry) => (
                <div
                  key={entry.label}
                  className="flex flex-col gap-0.5 sm:flex-row sm:gap-4"
                >
                  <dt className="text-sm text-ink-muted sm:w-56 sm:shrink-0">
                    {entry.label}
                  </dt>
                  <dd className="text-sm text-ink">{entry.value}</dd>
                </div>
              ))}
            </dl>
          );
        })}
      </div>
    </section>
  );
}
