import type { ProductSpecification, ProductSpecs } from '@/lib/product-detail';
import Sals3SkuLine from './Sals3SkuLine';

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
   * The Sals3 SKU for the variant this request resolved. Printed above the
   * grid rather than in it — see `Sals3SkuLine` for why the provenance line
   * beneath the grid cannot be stretched to cover it.
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
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
          Product specifications
        </h2>
        <Sals3SkuLine fallbackSku={sals3Sku} />
        <dl className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,8.625rem)_minmax(0,1fr)] gap-4 border-b border-border py-2.5"
            >
              <dt className="text-sm text-ink-subtle">{row.label}</dt>
              <dd className="text-sm text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
        {/*
          The provenance line, and the whole reason this section is separate.
          It must never read "as reported by the supplier" — that sentence
          belongs to Supplier details, and applying it here would misattribute
          the seller's own declaration.
        */}
        <p className="mt-4 max-w-[80ch] text-xs leading-relaxed text-ink-subtle">
          Entered by the seller against this category&rsquo;s attribute set.
        </p>
      </div>
    </section>
  );
}
