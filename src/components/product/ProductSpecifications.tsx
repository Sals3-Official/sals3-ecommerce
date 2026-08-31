import type { ProductSpecification, ProductSpecs } from '@/lib/product-detail';
import Sals3SkuLine from './Sals3SkuLine';
import { PRODUCT_FACT_GRID, PRODUCT_FACT_ROW } from './fact-table-styles';

type ProductSpecificationsProps = {
  /** Seller-declared category attributes, in the order the portal sent them. */
  specification?: ProductSpecification[];
  /**
   * Supplier-reported facts. Read for **one** value only — the declared brand —
   * because a brand is the seller's own claim about the product even when it
   * arrives on the technical payload. Everything else in `specs` belongs to
   * `ProductSupplierDetails`.
   */
  specs?: ProductSpecs;
  /**
   * The Sals3 SKU to show before the buyer narrows to a variant: the code the
   * request resolved, or the product's own. It does two jobs — it decides
   * whether the band is worth rendering at all, and it is what `Sals3SkuLine`
   * prints until the buyer's selection replaces it.
   *
   * It briefly did only the first of those, and the line printed nothing until
   * an option was chosen. On live that meant no SKU on any product page reached
   * without a `?variant=` link, which is nearly all of them. See `Sals3SkuLine`.
   */
  sals3Sku?: string;
};

/**
 * "Brand" and "Brand / Publisher" are the workbook's own attribute names for
 * the same fact. Matching the prefix rather than the exact strings keeps a
 * future workbook revision from producing two Brand rows on one page.
 */
function namesBrand(label: string): boolean {
  return label.trim().toLowerCase().startsWith('brand');
}

/**
 * The buyer-facing facts the **seller** entered, against their category's own
 * attribute set.
 *
 * This is the page's one white full-bleed band — see `page.tsx` for why the
 * rhythm break sits here and nowhere else. It is deliberately the first section
 * after the record panel: specifications exist on every categorised product,
 * while a written description exists on almost none today, so the
 * always-present section must not sit behind the usually-absent one.
 *
 * ## Why this is not `ProductSupplierDetails`
 *
 * One table under one footnote cannot carry both. "Specifications are as
 * reported by the supplier" becomes **false** the moment a seller-entered
 * attribute appears beneath it, and attributing a seller's own declaration to
 * CJ is a provenance error, not a wording preference. The portal editor already
 * keeps these two apart as its `specification` and `specs` sections; a single
 * flat storefront table contradicted that boundary.
 *
 * Returns `null` when there is nothing — no heading over an empty band, and no
 * reserved box that reflows when a seller finally answers something.
 */
export default function ProductSpecifications({
  specification,
  specs,
  sals3Sku,
}: ProductSpecificationsProps) {
  const declared = specification ?? [];
  // The declared brand only when the seller's own attribute set did not already
  // answer it. When both exist the workbook answer wins: it is the value the
  // seller was actually asked for against this category.
  const brand =
    specs?.brand !== undefined && !declared.some((row) => namesBrand(row.label))
      ? [{ label: 'Brand', value: specs.brand }]
      : [];
  const rows = [...brand, ...declared];

  // A code with no attributes behind it still earns the band: it is the one
  // thing on this page somebody copies out to quote a listing.
  if (rows.length === 0 && sals3Sku === undefined) return null;

  return (
    <section className="border-y border-border bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-9">
        {/*
          Heading and identifier share one baseline row: the heading names the
          band, the code identifies what the band is describing. They wrap to
          two lines below `sm`, in that order, and the heading holds the row's
          height on its own — so the band does not reflow when the buyer's first
          option click makes a code exist.
        */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
            Product specifications
          </h2>
          <Sals3SkuLine fallbackSku={sals3Sku} />
        </div>
        <dl className={PRODUCT_FACT_GRID}>
          {rows.map((row) => (
            <div key={row.label} className={PRODUCT_FACT_ROW}>
              <dt className="text-sm text-ink-subtle">{row.label}</dt>
              <dd className="text-sm text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
        {/*
          There was a provenance line here — "Entered by the seller against this
          category's attribute set." — removed by the owner on 2026-08-31.

          The rule it enforced has not gone anywhere: this grid must never carry
          "as reported by the supplier", because these are the seller's own
          declarations and that sentence belongs to `ProductSupplierDetails`
          alone. With the two sections now sharing a format and a white region,
          that sentence sitting under this grid is a live risk rather than a
          hypothetical one, so nothing goes here.
        */}
      </div>
    </section>
  );
}
