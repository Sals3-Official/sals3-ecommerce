import { describe, expect, it } from 'vitest';
import supplierFactRows, {
  SUPPLIER_GROUP_LABEL,
  SUPPLIER_PROVENANCE,
} from './supplier-facts';

/**
 * These were `ProductSupplierDetails.test.tsx` until 2026-08-31, when the
 * supplier's facts stopped being their own section and became a group inside
 * the specifications band. What they assert did not change — which fields are
 * the supplier's, how each reads, and that nothing is invented — so they moved
 * here rather than being rewritten. The rendering half now lives in
 * `Sals3SkuLine.test.tsx`'s band cases and in the page test.
 */
describe('supplierFactRows', () => {
  it('returns nothing when the portal sent no specs', () => {
    expect(supplierFactRows(undefined)).toEqual([]);
  });

  it('returns nothing when every field is absent', () => {
    expect(supplierFactRows({})).toEqual([]);
  });

  /**
   * `specs.sku` is an `S3V-<hex>` digest. It identified nothing for a buyer,
   * and rendering it here was the same defect as putting the variant hash on an
   * option chip. It reaches the buyer once, on the band's heading line.
   */
  it('never returns the Sals3 SKU as a row', () => {
    expect(supplierFactRows({ sku: 'S3V-2268B366F762' })).toEqual([]);
  });

  /**
   * A brand is the seller's own claim about the product, so it belongs among
   * the specifications even though it arrives on this technical payload.
   * Returning it here would put a seller declaration under "as reported by the
   * supplier".
   */
  it('never returns the brand', () => {
    expect(supplierFactRows({ brand: 'Sals3 Basics' })).toEqual([]);
  });

  /** No "—", no "N/A": an absent row says nobody recorded the fact. */
  it('omits a field entirely rather than returning a placeholder', () => {
    const rows = supplierFactRows({ weightGrams: 4200 });

    expect(rows.map((row) => row.label)).toEqual(['Package weight']);
  });

  it('formats weight and dimensions in readable units', () => {
    const rows = supplierFactRows({
      weightGrams: 4200,
      lengthMillimeters: 300,
      widthMillimeters: 200,
      heightMillimeters: 30,
    });

    expect(rows).toEqual([
      { label: 'Package weight', value: '4,200 g' },
      { label: 'Package dimensions', value: '30 cm × 20 cm × 3 cm' },
    ]);
  });

  it('gives a partial set of dimensions without inventing the rest', () => {
    const rows = supplierFactRows({ lengthMillimeters: 300 });

    expect(rows).toEqual([{ label: 'Package dimensions', value: '30 cm' }]);
  });

  it('labels a condition, a part number and a GTIN', () => {
    const rows = supplierFactRows({
      condition: 'REFURBISHED',
      mpn: 'CJYD2718032',
      gtins: ['09501101530003'],
    });

    expect(rows).toEqual([
      { label: 'Condition', value: 'Refurbished' },
      { label: 'Manufacturer part number', value: 'CJYD2718032' },
      { label: 'GTIN', value: '09501101530003' },
    ]);
  });

  /**
   * The boundary the two components existed to hold. It was never the section:
   * it is this sentence and the label above it, and with both groups sharing a
   * band they are now the only things saying whose claim is whose.
   */
  it('keeps the provenance wording free of the seller', () => {
    expect(SUPPLIER_GROUP_LABEL).toBe('As reported by the supplier');
    expect(SUPPLIER_PROVENANCE).toContain('packed parcel');
    expect(SUPPLIER_PROVENANCE).not.toMatch(/entered by the seller/i);
  });
});
