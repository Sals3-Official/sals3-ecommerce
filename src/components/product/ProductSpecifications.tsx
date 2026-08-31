import type { ProductSpecification, ProductSpecs } from '@/lib/product-detail';
import Sals3SkuLine from './Sals3SkuLine';
import { PRODUCT_FACT_GRID, PRODUCT_FACT_ROW } from './fact-table-styles';
import supplierFactRows, {
  SUPPLIER_GROUP_LABEL,
  SUPPLIER_PROVENANCE,
} from './supplier-facts';

type ProductSpecificationsProps = {
  /** Seller-declared category attributes, in the order the portal sent them. */
  specification?: ProductSpecification[];
  /**
   * Supplier-reported facts. The declared **brand** is read out of here into the
   * seller's own rows, because a brand is the seller's claim about the product
   * even when it arrives on the technical payload. Everything else becomes the
   * supplier group below, through `supplierFactRows`.
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
 * Everything the page knows about the product as facts: what the seller
 * declared against their category's attribute set, then what the supplier
 * reported, in one band.
 *
 * This is the page's one white full-bleed band — see `page.tsx` for why the
 * rhythm break sits here and nowhere else. It is deliberately the first section
 * after the record panel: specifications exist on every categorised product,
 * while a written description exists on almost none today, so the
 * always-present section must not sit behind the usually-absent one.
 *
 * ## Why the supplier's facts are inside it
 *
 * They were their own section, then their own band, and the page kept reading
 * badly: at 1280px the last specification row closed at 1376 and the Supplier
 * details heading started at 1448, so the two halves of one subject were
 * separated by 72px of nothing. Owner decision 2026-08-31, after three attempts
 * at fixing it from the outside — they are one table with a group inside it.
 *
 * **The boundary those two components existed to hold has not moved.** It was
 * never the section; it is the sentence. `SUPPLIER_PROVENANCE` sits directly
 * under the supplier rows and nowhere else, and the seller's rows carry no
 * provenance line at all — "as reported by the supplier" over a seller's own
 * declaration is a provenance error, not a wording preference.
 *
 * ## Two columns, not three
 *
 * Three columns left each value 209px of a 347px track while the label took
 * 138px, and thirteen attributes across three columns orphaned one on a fifth
 * row. Two columns give the value 400px and turn that orphan into a short cell
 * on a row of two. It does not remove the orphan — nothing can, because the
 * attribute count is the seller's — it makes it half the page instead of a
 * third, which is the trade the owner picked.
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
  const supplierRows = supplierFactRows(specs);

  // A code with no attributes behind it still earns the band: it is the one
  // thing on this page somebody copies out to quote a listing.
  if (
    rows.length === 0 &&
    supplierRows.length === 0 &&
    sals3Sku === undefined
  ) {
    return null;
  }

  return (
    /*
      `mt-12` is the gap that was not there. The buy rail's evidence card ended
      at 1089 and this band began at 1089 — no space at all, so the band read as
      part of the card rather than as the next section. 48px of the page's own
      grey is what separates them now.
    */
    <section className="mt-12 border-y border-border bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
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

        {rows.length === 0 ? null : (
          <dl className={PRODUCT_FACT_GRID}>
            {rows.map((row) => (
              <div key={row.label} className={PRODUCT_FACT_ROW}>
                <dt className="text-sm text-ink-subtle">{row.label}</dt>
                <dd className="text-sm text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {supplierRows.length === 0 ? null : (
          <>
            {/*
              A 13.5px label rather than a second 20px heading. The supplier's
              facts are a group inside this table, not a section of their own —
              a second heading of equal weight is what made the page read as two
              things and left a hole between them.
            */}
            <p className="mt-7 text-[13.5px] font-medium text-ink-muted">
              {SUPPLIER_GROUP_LABEL}
            </p>
            <dl className={`${PRODUCT_FACT_GRID} mt-2`}>
              {supplierRows.map((row) => (
                <div key={row.label} className={PRODUCT_FACT_ROW}>
                  <dt className="text-sm text-ink-subtle">{row.label}</dt>
                  <dd className="text-sm text-ink tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
            {/*
              Load-bearing. With the two tables sharing a band, a format and a
              grid, this sentence and the label above it are the only things
              saying whose claim is whose. It must stay directly under these
              rows, and the seller's rows above must never carry one like it.
            */}
            <p className="mt-3 max-w-[80ch] text-xs leading-relaxed text-ink-subtle">
              {SUPPLIER_PROVENANCE}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
