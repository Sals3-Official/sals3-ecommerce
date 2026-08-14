import type { ProductSpecs } from '@/lib/product-detail';

type ProductSpecsTableProps = {
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
 * The product's physical and identifier facts.
 *
 * Every row is present only when the portal sent that field. No "—", no "N/A",
 * no "Not specified": an absent row says nobody recorded the fact, which is
 * different from recording that it is unknown.
 *
 * Renders `null` when there is nothing at all, so the page has no empty
 * heading — and no reserved box that would reflow when data arrives later.
 */
export default function ProductSpecsTable({ specs }: ProductSpecsTableProps) {
  if (specs === undefined) return null;

  const rows: { label: string; value: string }[] = [];

  if (specs.brand !== undefined)
    rows.push({ label: 'Brand', value: specs.brand });
  if (specs.condition !== undefined) {
    rows.push({
      label: 'Condition',
      value: CONDITION_LABELS[specs.condition],
    });
  }
  if (specs.sku !== undefined) rows.push({ label: 'SKU', value: specs.sku });
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
  if (specs.mpn !== undefined) {
    rows.push({ label: 'Manufacturer part number', value: specs.mpn });
  }
  if (specs.gtins !== undefined && specs.gtins.length > 0) {
    rows.push({ label: 'GTIN', value: specs.gtins.join(', ') });
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-ink">Specifications</h2>
      <dl className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4"
          >
            <dt className="text-sm text-ink-muted sm:w-56 sm:shrink-0">
              {row.label}
            </dt>
            <dd className="text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      {/*
        Provenance, not a disclaimer for its own sake: these values are what the
        supplier reported, and the storefront is repeating a claim it did not
        measure.
      */}
      <p className="mt-2 text-xs text-ink-subtle">
        Specifications are as reported by the supplier.
      </p>
    </section>
  );
}
