---
tags:
  [
    sals3,
    sals3-portal,
    catalog,
    taxonomy,
    cj-dropshipping,
    mapping,
    governance,
  ]
aliases:
  [
    CJ to Sals3 Category Mapping Pilot,
    Category Mapping Resolver,
    Sals3 Taxonomy v0 Presets,
  ]
created: 2026-08-12
updated: 2026-08-12
status: implemented-pending-migration
authority: implementation-note
owner_approved: false
implementation_status: code-complete-migration-unapplied-no-approved-mapping-data
related:
  - '[[hot]]'
  - '[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]'
  - '[[universal-category-variation-taxonomy-reference]]'
  - '[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]'
  - '[[ADR-014-admin-portal-platform-governance-and-global-controls]]'
  - '[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]'
  - '[[cj-candidate-to-sals3-product-draft-implementation-spec]]'
  - '[[sals3-portal-seller-market-configuration]]'
  - '[[sals3-portal-canonical-product-catalog-backend]]'
---

# CJ-to-Sals3 category mapping pilot (`sals3-portal`)

## Status

Code-complete foundation. **Not approved, not migrated, not connected to any
screen, and carrying zero mapping data.** Migration `0014_red_swordsman` is
generated and has **not** been applied to any database. No CJ API call was
introduced (exact count: **zero**). Nothing was published, no market was
approved, and no product became sellable as a result of this work.

The single highest-value thing this unblocks is that
`modules/pricing/resolver.ts`'s `categoryMappingConfidence` input — which
already refuses to price `AMBIGUOUS`/`UNMAPPED` — now has a real, versioned,
auditable source instead of a Product Editor fixture constant.

## The problem it solves

[[ADR-002-sals3-taxonomy-and-cj-category-mapping]] approved Sals3 Taxonomy v0
and a versioned CJ-to-Sals3 mapping model, but
[[cj-candidate-to-sals3-product-draft-implementation-spec]] §26 recorded
category-required-attribute validation as explicitly **not** implemented,
"needs the ADR-002 taxonomy-to-CJ-category mapping wired up first — that
integration does not exist." It exists now, as a foundation.

Target flow, end to end:

```text
persisted CJ category id + observed path on a supplier candidate
  -> versioned CJ-to-Sals3 mapping decision
  -> Sals3 Taxonomy v0 universal category code
  -> required attributes / variation architecture / SKU pattern preset
  -> explicit validation findings or NEEDS_REVIEW
```

## What already existed, and was reused rather than duplicated

`sals3_categories` was created by the ADR-015 pricing work and seeded from
this vault's workbook with code, L1–L5 hierarchy, path, and taxonomy status.
That is the **one** Sals3-side category identity, and nothing in this work
re-declares it. Two gaps were real and are what this task filled:

- the workbook's form-preset columns (variation architecture, tier-1/tier-2
  attributes, SKU format standard, required item attributes) were never
  imported;
- no source/provenance metadata was persisted alongside the identities.

## Data model

Three new tables, all in `src/lib/db/schema/category-mapping.ts`.

| Table                             | Purpose                                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sals3_category_presets`          | Workbook form presets keyed by `(category_id, taxonomy_version)`, with workbook/sheet/SHA-256/imported-at provenance on every row                    |
| `provider_category_mappings`      | One versioned rule per `(provider, external category id)`; at most one `ACTIVE`                                                                      |
| `category_remap_review_findings`  | One inspectable, append-only record that a correction's effect needs review; `supplier_candidate_id` is nullable and null today                       |

### Invariants the database enforces, not the application

- **One active rule per supplier category.** Partial unique index on
  `(provider, external_category_id) WHERE status = 'ACTIVE'`.
- **Version integrity and idempotent retry.** Full unique index on
  `(provider, external_category_id, mapping_version)`, so a replayed proposal
  collides and returns the existing row instead of forking history.
- **A guess is unrepresentable.** A check constraint requires
  `EXACT`/`ACCEPTABLE` to name a Sals3 category and requires
  `AMBIGUOUS`/`UNMAPPED` **not** to. "Ambiguous, but here's a category anyway"
  cannot be stored, so no future caller can read the id without reading the
  confidence.
- **Nothing activates unreviewed.** A check constraint forbids
  `status = 'ACTIVE'` unless `review_status = 'APPROVED'`.
- **No fuzzy method exists.** The method enum is `EXTERNAL_ID_RULE` or
  `REVIEWED_PATH_RULE`. There is deliberately no `NAME_SIMILARITY` /
  `FUZZY` / `INFERRED` value, so an uncontrolled text match is not
  expressible as an active rule rather than merely discouraged.

### Identity: the external id, not the path

The stable CJ `categoryId` is the supplier-category identity.
`observed_category_path` is stored as a **source snapshot that explains a
decision to a reviewer** and is never matched on — a test asserts the
resolver's lookup is keyed only on the external id even when the path is
changed to something unrelated.

## Resolver contract

`resolveCategoryMapping()` takes only persisted provider-category facts, a
taxonomy version, and the caller's previously recorded mapping version. There
is no parameter through which a browser-supplied category code could arrive.

| Outcome              | When                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `MAPPED_EXACT`       | Approved, active `EXACT` rule naming a real Sals3 code            |
| `MAPPED_ACCEPTABLE`  | Same, reviewed as acceptable rather than exact                    |
| `AMBIGUOUS`          | Rule exists but cannot be decided automatically, or a taxonomy-version mismatch |
| `UNMAPPED`           | No rule, no supplier category recorded, or an explicit "no Sals3 home" decision |
| `MAPPING_SUPERSEDED` | The caller's recorded version is no longer the one in force        |

Only the two `MAPPED_*` shapes have a category field **at all**. A review
outcome cannot be misread as a weak mapping, because the property does not
exist on it. The superseded check runs **before** confidence, so a stale
decision is never re-served as current even when the new rule happens to
agree with the old one.

## Required attributes and variations

`resolveCategoryFormContract()` derives the required-attribute allow list and
the permitted variation architecture from the persisted preset. When the
preset is missing the answer is `TAXONOMY_PRESET_UNAVAILABLE`, never an
empty-but-confident contract a caller would read as "this category requires
nothing".

`validateCategoryAttributes()` is pure and reports truthfully:

- a missing or blank required attribute produces a finding and **stays
  absent** — no placeholder, no supplier value copied in to fill it;
- an unrecognised CJ option label is **preserved verbatim** in
  `unrecognizedAttributes` (ADR-002 §4's explicit unmapped-values panel),
  never dropped to make a form pass;
- a variation architecture the allow list does not recognise is reported as
  `UNKNOWN` plus a finding, not assumed to be single-tier.

The tier parser is an allow list of the exact `1-Tier` / `2-Tier` prefixes
the workbook uses. A test reads all 15 architectures out of the frozen
extract and asserts every one parses, so a future re-extraction that
introduces a new shape fails loudly instead of being guessed at.

## Provenance and the workbook

The `.xlsx` is **never read by the application** — not at runtime, not at
build time, not by the tests, and no `.xlsx` parser is a dependency.
`src/lib/db/seed-data/sals3-taxonomy-presets-v0.json` is a frozen extraction
carrying workbook name, sheet name, extraction date, record counts, and a
SHA-256 that is written onto every seeded row. A test recomputes that
checksum and re-checks the artifact against ADR-002's verified counts.

Two source facts were refined while extracting, and are recorded in
[[universal-category-variation-taxonomy-reference]]:

- of the 7 non-blank `Product Examples & Guidelines` cells, **one is a bare
  `-` placeholder**, so only 6 carry real text;
- the five preset columns resolve to only **15 distinct full combinations**
  across all 1,345 records — the per-column counts (15/15/15/15/14) are not
  independent. The extract therefore stores 15 patterns plus a per-category
  assignment rather than 1,345 near-duplicate rows, at ~220 KB instead of
  ~400 KB. Every stored value is the workbook's verbatim cell text.

`Store Catalogue Status` is kept under that name because it is provenance
about the origin sheet (`Bogs Store` / `Catalog Reference` / `Digital
Services (Expansion)`), **not** a Sals3 listing state.

## Corrections never rewrite history

Approving a replacement supersedes the previous active row in the same
transaction and opens review findings for the `supplier_candidates` whose
persisted provider category the correction changed the meaning of.

No candidate row, evaluation, supplier snapshot, audit event, price, or
published record is modified. The row records `affected_candidates_enumerated
= false` — *recorded but not listed*, and never rendered as "nothing was
affected". See the dependency note under **Validation** for why enumeration is
deferred rather than approximated.

**There is no worker.** The findings are inspectable rows. The only durable
outbox/job pattern in the repository belongs to the concurrent discovery
work, and reaching into it from here would couple two independent tasks, so
the worker is reported as deferred rather than half-built.

## The authorization boundary — open blocker

[[ADR-014-admin-portal-platform-governance-and-global-controls]] places
platform-wide category governance in the Admin Portal, not inside a seller's
tenant application. `sals3-portal` has **no permission that expresses it**:
`PORTAL_PERMISSIONS` is entirely seller-scoped, and the `admin` /
`catalogue_reviewer` roles that look closest are the already-recorded
boundary defect (`ownsProduct()` grants them cross-seller reach).

So the governance operations are **server-only application functions with no
Server Action, no route handler, and no UI**, and
`authorizeCategoryGovernance()` is an allow list that is **currently empty** —
it denies every role including `admin`, with one byte-identical message that
names no role, mapping, or row. Two tests enforce this: one asserts the
per-role denial, another scans `src/app/` and fails if anything there imports
the governance or repository module.

Inventing a `category_mapping:manage` permission on a seller role to make a
screen work would quietly widen exactly the boundary ADR-014 exists to
protect. That is the reason no UI was added, and it is the blocker for any
seller- or staff-facing mapping surface.

## Deliberately not done

- **No approved mapping data.** Not one rule is seeded. All 1,345 categories
  remain `ADOPTED`; no branch is `pilot_validated` or `production_ready`.
- **No live CJ category-tree fetch.** Section 3's "fetch CJ's category tree"
  stays an external, manual input to a reviewed proposal. A repository-guard
  test scans the module's source and fails on a supplier-adapter import, a
  bare `fetch`, or a workbook parse.
- **No product is priced, published, or approved by a mapping.** Assigning a
  category is the whole of it. `MediaAsset`, attention, compliance, and the
  publication gates remain unbuilt elsewhere.
- **No high-risk category treatment.** Food/supplements, medical, children's
  safety, high-powered electronics, digital gift cards/licenses, and
  trademark-sensitive goods carry no special handling here because none is
  approved; they are simply unmapped like everything else.

## Applying a decision to a product

[[sals3-portal-canonical-product-catalog-backend]] merged first, and its own
schema comment names this work as the missing piece: "A CJ-sourced draft
starts `UNMAPPED`: no CJ-to-Sals3 taxonomy crosswalk exists." This branch was
rebased onto it and closes that loop.

`applyResolvedCategoryToProduct()` is the one write path onto a product. It
has **no category parameter** — it takes supplier-category facts, asks the
resolver, and writes whatever came back. `products` gains
`category_mapping_id` and `category_mapping_version`, so a stored category is
always traceable to the exact rule and version that produced it, and stays
traceable after that rule is superseded (mapping rows are never rewritten).

A review outcome **clears** the product's category rather than leaving a stale
one standing — including when the rule a product was mapped under has since
been superseded. Losing a category is recoverable; pricing and publishing
against a withdrawn one is not. Tenancy is the steward account folded into
every `WHERE`, the write is a compare-and-set on `products.version`, and both
branches append an audit event.

### Two changes to `product-catalog.ts`, both deliberate

**The `products_category_mapping_consistent` check changed shape.** It was
`(category_id IS NULL) = (confidence = 'UNMAPPED')`, which forced an
`AMBIGUOUS` product to name a category — the opposite of what ADR-002 means
by ambiguous, and it made the honest state unrepresentable. It is now "a
category is present exactly when the mapping was confident", mirroring the
constraint on the mapping table so neither side can hold a guess. Nothing
wrote `AMBIGUOUS` before the change (`create-draft.ts` starts every
CJ-sourced draft `UNMAPPED`), so no existing row is affected.

**`category_mapping_confidence` moved to `category-mapping.ts`** and is
imported back into `product-catalog.ts`. Same type name, same four values, no
change to migration `0013` — but declared where the concept lives, since a
mapping row *decides* a confidence and a `products` row only *records* the
one it was given. One Postgres type, so the two can never drift into separate
vocabularies.

## Validation

Verified on a branch cut from `origin/develop` at `bb978cb` — which already
includes the canonical Product backend — in an isolated git worktree so the
uncommitted work in the shared checkout could not be swept into the commit.
`npm run verify` ran end to end through the pre-commit hook and **passed**:

| Check                          | Result                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `npm run lint`                 | Clean                                                                                    |
| `npm run format:check`         | Clean                                                                                    |
| `npm run typecheck:clean`      | Clean                                                                                    |
| `npm run build`                | Passed                                                                                   |
| `npm run test:run`             | **1,060 passed, 4 skipped, 0 failed** - 82 of them new, across 7 files                    |
| `npm run test:e2e`             | **47 passed, 11 skipped, 0 failed**                                                      |
| `npm audit --audit-level=high` | Passed (4 moderate, 0 high/critical - all pre-existing `drizzle-kit` to `@esbuild-kit/*`) |

`sals3-portal` [PR #41](https://github.com/Sals3-Official/sals3-portal/pull/41),
branch `feat/cj-to-sals3-category-mapping-pilot`.

### A real dependency, still open

The turnover's premise - "persisted CJ category ID + observed category path on
a supplier candidate" - is **still not true on `develop`**.
`supplier_candidates` has no `provider_category_id`/`provider_category_name`;
those columns belong to the in-flight lean-catalog work.
`provider_product_references` does not carry one either. The only
category-shaped fact available is a display *name* string on
`candidate_evaluations.feed_snapshot`.

So two things wait on that column, and neither was approximated:

- the remap review writes one summary row per superseded mapping with
  `affected_candidates_enumerated = false` (`supplier_candidate_id` is
  nullable, so per-candidate rows need **no further migration**);
- `applyResolvedCategoryToProduct()` takes the provider-category facts as a
  typed parameter its caller must source from persisted data, because there is
  no table to read them from yet.

Selecting rows by a supplier's category *name* would have satisfied the letter
of the brief and been the exact guess this module exists to prevent.

## Vault registration

`hot.md`, `index.md`, and this note's own `related` list were updated in the
same branch. The earlier deferral - "`hot.md` is being edited by the
concurrent lean-catalog task, so the delta is written out here instead" - no
longer applies: that work merged as PR #72, so the entry is applied directly.
