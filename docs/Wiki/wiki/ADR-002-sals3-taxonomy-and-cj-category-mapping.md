---
tags: [sals3, adr, catalog, taxonomy, cj-dropshipping, mapping]
aliases: [ADR-002, Sals3 Taxonomy v0, CJ Category Mapping]
created: 2026-08-06
updated: 2026-08-06
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
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

## Implementation status - 2026-08-12 (`sals3-portal`)

> [!IMPORTANT] Pilot foundation built; no category branch is approved
> The mapping and taxonomy-preset foundation now exists in code in `sals3-portal`. It does not create a single approved mapping, does not validate any category branch, and does not make anything publishable. Every question under **Verification required** below is still open.

### What exists

- **One Sals3 category identity, reused not duplicated.** `sals3_categories` (seeded by `npm run seed:taxonomy` from the frozen extract of the `Universal_Category_Taxonomy` sheet) remains the only Sals3-side category identity. The new `sals3_category_presets` table hangs this ADR's section-4 metadata - variation architecture, tier-1/tier-2 attributes, SKU format standard, required item attributes - off that identity, keyed by `(category_id, taxonomy_version)` so a corrected extraction lands beside the old one rather than overwriting the row a past decision was made from. Seeded by `npm run seed:taxonomy-presets`.
- **Frozen, checksummed extraction; no runtime workbook dependency.** The `.xlsx` in this vault is not read by the application at runtime or build time, and no `.xlsx` parser is a dependency of that app. `src/lib/db/seed-data/sals3-taxonomy-presets-v0.json` carries the workbook name, sheet name, extraction date, record counts, and a SHA-256 that is recorded on every seeded row and re-verified by test.
- **Versioned mapping records.** `provider_category_mappings` carries provider, external category id, observed path, Sals3 category, taxonomy version, mapping version, method, confidence, review status, lifecycle status, supersession link, reason/evidence reference, and actor/timestamps - the full field list from section 3 plus the active/superseded and compare-and-set fields that section implied.
- **Database-enforced invariants, not conventions.** A partial unique index gives exactly one `ACTIVE` mapping per `(provider, external category id)`. A full unique index on `(provider, external category id, mapping version)` makes a retried proposal idempotent instead of forking history. Check constraints make two states unrepresentable: a confident mapping with no category, and an ambiguous/unmapped one that still names a category; a third forbids `ACTIVE` without `APPROVED`.
- **A deterministic resolver.** `resolveCategoryMapping()` accepts only persisted provider-category facts plus a taxonomy version and a caller's recorded mapping version. It returns `MAPPED_EXACT`, `MAPPED_ACCEPTABLE`, `AMBIGUOUS`, `UNMAPPED`, or `MAPPING_SUPERSEDED`. Only the two mapped shapes have a category field at all, so a review outcome cannot be read as a weak mapping.
- **No fuzzy method exists.** The method enum is `EXTERNAL_ID_RULE` or `REVIEWED_PATH_RULE`. There is no `NAME_SIMILARITY`/`FUZZY`/`INFERRED` value, so an uncontrolled text match is not expressible as an active rule. The observed CJ path is stored as a source snapshot that explains a decision; it is never matched on.
- **Corrections version forward and never rewrite.** Approving a replacement supersedes the previous active row in the same transaction and opens one `category_remap_review_findings` row saying the effect needs review. No candidate row, evaluation, supplier snapshot, audit event, price, or published record is modified. That row carries `affected_candidates_enumerated = false` - *recorded but not listed*, never "nothing was affected": naming the affected candidates needs a stable provider category id persisted on `supplier_candidates`, which `develop` does not have (the only category-shaped fact there is a display *name* on the evaluation feed snapshot, and matching on it would be the exact guess this design forbids). The column is nullable so per-candidate rows need no further migration once that id lands.

### Rules this implementation enforces

- **No live CJ call.** Mapping, resolution, the category form contract, and the remap sweep are local database and reference-data operations. A repository-guard test scans the module's own source and fails on a supplier-adapter import, a `fetch`, or a workbook parse. Section 3's "fetch CJ's category tree" therefore remains an external, manual input to a reviewed proposal - not something this code does.
- **`AMBIGUOUS` and `UNMAPPED` are correct answers.** Where no owner-approved rule exists there is simply no active row, and the resolver says `UNMAPPED`. Nothing auto-publishes, auto-blocks, or silently becomes more confident. `modules/pricing/resolver.ts` already refuses to price an `AMBIGUOUS`/`UNMAPPED` category; that value now has a real source instead of a Product Editor fixture.
- **Required attributes report, they do not invent.** The category form contract derives its allow list from the persisted preset. A missing or blank required attribute produces an explicit finding and stays absent. A CJ option label the preset does not know is preserved verbatim for review rather than discarded to make a form pass. A variation architecture the parser does not recognise is reported as unknown rather than assumed single-tier.

### Not built, and blocking

- **No authorization boundary for category governance exists.** ADR-014 places platform-wide category governance in the Admin Portal, and `sals3-portal` has no permission that expresses it - `PORTAL_PERMISSIONS` is entirely seller-scoped, and the `admin`/`catalogue_reviewer` roles that look closest are the known open boundary defect. The governance operations are therefore **server-only application functions with no Server Action, no route handler, and no UI**, and the authorization gate is an allow list that is currently empty: it denies every role, including `admin`. Any seller- or staff-facing mapping surface is blocked on that boundary.
- **No approved mapping data.** Not one rule is seeded. `sals3_categories.taxonomy_status` is `ADOPTED` for all 1,345 rows; no branch is `pilot_validated` or `production_ready`.
- **No remap worker.** The findings are inspectable rows. Nothing consumes them.
- **Product integration now exists.** `applyResolvedCategoryToProduct()` writes a resolved category onto a `products` row together with the mapping id and version that produced it, scoped to the steward account and gated on the product's own version. A review outcome clears the category rather than leaving a stale one standing. Two deliberate changes landed on the canonical Product schema: `category_mapping_confidence` moved to the mapping module and is imported back (one Postgres type, declared where the concept lives), and `products_category_mapping_consistent` was corrected from `(category_id IS NULL) = (confidence = 'UNMAPPED')` - which forced an `AMBIGUOUS` product to name a category - to "a category is present exactly when the mapping was confident". Nothing had written `AMBIGUOUS` before that change.
- **Migration `0014_red_swordsman` is generated and NOT applied** to any database. Shipped as [`sals3-portal` PR #41](https://github.com/Sals3-Official/sals3-portal/pull/41).

## Verification required

- Provenance/license review recorded.
- Representative-product mapping set and confusion/error report.
- Category owners approve required attributes and variation rules for each pilot branch.
- Rollback can restore a prior mapping version and queue affected products for review.
- A real platform category-governance authority (ADR-014) before any mapping mutation is exposed to a user.
