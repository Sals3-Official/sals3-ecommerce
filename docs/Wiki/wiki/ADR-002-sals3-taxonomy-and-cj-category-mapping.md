---
tags: [sals3, adr, catalog, taxonomy, cj-dropshipping, mapping]
aliases: [ADR-002, Sals3 Taxonomy v0, CJ Category Mapping]
created: 2026-08-06
updated: 2026-08-21
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
- A real platform category-governance authority (ADR-014) before any mapping mutation is exposed to a user.

---

## Amendment — 2026-08-20: the CJ mirror is a draft default only; publication requires a real Sals3 category

Owner decision (Bogs, 2026-08-20). This narrows the 2026-08-14 "the CJ category IS the Sals3
category" decision recorded in
[[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]] and referenced in the
amendment above. It does not reverse that decision everywhere — it moves the line to the point where
the consequence becomes visible to a buyer.

**What was happening.** `publishProduct` called `ensureProductCjCategory` whenever a product reached
publication without a Sals3 category: it minted a `CJ-<uuid>` mirror row from the supplier's own
category and published on it. That mirror then became the category a buyer browses and, since the
2026-08-19 pricing rework, the node the margin-inheritance chain resolves against. Bogs, reading the
live Market Rules screen, found two of them sitting among the 21 real departments
(`Men's Clothing / Outerwear & Jackets / Man Hoodies & Sweatshirts`,
`CJ-976399B4-534B-46F0-B18A-62075824A717`) and named the rule directly: nothing should proceed to
publish without a Sals3 category.

**Where the line now sits.**

- **Draft: unchanged.** `create-draft.ts` still calls `ensureCjCategoryMirror`. A new product still
  lands on the supplier's own category, which remains the right default — a product has to sit
  somewhere before a person has looked at it, and the supplier's category is the best evidence
  available at that moment.
- **Publish: refuses.** A `CJ-` mirror code, a Taxonomy v0 code, `UNMAPPED`, `AMBIGUOUS`, or a null
  category all return `SALS3_CATEGORY_REQUIRED` (renamed from `CATEGORY_UNMAPPED`, which described a
  mapping state rather than what the product carries). The refusal lands before pricing, so a
  mirrored node can never resolve a margin even on the way to being rejected.
- `products/category-mirror.ts` is deleted — publication was its only production caller.
  `taxonomy/cj-mirror.ts` stays; that is the draft path.

**Verified state at the time of this decision** (read-only census via
`/api/internal/catalog/taxonomy/status`, production, 2026-08-19): `sals3_categories` holds 5,602
rows — 5,595 Taxonomy v1 (`CAT-GGL-`), 7 CJ mirrors, 0 other. How many products sit on those 7
mirrors is **not** established here; no endpoint reports it and no production query was run. Any
that do can no longer be republished until a person assigns a real category. Already-published rows
are untouched — this gates the publish action, not the catalogue.

`sals3-portal` [PR #145](https://github.com/Sals3-Official/sals3-portal/pull/145), merged
2026-08-19. 2,140 unit tests green; tests assert the reversal directly, including that nothing is
written on the way to the refusal.

**Still open**: the seller-facing path to *fix* an affected product is the Product Editor's category
picker, which already restricts selection to `CAT-GGL-` rows. Nothing yet surfaces "this product
cannot publish because its category is a supplier mirror" ahead of the publish attempt.

## Amendment — 2026-08-21: this note is named v0, the application says v1, and both describe the same data

Confirmed with the owner (Bogs, 2026-08-21) — the follow-up the "Active risks" entry in [[hot]]
asked for. It turns out to be a smaller correction than that entry claimed, and the entry itself
was wrong in a way worth recording.

### What [[hot]] got wrong

Its risk entry said "**ADR-002 still describes 'Sals3 Taxonomy v0' (a 1,345-row internal
workbook) as the adopted, current taxonomy**" and asked for a dated follow-up section to be
added. That is not accurate: the **2026-08-14 amendment above already documents the switch in
full** — 5,595 Google-sourced rows, the `CAT-GGL-<Google numeric category ID>` code format, 21 L1
departments, and the Gemini-generated-presets risk — and a `[!DANGER]` box at the top of this note
routes a reader to it before any figure in the original section.

So this ADR was not stale on the facts. It is stale on its **name**, which is a narrower problem
and a real one.

### The actual divergence

| | Value |
|---|---|
| This note's title and alias | `Sals3 Taxonomy v0` |
| §1's heading | "Adopt the hierarchy as Sals3 Taxonomy v0" |
| The application constant | `ACTIVE_TAXONOMY_VERSION = 'sals3-taxonomy-v1'` |
| Seed file the app actually reads | `src/lib/db/seed-data/sals3-taxonomy-v1.json` |

Anyone grepping the vault for `sals3-taxonomy-v1` — the string the code uses — finds nothing in
this ADR, which is how "v1 is undocumented" became a believable conclusion. The name is not
renamed here: a filename and title change breaks every `[[ADR-002-...]]` link in the vault, and
that is a vault-wide edit rather than a decision record correction. **Read `v0` in this note's
title as the ADR's own identifier, not as the taxonomy version the code runs on.**

### Two figures in the original section that are now wrong, stated plainly

- "**All 1,345 taxonomy records**" and "`taxonomy_status` is `ADOPTED` for all 1,345 rows" —
  the count is **5,595**. Verified 2026-08-21 against the committed extract at
  `sals3-portal` `origin/develop`: 5,595 rows, 21 bare-L1 departments, every code matching
  `CAT-GGL-<digits>`.
- "**29 distinct L1 departments**" — that was the Shopee-derived set. It is **21** now, and all
  21 carry Google's real top-level category IDs. Enumerated in
  [[ADR-016-google-merchant-center-product-feed-compliance]]'s 2026-08-21 amendment, which uses
  that fact to retire its own "no Google Product Category crosswalk exists" blocker.

### Live in production, and what is still not approved

The taxonomy is seeded in production and the seller-facing category picker works against it
(see [[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]);
53,625 per-category attribute controls and a 149-entry attribute dictionary are seeded too, with
`REQUIRED` attributes acting as real server-enforced publish blockers.

Unchanged from §"Decision": **not one CJ→Sals3 mapping rule is approved**, no branch has earned
`pilot_validated`, publication refuses a `CJ-<uuid>` mirror category outright, and no portal role
— `admin` included — carries the authority to approve a mapping, because ADR-014 puts category
governance in the Admin Portal. That remains the blocker for any mapping surface.

**Frontmatter `updated`** moved to 2026-08-21. `status` stays `approved`.
