'use client';

import { useSelectedSku } from './selected-sku';

/**
 * The Sals3 SKU, printed above the seller's attribute grid.
 *
 * ## Why it is not a row in that grid
 *
 * The grid's footnote reads "entered by the seller against this category's
 * attribute set", and that sentence is the whole reason `ProductSpecifications`
 * exists apart from `ProductSupplierDetails`. A Sals3 SKU is entered by nobody:
 * it is minted from the provider's identifiers and is immutable after first
 * publication. Dropping it under that line would misattribute it, which is the
 * same provenance error the two sections were split to prevent — so it sits
 * above the grid with its own sentence.
 *
 * ## Why it follows the option chips
 *
 * There is no product-level Sals3 SKU. Every variant has its own, so a pair of
 * jeans in two colours and six sizes carries twelve of them, and a static code
 * would be right for one combination and quietly wrong for the other eleven —
 * which matters precisely because the reason to show a code is that somebody
 * intends to quote it. The server prints the code for the variant this request
 * resolved, and the panel republishes it on every chip click.
 */
export default function Sals3SkuLine({
  fallbackSku,
}: {
  /** Server-resolved SKU, used until the panel publishes and if it never does. */
  fallbackSku?: string;
}) {
  const sku = useSelectedSku() ?? fallbackSku;

  if (sku === undefined) return null;

  return (
    <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="text-sm text-ink-subtle">Sals3 SKU</span>
      <span className="font-mono text-sm tracking-tight text-ink tabular-nums">
        {sku}
      </span>
      <span className="text-xs text-ink-subtle">
        Sals3&rsquo;s own code for the option selected above. Searchable.
      </span>
    </div>
  );
}
