---
tags: [sals3, adr, catalog, taxonomy, cj-dropshipping, mapping]
aliases: [ADR-002, Sals3 Taxonomy v0, CJ Category Mapping]
created: 2026-08-06
updated: 2026-08-14
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-cj-dropshipping-integration-plan]]"
  - "[[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]]"
---

# ADR-002 - Sals3 Taxonomy v0 and CJ category mapping

> [!IMPORTANT] Adopted for pilot; not yet production-validated
> The workbook is the approved starting direction for Sals3 Taxonomy v0. Adoption does not claim that every row, attribute preset, license/provenance question, or CJ mapping is production-ready.

> [!DANGER] Amended 2026-08-14 — the reference data below is historical; see the amendment section at the end
> Everything from here through "Verification required" describes the ORIGINAL Shopee-derived
> workbook as it stood 2026-08-06 through 2026-08-13. It is kept unedited for history. The
> **"Amendment — 2026-08-14" section at the bottom of this note is current** and supersedes the
> specific facts (row counts, code format, sourcing) below wherever they conflict. Read the
> amendment before citing any number in this original section as today's state.

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

## Amendment — 2026-08-14: Sals3 Taxonomy v0's reference data is now Google's product taxonomy, not the Shopee workbook

> [!WARNING] Supersedes the "Verified workbook facts" section above
> Per owner decision (Bogs, 2026-08-14), `docs/Raw/universal_category_variation_taxonomy.xlsx`'s
> `Universal_Category_Taxonomy` sheet no longer holds the 1,345-row Shopee-derived data described
> above. It now holds **5,595 rows sourced from Google's official product taxonomy**
> (`Google_Product_Taxonomy_Version: 2021-09-21` — confirmed current as of 2026-08-14 directly
> against Google's own linked download, not estimated from a third-party source), reformatted
> into this ADR's original 14-column shape. `L1_to_L5_Hierarchy_Matrix` grew from 13 to 21 rows
> (one per Google L1 department, up from a partial 13-row summary). `Attribute_Dictionary_&_Presets`
> is untouched.

### What changed, and what did not

**Changed — the reference category set and its codes:**

- Universal Category Code format is now `CAT-GGL-<Google numeric category ID>` (e.g.
  `CAT-GGL-7209`), replacing the original Shopee-derived code scheme for any category this
  workbook did not already carry a reviewed mapping for.
- The category hierarchy itself (paths, L1-L5 breakdown) is Google's own taxonomy, not the
  Shopee-derived one — a much broader, more granular, and differently-organized structure (29
  Shopee-derived L1 departments vs. Google's own department list).

**Changed, and this is the material risk — the Variation Architecture / Tier 1-2 Attribute /
SKU Format / Required Attribute columns:**

- The original Shopee-derived data's presets traced back to a real external source
  (`Shopee_Category_Variation_Engine_Master.xlsx`, a genuine category-variation engine workbook).
  §1's "adopted... not yet production-ready" language already treated that as needing pilot
  validation, but it started from real provenance.
- The current data's presets for all 5,595 categories were **generated by Gemini** (a different
  AI, at the owner's explicit direction) with **no cited source at all** — not Google's own
  documentation, not a real variation-engine reference, not per-category research. A
  rule-based, source-cited alternative was built the same day (citing Google Merchant Center's
  own documented variant rules and Shopify/Amazon conventions, honestly leaving ~80% of
  categories marked "no established consumer variant" rather than inventing one) and was
  **explicitly rejected by the owner in favor of the fully-generated version** — see
  [[universal-category-variation-taxonomy-reference]] for that full history.
- **Confirmed factually wrong in at least one row**, shown to the owner before this decision was
  finalized: `Animals & Pet Supplies` (a bare L1 department that includes `Live Animals`) is
  assigned Color options `Blue, Green, Pink, Grey, Stainless Steel` and Size options
  `Small (250ml), Medium (500ml)...` — a live animal is not sold with a color/volume variant.
  This is not a hypothetical risk; it is a known, present defect in the adopted data, kept by
  owner decision.

**Not changed — the mapping mechanism itself (§3) and everything downstream of it:**

- The `cjCategoryPath -> sals3CategoryCode` mapping record shape, its four confidence states,
  and the `ambiguous`/`unmapped` no-auto-publish rule are unaffected by this amendment. The
  mapping *target* identity changes (Google-sourced codes instead of Shopee-derived ones for
  anything not already reviewed); the mapping *mechanism* does not.
- **Nothing in the actual `sals3-portal` codebase or database reflects this amendment.** The
  real `sals3_categories` table, `scripts/seed-sals3-taxonomy.mts`,
  `scripts/seed-sals3-taxonomy-presets.mts`, and `provider_category_mappings` still run on the
  original Shopee-derived taxonomy. This Excel file and the live system currently disagree, and
  re-seeding (or deciding not to) is a separate, not-yet-taken step.
- **Unrelated to this amendment**, though it touches the same general topic and landed the same
  day: [[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]] documents
  a real, already-*implemented* change in the live codebase where an unmapped CJ category is
  auto-mirrored 1:1 as its own Sals3 category (`cj-mirror.ts`) at draft creation and publish time.
  That mechanism does not read this Excel file at all, does not use Google's taxonomy, and was
  decided and shipped independently of this amendment. Do not conflate the two "category"
  decisions from the same week — one is a live code path already running; this amendment is a
  reference-artifact change with no code behind it yet.

### Effect on §4 (pilot validation requirement)

§4's requirement to validate representative products per L1 branch before calling any branch
`production_ready` applies with **more force** now, not less: the original workbook's presets
started from a real source and still needed validation; this data has no source to start from at
all for its attribute layer, only for its category structure. Treat every specific attribute
value, option preset, and SKU pattern in the current file as illustrative/generated, not as a
researched fact, until a real per-category review happens — the same caution
[[universal-category-variation-taxonomy-reference]] records in full.

### Verification added by this amendment

- [x] The replacement's category source (Google's official taxonomy, 2021-09-21, 5,595 rows) was
      independently verified by direct download and line count, not estimated.
- [x] At least one concrete data defect was found and disclosed before the owner confirmed
      keeping the data (`Animals & Pet Supplies` / `Live Animals`).
- [ ] Per-category pilot validation of the new attribute/variation data (§4) — not started.
- [ ] Reconciling the live codebase's `sals3_categories`/mapping tables against this new
      reference data, or an explicit decision not to — not started.
