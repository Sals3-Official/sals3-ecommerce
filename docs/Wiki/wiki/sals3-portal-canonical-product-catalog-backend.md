---
tags:
  [
    sals3,
    sals3-portal,
    catalog,
    product,
    variant,
    offer,
    supplier-binding,
    tenancy,
    audit,
    merchant-center,
  ]
aliases:
  [
    Canonical Product Catalog Backend,
    Product Revision Variant Offer,
    Candidate to Draft Backend,
  ]
created: 2026-08-12
updated: 2026-08-12
status: implemented-pending-migration
authority: implementation-note
owner_approved: false
implementation_status: code-complete-migration-unapplied
related:
  - '[[hot]]'
  - '[[cj-candidate-to-sals3-product-draft-implementation-spec]]'
  - '[[ADR-001-seller-center-cj-sourcing-to-my-products]]'
  - '[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]'
  - '[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]'
  - '[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]'
  - '[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]'
  - '[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]'
  - '[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]'
  - '[[ADR-016-google-merchant-center-product-feed-compliance]]'
  - '[[sals3-portal-seller-market-configuration]]'
  - '[[nextjs-component-security-code-rules]]'
---

# Canonical product catalog backend (`sals3-portal`)

## Status

`implemented-pending-migration` — branch `feat/canonical-catalog-backend`,
`sals3-portal` [PR #40](https://github.com/Sals3-Official/sals3-portal/pull/40),
based on `develop`. Migration `0013_cold_timeslip.sql` is **generated and not
applied to any database**. Not merged. Not owner-approved.

This is [[cj-candidate-to-sals3-product-draft-implementation-spec]]'s
**unit 9** ("canonical catalogue handoff") in its persistence form only. It is
not permission to publish: units 1–8 of that specification's approved
implementation order still gate production publication, and nothing here
publishes.

## Problem this solved

`sals3-portal` had real CJ supplier candidates and a Product Editor UI, but no
durable Sals3-owned product behind either. `supplier_candidates`,
`candidate_evaluations`, and `supplier_snapshots` are discovery and screening
state; the Product Editor and `/listings` are fixtures where a reload discards
every change. There was nowhere for pricing, media rights, revisions, or
publication to attach to later, and `hot.md`'s "No product/variant/offer model
exists" had been true since the project started.

## What was built

Eleven tables in `src/lib/db/schema/product-catalog.ts`, a server-only domain
module in `src/modules/catalog/products/`, and two protected Server Actions in
`src/app/(portal)/listings/product-draft-actions.ts`.

The flow: an authorized Dropshipper turns a candidate **they own** into a real
`UNPUBLISHED` Product, a `DRAFT` ProductRevision, `DRAFT` Variants with stable
Sals3 SKUs, exact provider references, seller-scoped unpublished Offers, and an
`UNVERIFIED` supplier binding — idempotently, transactionally, and audited.

## The ownership decision that had to be made

Spec §4.2 and the turnover both require `ProviderProductReference` unique on
`(supplierProviderId, externalProductId)` **and** "a seller cannot access,
create, or mutate another seller's product". Those look contradictory the
moment two sellers source the same CJ `pid`.

[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]
settles it explicitly: _"Two Dropshipper accounts may source the same global
provider product while using separate credentials, wallets, orders, and
account-specific availability."_ So the model splits into three scopes:

| Scope                | Tables                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Canonical / platform | product identity, options, option values, variants, provider product and variant references                  |
| Steward (one seller) | `product_revisions` plus the editorial columns on `products` (`steward_seller_account_id`)                    |
| Seller               | `product_offers`, `offer_supplier_bindings`                                                                    |

Re-importing the same `pid` reuses the canonical product. A seller who is not
the steward gets their own offers and can never read or mutate the draft. **This
is the one design choice in this unit that deserves an explicit owner
decision** — it is the shared-catalogue (Amazon-ASIN-like) reading of §4.2, and
the alternative (a separate Sals3 product per seller per `pid`) would require
changing the stated uniqueness rule. Only one real seller account exists today,
so nothing depends on it yet.

## Invariants placed in the database, not in repository code

Each of these is otherwise a read-then-write race two concurrent Server Actions
both pass:

- a variant cannot be `ACTIVE` without a resolved option combination, and two
  active variants of one product cannot share one. This needs **both** a partial
  unique index on a normalized combination key **and** a check constraint —
  SQL unique indexes ignore NULLs, so the index alone would let unlimited
  `ACTIVE` variants carry a null key. That check is also the structural reason a
  supplier-sourced variant cannot be stored as `ACTIVE` before anyone maps its
  options;
- one variant cannot carry the same option twice;
- at most one open `DRAFT` revision per product, so fork-on-edit cannot double;
- an `APPROVED`/`SUPERSEDED` revision must carry its frozen content snapshot —
  without it, revision immutability would exist only in prose;
- a `PUBLISHED` product needs a published revision and a slug; a `PUBLISHED`
  offer needs a price;
- a compare-at price cannot exist without price-history evidence. This is the
  durable form of the fabricated `oldPriceMinor` defect already removed once
  from the storefront feed;
- a supplier-dropship offer has at most one `ACTIVE` binding (ADR-006).

## Honesty properties worth remembering

- **Zero supplier calls.** The flow reads only the `supplier_snapshots` row an
  earlier, separately budgeted evidence fetch wrote. A test walks the static
  import graph and fails if any supplier adapter, CJ client, or governed fetch
  becomes reachable — a behavioural spy would only prove one code path on one
  input. ADR-013 §1a requires that reading a saved snapshot never makes a
  supplier request.
- **A summary-only candidate cannot fabricate a variant.** A screening-stage
  block never reaches the evidence fetch, so there is no `vid`. It still gets a
  real product and draft, and reports `NO_PERSISTED_SUPPLIER_EVIDENCE`.
- **CJ's variant label is preserved verbatim, never parsed.** Splitting
  `"Black-1XL"` into option axes is a guess about which token is a colour, and a
  wrong guess becomes a customer-facing product attribute. The raw label lives on
  the provider variant reference as read-only provenance (ADR-013 §7).
- **Pricing is delegated to the ADR-015 resolver, not reimplemented**, so no
  second formula can drift from it. Today it always declines — a CJ-sourced
  product has no mapped Sals3 category, and the resolver refuses to price an
  unmapped one — and that refusal is stored on the offer with its exact reason.
  A check constraint makes "unresolved with no reason" impossible to store.
- **No hardcoded market.** An offer requires an `ACTIVE`
  [[sals3-portal-seller-market-configuration|seller market profile]] whose
  destination `modules/market-config/capabilities.ts` still authorizes.
  Narrowing the global buyer-destination policy narrows offer creation
  immediately, without editing a seller row.
- **No supplier HTML.** The description is a structured allow-listed block
  format (`paragraph`, `heading`, `bulletList`, `keyValueList`) with no raw-HTML
  block and no string passthrough. Markup-shaped text is rejected at the server
  boundary rather than stored and escaped later; `a < b` still passes. CJ's
  `description` remains fetched-but-unrendered, as spec §26 records.

## ADR-016 columns shipped in the first migration

`google_product_category`, `brand_name`, `condition`, `age_group`, `gender` on
the product; `gtins[]` (capped at 10 by a check constraint), `mpn`,
`identifier_exists` on the variant. All nullable and **never auto-populated** —
[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §7 still forbids
inventing them. Prices are integer minor units in a `bigint`, lossless to
Merchant API `amountMicros`.

GTIN/MPN/`identifier_exists` sit on the **variant**, not the product, because
one Sals3 variant maps to one Merchant API offer; brand and category sit on the
product because they are shared across variants.

No `Promotion` table: ADR-016 §2 makes it conditional on a genuine discount
feature, and Sals3 has none. An empty promotion table would be the fabricated
promotion that ADR warns against.

## Idempotency and concurrency

The idempotency record is inserted **inside the same transaction** as the
catalog rows, create-or-nothing on the key's unique index. Two simultaneous
duplicate clicks cannot both write: the loser's insert matches zero rows, its
whole transaction rolls back, and its retry replays the winner's stored result.
Same key + different canonical request is `IDEMPOTENCY_CONFLICT`, and the
rejection is itself audited.

Sals3 SKUs and option-combination keys are pure functions of stable provider
identity, which is what makes a retry resolve to the same rows rather than
creating second ones. The SKU hash uses a NUL separator so `("AB","C")` and
`("A","BC")` cannot collide.

## What is deliberately still missing

Reported by the flow as explicit codes rather than rounded up to "ready":
`NO_PERSISTED_SUPPLIER_EVIDENCE`, `NO_SUPPLIER_VARIANTS_IN_EVIDENCE`,
`CATEGORY_MAPPING_REQUIRED`, `PRODUCT_OPTIONS_UNMAPPED`, `PRICING_UNRESOLVED`,
`NO_ACTIVE_MARKET_PROFILE`, `SUPPLIER_CONNECTION_UNHEALTHY`,
`MEDIA_SOURCE_NOT_RECORDED`, `STRUCTURED_DESCRIPTION_REQUIRED`,
`EDITORIAL_RECORD_STEWARDED_BY_ANOTHER_SELLER`.

`product_media_sources` exists (ADR-016 requires media in the first migration)
but **has no writer**: stored CJ evidence records a usable-image *count*, never
the URLs, so there is nothing truthful to record yet.

Publication, approval, media storage, freight, checkout, supplier
synchronization, attention issues, and any storefront read of a Sals3 revision
remain unbuilt and are not faked anywhere.

## No UI was wired

The Product Editor and `/listings` remain fixtures. Pointing their existing
controls at partial real persistence would present unsaved fields as saved, so
this shipped as a protected contract plus tests. No navigation item was added,
and the concurrent All Supplier Products work was left untouched.

## Verification

`npm run typecheck:clean`, `npm run build`, and `npm audit --audit-level=high`
pass. `npm run test:run`: 1084 passed, 4 skipped, of which **116 are new**.
Lint and format are clean on every changed file.

Whole-repo `npm run lint`, `npm run format:check`, and `npm run test:e2e`
reported failures in the **concurrent lean-catalog task's uncommitted files
only** (`supplier-products-queries.ts`, `handle-curated-lane.ts`,
`ingest-product.ts`, `intake-gate-repository.ts`, `e2e/cj-products.spec.ts`, and
the in-flight `/products` rewrite). None of those files is in PR #40, whose base
is `develop`.

## Migration-numbering collision, and a real mistake worth recording

The migration was generated inside an isolated `git worktree` at `develop` so
the concurrent task's uncommitted schema edits would not be swept into it. When
copying the artifacts back into the shared working tree, `drizzle/meta/`
`_journal.json` and `0013_snapshot.json` were **overwritten**, destroying the
concurrent task's journal entries for `0013_lean_supplier_intake` and
`0014_sharp_tarot` and their `0013` snapshot.

Both were reconstructed and verified: `0014_sharp_tarot.sql` is purely additive
(five enums, three tables, and indexes/FKs touching only those tables), so the
post-`0013` state is exactly the `0014` snapshot minus those additions. The
rebuilt snapshot restores the `id`/`prevId` chain and matches
`0013_lean_supplier_intake.sql`'s own five tables and five enums exactly. The
journal's `when` timestamps for those two entries were re-derived from the SQL
files' modification times and are approximations, not the originals.

**Lesson:** never copy generated `drizzle/meta/` artifacts into a shared working
tree by filename. The snapshot and journal are a chained, shared structure; two
concurrent tasks generating migrations will always collide on the next index.
Generate in isolation, then either rebase onto the other task's migrations or
keep the migration only on its own branch.

## Documentation delta still required (blocked by collision)

`hot.md`, `index.md`, [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]],
[[ADR-002-sals3-taxonomy-and-cj-category-mapping]],
`agent-operating-contract.md`, `team-profile-and-collaboration-preferences.md`,
`sals3-turnover-prompt-template.md`, and
`universal-category-variation-taxonomy-reference.md` are all **modified by the
concurrent lean-catalog task** in the vault working tree and were deliberately
left untouched. The following edits are still owed once that task lands:

1. **`hot.md` → "Incomplete or placeholder"**: the line _"No product/variant/offer
   model, supplier import workflow, ... exists"_ is no longer accurate for the
   product/variant/offer model. Replace with a pointer to this note, stating
   persistence-only scope, migration `0013_cold_timeslip` unapplied, and PR #40
   unmerged.
2. **`hot.md` → "Current build priorities" item 3**: strike
   `ProviderProductReference` / `ProviderVariantReference` / `OfferSupplierBinding`
   as built (schema and draft-flow writers), keeping order routing unbuilt.
3. **`hot.md` → "Current build priorities" item 7**: mark Product, Variant,
   Offer, revision, and audit entities as persisted; Media, candidate,
   compliance, evidence, and mapping entities remain open.
4. **`hot.md` → `related` frontmatter and "Recent session notes"**: add
   `[[sals3-portal-canonical-product-catalog-backend]]`.
5. **`index.md`**: add this note under the `sals3-portal` implementation notes.
6. **[[ADR-016-google-merchant-center-product-feed-compliance]]**: its
   `implementation_status: not-started` is now `schema-shipped-unapplied` for
   Decision §2; §1, §3, §4, and §5 remain not started. (ADR-016 is *not*
   currently modified in the vault, so this edit is safe to make now — it was
   left out only to keep this unit's vault change to one new note plus the
   implementation spec.)
## Vault updates applied, and the collision they were held behind

`hot.md`, `index.md`, [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]],
[[ADR-002-sals3-taxonomy-and-cj-category-mapping]], `agent-operating-contract.md`,
`team-profile-and-collaboration-preferences.md`,
`sals3-turnover-prompt-template.md`, and
`universal-category-variation-taxonomy-reference.md` were all **modified by the
concurrent lean-catalog task in the vault working tree** while this unit was
being written, so none of them could be edited there without overwriting work
in flight.

The two that this unit genuinely owed were instead applied to `develop`'s
**committed** versions on the documentation branch, which touches no other
task's working copy at all:

- **`hot.md`** — the "Incomplete or placeholder" line that read _"No
  product/variant/offer model ... exists"_ is struck through and replaced with
  the persistence-only scope, the unapplied migration, and a pointer here;
  build priority 3 now records `ProviderProductReference`,
  `ProviderVariantReference`, and `OfferSupplierBinding` as built while keeping
  order routing open; build priority 7 is marked partially done with the exact
  entities still missing; and this note is added to `related` and the recent
  session-note list.
- **`index.md`** — this note is listed under _Catalog and supplier pipeline_.

Merging that branch will conflict with the concurrent task's own `hot.md` and
`index.md` changes. That is the ordinary two-branch case and resolves by taking
both sides: the edits sit in different bullets and different sections.

Still genuinely untouched, because this unit changes nothing in them: ADR-002,
ADR-013, `agent-operating-contract.md`,
`team-profile-and-collaboration-preferences.md`,
`sals3-turnover-prompt-template.md`, and
`universal-category-variation-taxonomy-reference.md`.

[[ADR-016-google-merchant-center-product-feed-compliance]] was not held by the
concurrent task and is updated directly: `implementation_status` moves to
`schema-columns-shipped-migration-unapplied` for Decision §2 only, with §1, §3,
§4, and §5 explicitly still not started.

## Owner decisions this unit surfaces

1. **Canonical-vs-per-seller Product** (see above). Recommendation: keep the
   canonical model, since it is what §4.2 and ADR-006 describe, and revisit only
   if a second real seller sources an overlapping `pid`.
2. **Cross-seller offers on a stewarded product.** Implemented as specified —
   a non-steward gets offers but no editorial access. Whether a seller should be
   able to list against editorial content they cannot see is a product question,
   not a technical one.
