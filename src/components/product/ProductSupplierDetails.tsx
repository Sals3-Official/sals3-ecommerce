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
 * ## Deliberately demoted
 *
 * A 16px bold heading against the other sections' 20px display type, and
 * 13.5px rows against their 14px. These are claims Sals3 **repeats** rather
 * than facts it holds, and the hierarchy should say so before the footnote
 * does. Product specifications — the seller's own declarations — outranks this.
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
      label: 'Weight',
      value: `${specs.weightGrams.toLocaleString('en-US')} g`,
    });
  }
  if (
    specs.lengthMillimeters !== undefined ||
    specs.widthMillimeters !== undefined ||
    specs.heightMillimeters !== undefined
  ) {
    rows.push({
      label: 'Dimensions',
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
    <section className="mt-10">
      <h2 className="text-base font-bold tracking-[-0.01em] text-ink">
        Supplier details
      </h2>
      <dl className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 px-4.5 py-3 sm:flex-row sm:gap-4"
          >
            <dt className="text-[13.5px] text-ink-subtle sm:w-55 sm:shrink-0">
              {row.label}
            </dt>
            <dd className="text-[13.5px] text-ink tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      {/*
        Provenance, and the one sentence that must not appear over
        `ProductSpecifications`: these values are what the supplier reported,
        and the storefront is repeating a claim it did not measure.
      */}
      <p className="mt-2 max-w-[80ch] text-xs leading-relaxed text-ink-subtle">
        As reported by the supplier.
      </p>
    </section>
  );
}
