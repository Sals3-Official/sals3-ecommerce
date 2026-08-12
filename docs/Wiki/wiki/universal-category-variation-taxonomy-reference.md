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

Re-verified on 2026-08-12 while extracting the preset columns into `sals3-portal` (`src/lib/db/seed-data/sals3-taxonomy-presets-v0.json`, SHA-256 `237b5c6e…`). Two refinements to the counts above, both confirmed against the file:

- Of the 7 non-blank `Product Examples & Guidelines` cells, **one is a bare `-` placeholder**, so only **6 carry real example text**. The portal's extract stores that `-` as absent rather than as an example.
- The five preset columns (`Variation Architecture`, `Tier 1 Attribute`, `Tier 2 Attribute`, `SKU Format Standard`, `Required Item Attributes`) resolve to only **15 distinct full combinations** across all 1,345 records. The individual per-column counts below (15/15/15/15/14) are not independent - the columns move together as 15 patterns. The portal's extract therefore stores 15 patterns plus a per-category assignment rather than 1,345 near-duplicate rows; every stored value is the workbook's verbatim cell text.
- `Store Catalogue Status` has 3 distinct values (`Active Store Category (Bogs Store)`, `Catalog Reference`, `Digital Services (Expansion)`). It is source provenance about the origin sheet, **not** a Sals3 listing state, and the portal stores it under that name so it cannot be mistaken for one.
- `Required Item Attributes` is a comma-separated cell with no comma appearing inside parentheses in any of the 15 patterns, so splitting on `, ` is lossless. The portal keeps the original string alongside the split array so the split stays auditable.

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

**Persisted in `sals3-portal` as of 2026-08-12.** The hierarchy/codes live in `sals3_categories` and the preset columns in `sals3_category_presets`, both seeded from frozen JSON extracts rather than by reading this workbook at runtime - the application has no `.xlsx` parser and no dependency on this repository being present. The preset table is versioned by `taxonomy_version`, so a corrected extraction is a new version rather than an overwrite of the row a past decision cited. See [[ADR-002-sals3-taxonomy-and-cj-category-mapping#Implementation status - 2026-08-12 (`sals3-portal`)]]. All 1,345 rows remain `ADOPTED`; no branch has earned `pilot_validated` or `production_ready`.

Do not use the mostly blank `Product Examples & Guidelines` field as the primary automatic classifier. Mapping must combine stable category-path rules, names, attributes, and reviewable confidence, as defined in ADR-002.

The taxonomy does not itself define prices or margin. Pricing configuration belongs to [[ADR-003-international-availability-shipping-and-pricing]] and may reference taxonomy categories after those branches are validated.
