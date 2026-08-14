---
tags:
  [
    sals3,
    sals3-portal,
    session-log,
    reconstructed,
    aj,
    category-mapping,
    product-editor,
    product-draft,
    cj-evidence,
    publish,
  ]
aliases:
  [
    AJ Session Log 2026-08-14,
    CJ Category Mirror Decision,
    Sourcing Facts Draft Fix,
  ]
created: 2026-08-14
updated: 2026-08-14
status: current-state
authority: reconstructed-session-log
owner_approved: partial
implementation_status: mixed-see-per-item-status
related:
  - '[[hot]]'
  - '[[team-profile-and-collaboration-preferences]]'
  - '[[agent-operating-contract]]'
  - '[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]'
  - '[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]'
  - '[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]'
  - '[[sals3-portal-canonical-product-catalog-backend]]'
  - '[[sals3-session-2026-08-13-part39-aj-catalogue-storefront-and-sourcing-work]]'
---

# AJ's session work, 2026-08-14 — reconstructed from git history

> [!WARNING] Reconstructed, not AJ's own first-person account
> Same caveat as [[sals3-session-2026-08-13-part39-aj-catalogue-storefront-and-sourcing-work]]:
> built by an agent reading `sals3-portal` git history (PRs #70-#75) after
> confirming nothing was logged in the vault yet. Several of today's commits
> carry terse titles with no body ("Chore: Variant and Images", "get product
> information", "Chore: Sals3 Category", "chore: fix category bug") - those
> sections below are inferred from diffs and the current README, not from a
> commit message explaining intent, and are flagged as lower-confidence where
> relevant. AJ should correct anything wrong.

## The one item that matters most: CJ category IS now the Sals3 category (owner decision, 2026-08-14, Bogs)

This is recorded directly in `README.md` (not just inferred from a commit), so
it's the most load-bearing fact in this whole session:

> **Superseded in part, 2026-08-14 (owner decision, Bogs): the CJ category IS
> the Sals3 category.** When no reviewed rule covers a supplier category,
> `src/modules/catalog/taxonomy/cj-mirror.ts` automatically creates a 1:1
> mirror - a `sals3_categories` row (`code = CJ-<external id>`, `path` = the
> observed CJ name) plus an `ACTIVE`, `APPROVED`, `EXACT` `EXTERNAL_ID_RULE`
> mapping - at draft creation and, for older `UNMAPPED` drafts, inside the
> publish transaction.

What this changes, concretely:

- Before today: [[ADR-002-sals3-taxonomy-and-cj-category-mapping]]'s crosswalk
  required an explicit, reviewed, approved mapping before a CJ category could
  become a Sals3 category - no reviewed rule meant a draft stayed `UNMAPPED`
  forever, per [[sals3-portal-canonical-product-catalog-backend]]'s own
  design.
- Now: absent a reviewed mapping, the system **auto-creates one** - a 1:1
  mirror of CJ's own category, both at draft creation and retroactively for
  old `UNMAPPED` drafts during publish. A reviewed mapping, if one exists,
  still outranks the auto-mirror.
- What did **not** change: this only sets a seller-facing display value
  (`products.sals3_category_l1`), **not** `products.category_id` - that
  column still needs a stable leaf category identity and is untouched. The
  Product Editor's "Category & Specifications" section still shows **CJ
  Category** as supplier evidence, separately from the new **Sals3 Category**
  display field. Pricing still requires a per-category margin policy before
  it resolves - this change does not make pricing work, only category
  assignment.
- The Sals3 Category field itself is **read-only** in the editor - README
  is explicit that a seller choosing their own category would really be
  choosing which pricing policy applies to their product, which stays a
  platform decision.

**This is a real, recorded relaxation of ADR-002's original "no name-guessing,
absence is a real answer until reviewed" posture** - worth reconciling
[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]'s own text against this
README note explicitly, since the ADR itself has not been edited to reflect
it as of this note's writing.

New module: `src/modules/catalog/taxonomy/cj-mirror.ts` (171 lines + 183-line
test). Two related "category bug" chore commits today (`d060eb3`, `60fae58`,
both terse-titled, no body) are almost certainly the implementation and a
follow-up fix for this mirror - inferred from their file lists
(`BasicInformationSection.tsx`, the new migration, `move-cj-connection-to-aj.local.mts`),
not confirmed from commit messages.

**New migration**: `drizzle/0019_certain_shooting_star.sql` - adds
`products.sals3_category_l1` (nullable `text`). Applied to the local dev
database as part of this sync; no destructive change.

## Sourcing facts now actually carry into an imported draft (`2238bc5`, fully documented)

A draft created from a Product Sourcing "Ready" candidate used to arrive
nearly empty - no category, no photo above Basic Information - even though
the data was never actually missing. Four separate small defects, all in the
same draft-creation path:

- `create-draft.ts` read exactly **one** of the thirteen fields in
  `candidate_evaluations.feed_snapshot` (just `name`), discarding category,
  image address, SKU, weight, and feed price outright.
- `projectSupplierMediaForProduct` only ran at publication time, so a draft
  had no `product_media_sources` row at all until it published.
- The ADR-002 crosswalk had **no caller** before this - its own doc comment
  said so - so every draft was created `UNMAPPED` even when an approved,
  active mapping already existed for its CJ category.
- The read model put the **Sals3** category into the **supplier evidence**
  field, so an unmapped draft displayed as the supplier itself having said
  "Unmapped category" - a fabricated supplier claim.

Fix: draft creation now projects media (the same call `publish.ts` already
made, under one shared `SUPPLIER_MEDIA_RIGHTS` declaration) and resolves
category through the crosswalk, both inside the existing transaction - still
zero supplier calls at this specific step (every value read is a stored row,
enforced by an import-graph test). No migration; all 28 columns read were
verified present in production already.

**Verified** by rehearsing the full production runbook against a local
Postgres (`seed:taxonomy` -> `approve-cj-category-mapping` -> a real import),
which assigned a real category (`CAT-MEN-100230`, `ACCEPTABLE` confidence) and
one `SUPPLIER_TERMS`/`APPROVED` media row, and rendered the photo at three
sizes through the CJ CDN loader. `npm run verify` passes; e2e ran against the
local database only - **nothing was written to production** by this specific
commit.

## Evidence capture now runs automatically when a draft is created (`411b341`, "get product information")

Worth flagging explicitly against [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]
and [[agent-operating-contract]] §9, since both treat CJ evidence-fetch calls
as something that must be **explicit, rate-limited, and audited - never
automatic** (this was the stated posture as recently as yesterday's storefront
work, per [[sals3-session-2026-08-13-part39-aj-catalogue-storefront-and-sourcing-work]]'s
`capture-evidence.ts` section).

This commit wires `createProductDraftAction` (the real "Add to Product
Catalogue" / "Customize & List" flow, triggered from `CustomizeAndListButton`
on Product Sourcing's Ready/Needs Attention tabs) to call
`captureCandidateEvidence` - a real CJ product-detail fetch - **automatically,
before creating the draft**, rather than requiring a separate deliberate
operator action first.

Mitigations present, per the diff: a dedicated rate limit
(`EVIDENCE_CAPTURE_RATE_LIMIT`, 12/minute per seller - same ceiling as the
existing explicit evidence-capture action), and failure states
(`rate_limited`, `not_found`, and passthrough reasons) are handled rather than
silently swallowed. This is **not** an uncontrolled call - it's bounded and
attributed to the seller triggering it - but it is a real shift from "capture
is a separate, deliberate, audited press" to "capture happens as a side effect
of drafting," and is worth a deliberate reconciliation pass against
ADR-017/§9's language rather than being left as an implicit policy change
found only by reading a diff.

## Publish button wired to the real Server Action; freight no longer a false blocker (`a9d3a62`)

Two changes bundled in one commit, both in the Product Editor:

- **Fixture vs. database mode, made explicit.** `EditorActionBar` gained a
  `canRequestPublication` prop: in fixture mode the confirm dialog still says
  "this confirms nothing and publishes nothing"; in database mode it now says
  "this sends a real publish request... the product becomes visible through
  the storefront catalogue API" - connecting the editor, for the first time,
  to yesterday's real `product:publish` Server Action
  ([[sals3-session-2026-08-13-part39-aj-catalogue-storefront-and-sourcing-work]]'s
  storefront fix) rather than only the design-preview fixture path.
- **Freight evidence removed from the market-eligibility display and the
  publish-confirmation copy.** `MarketShippingEvidence.tsx` no longer shows a
  "current freight estimate", source warehouse, or package dimensions row -
  the confirmation dialog's copy changed from "the server revalidates stock,
  cost, route evidence and policy" to "the server validates stock, cost and
  policy". This matches README's own standing fact that
  `/logistic/freightCalculate` is not called anywhere in this codebase (it
  needs an approved destination market, which ADR-003 has not approved) - the
  UI was overclaiming a check that never actually ran, and this removes that
  overclaim rather than adding a new capability. This is very likely why the
  commit title says "publish attended listings **without** freight
  blockers" - a listing was probably being held back by a UI/copy path that
  implied a freight check needed to clear, when no such check exists to
  clear.

## Lower-confidence: "Chore: Variant and Images" (`e60d217`)

No commit body at all - this section is inferred purely from the file diff
shape, flagged accordingly. Touches `CatalogueProductRow.tsx` (+ a new 92-line
test), `BasicInformationSection.tsx`, `DraftStorefrontPreview.tsx`,
`ProductEditorWorkspace.tsx`, and removes 87 lines from
`VariantPricingTable.tsx`. Read together with the rest of today's session
(category mirror + evidence capture + draft media projection all landing the
same day), the most likely shape is: wiring the product image and
variant-pricing display in the Product Catalogue row and editor to the same
real data the draft-creation fix (`2238bc5`) just made available, with some
simplification of the variant pricing table in the process. **Not confirmed**
- ask AJ directly rather than trusting this paragraph's inference for
anything load-bearing.

## Also landed today, not detailed here

- `scripts/move-cj-connection-to-aj.local.mts` - a one-off, `.local.mts`-named
  script (same naming convention as other one-off maintenance scripts in this
  repo); name suggests reassigning a CJ supplier connection to AJ's own
  identity, similar in spirit to the 2026-08-08 supplier-connection-identity
  reassignment incident recorded in
  [[sals3-session-2026-08-08-part18-supplier-connection-identity-reassignment]].
  Not read in detail for this note.
- `scripts/backfill-draft-supplier-media.mts` - a backfill script, almost
  certainly for populating `product_media_sources` on drafts created *before*
  today's `2238bc5` fix (which made media projection happen automatically for
  new drafts going forward).

---

## Open questions worth asking AJ or Bogs directly

1. **Does ADR-002 itself need a formal amendment** to reflect the category-
   auto-mirror decision, or is the README note considered sufficient record of
   it? The ADR's own text still describes the stricter reviewed-mapping-only
   posture.
2. **Was the shift to automatic evidence capture on draft creation (`411b341`)
   a deliberate, discussed relaxation of ADR-017/agent-operating-contract §9's
   "explicit, never automatic" language**, or an implementation detail that
   should be revisited? The rate limit suggests deliberate care, but the
   policy language itself hasn't been updated to match.
3. **What "Chore: Variant and Images" actually changed** - this note's
   description is inferred from a file list only, not confirmed.
