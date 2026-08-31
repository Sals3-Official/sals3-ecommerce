import type { ReactNode } from 'react';
import type {
  ProductDescriptionBlock,
  ProductDescriptionRun,
} from '@/lib/product-detail';
import DescriptionImageRow from './DescriptionImageRow';
import DescriptionTable from './DescriptionTable';

type DescriptionBlockListProps = {
  blocks: ProductDescriptionBlock[];
  /** Layout only. The caller owns the surrounding section and its heading. */
  className?: string;
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
 * A paragraph's text, with the emphasis the seller applied inside it.
 *
 * `runs` are used only when they join back to exactly `text`. The portal
 * enforces that join on write, but this is a read path over payloads written
 * by older deployments, and a run list that disagrees with `text` would put
 * different words on the page than the ones stored — a worse failure than
 * losing the bold. `text` is the canonical value; the runs are how it is
 * marked up, so when the two disagree the canonical one wins.
 *
 * `strong` and `em` are the only marks in the union, and both render as
 * elements rather than styles: a buyer using a screen reader should hear the
 * emphasis the seller wrote, not see it silently become plain prose.
 */
function paragraphContent(
  text: string,
  runs?: ProductDescriptionRun[],
): ReactNode {
  if (runs === undefined || runs.length === 0) return text;

  if (runs.map((run) => run.text).join('') !== text) return text;

  return runs.map((run, index) => {
    // Index keys: runs are positional by definition and this list is
    // re-rendered whole, never reordered.
    const key = `run-${index}`;
    const marks = run.marks ?? [];
    const strong = marks.includes('strong');
    const em = marks.includes('em');

    if (strong && em) {
      return (
        <strong key={key}>
          <em>{run.text}</em>
        </strong>
      );
    }

    if (strong) return <strong key={key}>{run.text}</strong>;
    if (em) return <em key={key}>{run.text}</em>;

    return <span key={key}>{run.text}</span>;
  });
}

/**
 * The blocks of one description document, and nothing around them.
 *
 * Extracted from `ProductDescription` when the order page needed to render a
 * *frozen* description — the copy of the document taken when the order was
 * placed. Two renderers for one allow-listed block union would drift, and the
 * one that drifted would be the order page's: nobody looks at it until a buyer
 * is already worried about something.
 *
 * There is no `html` block and no `dangerouslySetInnerHTML` here, and there must
 * never be. CJ's own product `description` **is** unsanitised supplier HTML; the
 * portal deliberately never puts it in the content document, and this renderer
 * has no branch that could interpret a string as markup even if it arrived.
 * Every text block below is placed by React, which escapes it, and an `image`
 * block's address has already passed the mapper's host allow-list.
 */
export default function DescriptionBlockList({
  blocks,
  className = 'flex flex-col gap-4.5',
}: DescriptionBlockListProps) {
  return (
    <div className={className}>
      {groupBlocks(blocks).map((group, groupIndex) => {
        // Index-based keys: blocks have no ids, and this list is never
        // reordered or filtered — it is re-rendered whole from one payload.
        const first = group[0];
        const key = `${first?.type}-${groupIndex}`;

        if (first === undefined) return null;

        /*
          Image rows break out of the reading column and run the full section
          width; text stays at 70ch. A photo held to a measure sized for prose
          is smaller than it needs to be, and a line of prose run to the
          section's full width stops being readable — so the two get different
          widths rather than a compromise that suits neither. No card around a
          card: the row is the widest thing here, not a panel inside a panel.
        */
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
            /*
              `whitespace-pre-line` because a paragraph's single newlines are
              the seller's, deliberately. The portal keeps them inside the block
              rather than splitting on them — its own comment gives the reason,
              "a heading line, then one line per feature" — so the `
` survives
              the editor, the document, and the database, and HTML collapsing it
              to a space here was the only place the seller's layout was lost. A
              features list rendered as one run-on line while a size chart on the
              same page came out right, because that one is written with blank
              lines and becomes separate blocks.

              `pre-line` rather than `pre-wrap`: it honours newlines and still
              collapses runs of spaces, which is exactly the contract the portal
              describes. `pre-wrap` would also publish accidental double spaces
              and leading indentation nobody typed on purpose.
            */
            <p
              key={key}
              className="max-w-[70ch] text-[15px] leading-[1.7] whitespace-pre-line text-ink-muted text-pretty"
            >
              {paragraphContent(block.text, block.runs)}
            </p>
          );
        }

        if (block.type === 'heading') {
          // Only h2/h3 exist in the union — the product title owns the page's
          // single h1.
          return block.level === 2 ? (
            <h3
              key={key}
              className="max-w-[70ch] font-display text-base font-semibold text-ink"
            >
              {block.text}
            </h3>
          ) : (
            <h4
              key={key}
              className="max-w-[70ch] text-sm font-semibold text-ink"
            >
              {block.text}
            </h4>
          );
        }

        /*
          A table leaves the reading column for the same reason an image row
          does, and more urgently: 70ch is sized for sentences, and a
          six-column size chart held to it collapses into wrapped headings and
          numbers that no longer line up — which is the one property that made
          it worth being a table. The component owns its own horizontal
          scroller; see its header for why the first column sticks.
        */
        if (block.type === 'table') {
          return <DescriptionTable key={key} block={block} />;
        }

        if (block.type === 'bulletList') {
          return (
            <ul
              key={key}
              className="max-w-[70ch] list-disc pl-5 text-[15px] leading-[1.7] text-ink-muted marker:text-ink-subtle"
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
          <dl key={key} className="flex max-w-[70ch] flex-col gap-2.5">
            {block.entries.map((entry) => (
              <div
                key={entry.label}
                className="flex flex-col gap-0.5 sm:grid sm:grid-cols-[minmax(0,9.375rem)_minmax(0,1fr)] sm:gap-5"
              >
                <dt className="text-sm text-ink-subtle">{entry.label}</dt>
                <dd className="text-sm text-ink">{entry.value}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </div>
  );
}
