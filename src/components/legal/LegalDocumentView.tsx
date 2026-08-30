import type { LegalBlock, LegalDocument } from '@/lib/legal/contracts';

type LegalDocumentViewProps = {
  document: LegalDocument;
};

/** `2.1 Eligibility to Use the Services` → the number and the title. */
const CLAUSE = /^(\d+\.\d+)\s+(.*)$/;

type Keyed = { key: string; block: LegalBlock };

type Group =
  | { kind: 'single'; key: string; block: LegalBlock }
  | { kind: 'list'; key: string; items: Keyed[] };

/**
 * Content-derived keys, disambiguated by how many times that exact line has
 * already appeared. A legal document repeats short lines ("You must not:"), so
 * text alone is not unique — but text plus its own occurrence number is, and it
 * stays stable across renders in a way a bare array index does not promise.
 */
function keyer() {
  const seen = new Map<string, number>();

  return (block: LegalBlock): string => {
    const base = `${block.kind}:${block.text.slice(0, 48)}`;
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);

    return `${base}#${count}`;
  };
}

/**
 * A run of consecutive `item` blocks is one list.
 *
 * The source is a flat sequence, but three items in a row are a list of three
 * and have to reach the browser as one `<ul>` — otherwise a screen reader
 * announces three separate one-item lists where the document has one.
 */
function grouped(blocks: LegalBlock[]): Group[] {
  const nextKey = keyer();

  return blocks.reduce<Group[]>((groups, block) => {
    const key = nextKey(block);

    if (block.kind !== 'item') {
      return [...groups, { kind: 'single', key, block }];
    }

    const last = groups[groups.length - 1];

    if (last !== undefined && last.kind === 'list') {
      last.items.push({ key, block });

      return groups;
    }

    return [...groups, { kind: 'list', key, items: [{ key, block }] }];
  }, []);
}

function Item({ block }: { block: LegalBlock }) {
  return (
    <li className="flex gap-2.5">
      {/*
        A drawn dot rather than a list marker: the source's own items are plain
        sentences, and a browser bullet at this measure sits too close to the
        text to scan. `aria-hidden` because the `<li>` already carries the
        semantics.
      */}
      <span
        aria-hidden="true"
        className="mt-[11px] size-1 shrink-0 rounded-full bg-border-strong"
      />
      <span className="text-[15px] leading-relaxed text-ink-muted">
        {block.text}
      </span>
    </li>
  );
}

function Single({ block }: { block: LegalBlock }) {
  if (block.kind === 'section') {
    return (
      <h2
        id={block.id}
        className="mt-4 scroll-mt-6 font-display text-[21px] font-semibold tracking-tight text-ink"
      >
        {block.text}
      </h2>
    );
  }

  if (block.kind === 'clause') {
    const parts = CLAUSE.exec(block.text);

    return (
      <h3 className="mt-2.5 flex gap-2.5 text-[15px] font-semibold text-ink">
        {parts === null ? (
          block.text
        ) : (
          <>
            <span className="text-ink-faint tabular-nums">{parts[1]}</span>
            <span>{parts[2]}</span>
          </>
        )}
      </h3>
    );
  }

  return (
    <p className="text-[15px] leading-[1.75] text-ink-muted">{block.text}</p>
  );
}

/**
 * A legal document, rendered exactly as it was written.
 *
 * Every block renders its `text` as a text node. There is no markdown pass, no
 * link detection, no emphasis. That is deliberate: this is a binding agreement,
 * and a renderer that could introduce a link or a bold run could change what the
 * reader understands the agreement to say. The only thing this component adds is
 * the anchor id a section already carries.
 */
export default function LegalDocumentView({
  document,
}: LegalDocumentViewProps) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-[22px]">
      {grouped(document.blocks).map((group) =>
        group.kind === 'single' ? (
          <Single key={group.key} block={group.block} />
        ) : (
          <ul
            key={group.key}
            className="flex list-none flex-col gap-2.5 p-0 pl-1"
          >
            {group.items.map((item) => (
              <Item key={item.key} block={item.block} />
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
