'use client';

import { useSelectedSku } from './selected-sku';

/**
 * The Sals3 SKU, printed on the specifications heading line.
 *
 * ## Why it is not a row in that grid
 *
 * The grid's footnote reads "entered by the seller against this category's
 * attribute set", and that sentence is the whole reason `ProductSpecifications`
 * exists apart from `ProductSupplierDetails`. A Sals3 SKU is entered by nobody:
 * it is minted from the provider's identifiers and is immutable after first
 * publication. Dropping it under that line would misattribute it, which is the
 * same provenance error the two sections were split to prevent.
 *
 * ## Why it sits on the heading line rather than under it
 *
 * It used to be a lone row between the heading and the grid — the one place on
 * the band that reads as a spec without being one: a horizontal run of three
 * different type sizes above a two-column table. On the heading line it is
 * unmistakably an identifier *for the band*. That placement also stops the band
 * reflowing when the code appears and disappears, because the heading holds the
 * row's height either way — which matters now that a buyer arrives with nothing
 * selected and the code is absent until they choose.
 *
 * ## Why the code is set in the page's own face
 *
 * It was `font-mono`, and no monospaced family is loaded anywhere on this site:
 * `layout.tsx` loads Plus Jakarta Sans, Outfit and Instrument Sans and nothing
 * else. The class resolved to whatever the reader's OS happened to have —
 * Consolas on Windows, Menlo on macOS — which is why the line read as pasted in
 * from somewhere else. It now uses the page's own face with tabular figures and
 * open tracking, and the sunken token carries the "this is a code you can copy"
 * signal that the borrowed family was carrying badly. Nothing is downloaded for
 * it, and it cannot drift with the reader's OS.
 *
 * ## Why it can render nothing
 *
 * There is no product-level Sals3 SKU. Every variant has its own, so a pair of
 * jeans in two colours and six sizes carries twelve of them — and since a buyer
 * now arrives with no option chosen, there is no honest code to print until they
 * choose one. Printing any one of the twelve would be right for one combination
 * and quietly wrong for the other eleven, which matters precisely because the
 * reason to show a code at all is that somebody intends to quote it.
 *
 * The selection is read from context rather than taken as a prop: the panel that
 * owns it is a client component in a different branch of `page.tsx`, and chip
 * clicks deliberately do not navigate. Outside a provider this renders nothing,
 * so no surface can print a code that no selection stands behind.
 */
export default function Sals3SkuLine() {
  const sku = useSelectedSku();

  if (sku === undefined) return null;

  return (
    <div className="flex flex-col items-start gap-0.5 sm:items-end">
      <div className="flex items-center gap-2">
        <span className="text-[13.5px] font-medium text-ink-muted">
          Sals3 SKU
        </span>
        <span className="rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[13px] font-semibold tracking-[0.04em] text-ink tabular-nums">
          {sku}
        </span>
      </div>
      <span className="text-xs text-ink-subtle">
        Sals3&rsquo;s own code for the option selected above. Searchable.
      </span>
    </div>
  );
}
