---
tags: [sals3, adr, catalog, taxonomy, cj-dropshipping, mapping]
aliases: [ADR-002, Sals3 Taxonomy v0, CJ Category Mapping]
created: 2026-08-06
updated: 2026-08-06
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-cj-dropshipping-integration-plan]]"
---

# ADR-002 - Sals3 Taxonomy v0 and CJ category mapping

> [!IMPORTANT] Adopted for pilot; not yet production-validated
> The workbook is the approved starting direction for Sals3 Taxonomy v0. Adoption does not claim that every row, attribute preset, license/provenance question, or CJ mapping is production-ready.

## Verified workbook facts

`docs/Raw/universal_category_variation_taxonomy.xlsx` contains:

| Sheet | Used range | Data records excluding header |
|---|---:|---:|
| `Universal_Category_Taxonomy` | `A1:N1346` | 1,345 |
| `L1_to_L5_Hierarchy_Matrix` | `A1:K14` | 13 |
| `Attribute_Dictionary_&_Presets` | `A1:E57` | 56 |

Additional QA findings:

- 29 distinct L1 departments exist in the full taxonomy; the 13-row hierarchy matrix is a partial summary, not the complete L1 list.
- All 1,345 taxonomy records have hierarchy values and unique universal category codes.
- `Product Examples & Guidelines` is blank in 1,338 records, so it is not a dependable primary classifier input.
- The workbook uses 15 variation architectures, 15 primary-attribute patterns, 15 secondary-attribute patterns, 15 required-attribute patterns, and 14 SKU patterns across the 1,345 records. These are useful presets but require category-level validation.

## Decision

### 1. Adopt the hierarchy as Sals3 Taxonomy v0

Use the L1-L5 hierarchy and universal category codes as the starting business taxonomy. Keep status at three levels:

- `adopted`: approved direction and available as reference data;
- `pilot_validated`: tested against representative real products;
- `production_ready`: mapping, required attributes, variations, and operational ownership verified.

The workbook is currently `adopted`. Individual category branches must earn the later statuses.

### 2. Do not infer licensing from one removed column

Removing `Platform Category ID` is sensible because Sals3 does not need a platform-specific identifier. It does not, by itself, prove that all remaining names, hierarchy, examples, codes, or presets are free of third-party rights. Record provenance and obtain an appropriate reuse/license determination before public or commercial dependence on the full dataset.

### 3. Map CJ category paths, then validate real products

Fetch CJ's category tree and map stable CJ category paths to Sals3 universal codes. A proposed category-path rule does not prove that real products are correctly mapped.

Every mapping record must carry:

```text
cjCategoryPath
sals3CategoryCode
mappingVersion
method
confidence
reviewStatus
createdAt
reviewedAt
```

Confidence states:

- `exact`
- `acceptable`
- `ambiguous`
- `unmapped`

`ambiguous` and `unmapped` products do not auto-publish. Corrections update the mapping version and create an auditable remap job for affected drafts or products.

### 4. Validate category-driven forms in a pilot

The variation, attribute, SKU, and required-field columns inform the Add Product form; they are not automatically a complete binding UI specification. Validate representative products in each initial L1 branch before calling that branch production-ready.

Pilot QA must cover:

- simple product;
- single-tier variation;
- two-tier variation;
- missing or unexpected CJ option labels;
- unit/size normalization;
- duplicate and invalid variant combinations;
- required attributes and search/filter behavior;
- SKU uniqueness and stability after remapping.

Start with lower-regulatory-risk categories. Food, supplements, medical claims, children's safety products, high-powered electronics, digital gift cards/licenses, and trademark-sensitive branded goods require additional policy before inclusion.

## Verification required

- Provenance/license review recorded.
- Representative-product mapping set and confusion/error report.
- Category owners approve required attributes and variation rules for each pilot branch.
- Rollback can restore a prior mapping version and queue affected products for review.
