---
tags: [sals3, catalog, taxonomy, reference, data]
aliases: [Category Taxonomy Reference, Universal Taxonomy, SKU Variation Engine]
created: 2026-08-03
updated: 2026-08-06
status: canonical
authority: catalog-data
owner_approved: true
related:
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[sals3-ux-build-specification]]"
---

# Universal Category and Variation Taxonomy - Reference

> [!IMPORTANT] Current decision
> Approved on 2026-08-06 as the starting **Sals3 Taxonomy v0** under [[ADR-002-sals3-taxonomy-and-cj-category-mapping]]. It is adopted reference data, not a claim that every category branch, attribute preset, CJ mapping, or provenance/license question is production-ready.

## Provenance

Source file: `Shopee_Category_Variation_Engine_Master.xlsx`, found at `E:\Bogs 2nd brain` and moved to `docs/Raw/universal_category_variation_taxonomy.xlsx` on 2026-08-03. The original fourth sheet, `Bogs_Store_SKU_Category_Map`, contained separate BOGS Dashboard/Weslu45 business data and was deliberately excluded from this vault.

The `Platform Category ID` column appears platform-derived and is not required by Sals3. Excluding it is sensible, but exclusion alone does not establish the provenance or reuse rights of the remaining hierarchy, names, codes, examples, or presets. Record an appropriate provenance/license determination before production dependence.

## Verified workbook inventory

### `Universal_Category_Taxonomy`

- Used range: `A1:N1346`
- 1 header row plus **1,345 data records**
- 14 columns
- 29 distinct L1 departments
- 1,345 unique universal category codes; no duplicates found
- No missing L1-L5 hierarchy values found
- `Product Examples & Guidelines` populated for 7 records and blank for 1,338

Columns:

`Universal Category Code`, `L1 Department (Main)`, `L2 Sub-Department`, `L3 Product Class`, `L4 Sub-Class`, `L5 Item Specification`, `Platform Category ID`, `Variation Architecture`, `Tier 1 Attribute (Primary)`, `Tier 2 Attribute (Secondary)`, `SKU Format Standard`, `Required Item Attributes`, `Store Catalogue Status`, `Product Examples & Guidelines`.

### `L1_to_L5_Hierarchy_Matrix`

- Used range: `A1:K14`
- 1 header row plus **13 data records**
- This is a partial summary matrix, not proof that the full taxonomy has only 13 L1 departments.

### `Attribute_Dictionary_&_Presets`

- Used range: `A1:E57`
- 1 header row plus **56 data records**
- Current groups: 31 color rows, 18 digital-preset rows, and 7 size rows

## Variation coverage QA

Across 1,345 taxonomy records, the workbook currently uses:

- 15 distinct variation architectures;
- 15 Tier-1 attribute patterns;
- 15 Tier-2 attribute patterns;
- 15 required-attribute patterns;
- 14 SKU format patterns.

These patterns are valuable form presets but are relatively coarse for the size of the tree. Each initial category branch needs real-product validation before its form rules become production-ready.

## Adoption state

- **Adopted:** full L1-L5 hierarchy and universal codes are the Sals3 Taxonomy v0 starting direction.
- **Not yet pilot-validated:** representative real CJ product mappings and variation behavior.
- **Not yet production-ready:** full form binding, licensing/provenance determination, operational ownership, and category-by-category QA.

Do not use the mostly blank `Product Examples & Guidelines` field as the primary automatic classifier. Mapping must combine stable category-path rules, names, attributes, and reviewable confidence, as defined in ADR-002.

The taxonomy does not itself define prices or margin. Pricing configuration belongs to [[ADR-003-international-availability-shipping-and-pricing]] and may reference taxonomy categories after those branches are validated.
