import type { ProductSpecs } from '@/lib/product-detail';

type ProductSupplierDetailsProps = {
  specs?: ProductSpecs;
};

const CONDITION_LABELS: Record<
  NonNullable<ProductSpecs['condition']>,
  string
> = {
  NEW: 'New',
  REFURBISHED: 'Refurbished',
  USED: 'Used',
};

function millimetresToCentimetres(value: number): string {
  return `${(value / 10).toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })} cm`;
}

/**
 * The product's physical and identifier facts, as the supplier reported them.
 *
 * ## It used to be deliberately demoted
 *
 * A 16px bold heading against the other sections' 20px display type, 13.5px
 * rows against their 14px, and a rounded card of its own on the page's grey
 * ground. The reasoning was that these are claims Sals3 **repeats** rather than
 * facts it holds, so the hierarchy should say so before the footnote does.
 *
 * The owner overruled it on 2026-08-31 — *"sobrang awkward ng design"* — and
 * they were right about what it looked like: the card sat below a full-bleed
 * white band with a strip of grey between them, so the page read as a table,
 * then a gap, then a smaller table in a box, for two halves of one subject.
 * It now takes the same format as `ProductSpecifications` — same heading size,
 * same grid, same row rule — in a band that shares the hairline above it.
 *
 * What that costs: the footnote below is now the only thing separating a
 * supplier's claim from a seller's declaration. See the note beside it.
 *
 * ## No SKU row
 *
 * `specs.sku` is an `S3V-<hex>` digest. It identified nothing for a buyer, and
 * rendering it here was the same defect as putting the variant hash on an
 * option chip, one section lower down the page. It stays on the payload for
 * cart and order plumbing and stays off this table.
 *
 * ## No brand row
 *
 * A brand is the seller's own claim about the product, so it renders in
 * `ProductSpecifications` even though it arrives on this technical payload.
 * Keeping it here would put a seller declaration under "as reported by the
 * supplier".
 *
 * Every row is present only when the portal sent that field. No "—", no "N/A":
 * an absent row says nobody recorded the fact, which is different from
 * recording that it is unknown. Renders `null` when there is nothing at all.
 */
export default function ProductSupplierDetails({
  specs,
}: ProductSupplierDetailsProps) {
  if (specs === undefined) return null;

  const rows: { label: string; value: string }[] = [];

  if (specs.weightGrams !== undefined) {
    rows.push({
      label: 'Package weight',
      value: `${specs.weightGrams.toLocaleString('en-US')} g`,
    });
  }
  if (
    specs.lengthMillimeters !== undefined ||
    specs.widthMillimeters !== undefined ||
    specs.heightMillimeters !== undefined
  ) {
    rows.push({
      label: 'Package dimensions',
      value: [
        specs.lengthMillimeters,
        specs.widthMillimeters,
        specs.heightMillimeters,
      ]
        .filter((value): value is number => value !== undefined)
        .map(millimetresToCentimetres)
        .join(' × '),
    });
  }
  if (specs.condition !== undefined) {
    rows.push({
      label: 'Condition',
      value: CONDITION_LABELS[specs.condition],
    });
  }
  if (specs.mpn !== undefined) {
    rows.push({ label: 'Manufacturer part number', value: specs.mpn });
  }
  if (specs.gtins !== undefined && specs.gtins.length > 0) {
    rows.push({ label: 'GTIN', value: specs.gtins.join(', ') });
  }

  if (rows.length === 0) return null;

  return (
    /*
      `border-b` only. The band above closes with its own bottom border, so the
      two share one hairline instead of stacking two, and the pair reads as one
      white region divided rather than as two slabs with a grey seam.
    */
    <section className="border-b border-border bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-9">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
          Supplier details
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,8.625rem)_minmax(0,1fr)] gap-4 border-b border-border py-2.5"
            >
              <dt className="text-sm text-ink-subtle">{row.label}</dt>
              <dd className="text-sm text-ink tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        {/*
          Provenance, and now the **only** thing keeping these two tables apart.

          It was never carrying that alone: the heading and the rows were a size
          smaller than the section above, so the hierarchy said "repeated, not
          held" before this sentence did. The owner removed both the demotion
          and the specifications footnote on 2026-08-31, which leaves one
          sentence doing the whole job — so it must stay directly under this
          grid, and it must never be moved, shortened to "as reported", or
          allowed to sit where it could read as covering the seller's
          declarations above.
        */}
        <p className="mt-4 max-w-[80ch] text-xs leading-relaxed text-ink-subtle">
          As reported by the supplier. Weight and dimensions are the packed
          parcel, not the product itself.
        </p>
      </div>
    </section>
  );
}
