import type { ProductSpecs } from '@/lib/product-detail';

/**
 * The supplier's own facts about a product, as rows.
 *
 * ## Why this is a module and no longer a component
 *
 * It rendered its own white band under Product specifications until
 * 2026-08-31. The owner asked for the two to read as one thing, and they now
 * share a single band — so the markup belongs to `ProductSpecifications` and
 * what is left here is the part that was never presentational: which fields
 * count as the supplier's, and how each one reads.
 *
 * The boundary the two components existed to hold has **not** moved. It was
 * never the section: it is the sentence. `SUPPLIER_PROVENANCE` must stay
 * directly under these rows and must never be allowed to sit where it could
 * read as covering the seller's declarations above them.
 *
 * ## No SKU row
 *
 * `specs.sku` is an `S3V-<hex>` digest. It identified nothing for a buyer, and
 * rendering it here was the same defect as putting the variant hash on an
 * option chip. It stays on the payload for cart and order plumbing, and reaches
 * the buyer once, on the band's heading line.
 *
 * ## No brand row
 *
 * A brand is the seller's own claim about the product, so it renders among the
 * specifications even though it arrives on this technical payload. Keeping it
 * here would put a seller declaration under "as reported by the supplier".
 */

export type SupplierFactRow = { label: string; value: string };

/**
 * The one sentence that keeps a supplier's claim from reading as the seller's.
 *
 * It carries that alone now — the two tables share a format, a band and a
 * column grid, so nothing else marks where one provenance ends and the other
 * begins.
 */
export const SUPPLIER_PROVENANCE =
  'Weight and dimensions are the packed parcel, not the product itself.';

/** The group label the rows sit under, which is the other half of the sentence. */
export const SUPPLIER_GROUP_LABEL = 'As reported by the supplier';

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
 * Every row is present only when the portal sent that field. No "—", no "N/A":
 * an absent row says nobody recorded the fact, which is different from
 * recording that it is unknown. An empty array means the group renders nothing.
 */
export default function supplierFactRows(
  specs: ProductSpecs | undefined,
): SupplierFactRow[] {
  if (specs === undefined) return [];

  const rows: SupplierFactRow[] = [];

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
    rows.push({ label: 'Condition', value: CONDITION_LABELS[specs.condition] });
  }
  if (specs.mpn !== undefined) {
    rows.push({ label: 'Manufacturer part number', value: specs.mpn });
  }
  if (specs.gtins !== undefined && specs.gtins.length > 0) {
    rows.push({ label: 'GTIN', value: specs.gtins.join(', ') });
  }

  return rows;
}
