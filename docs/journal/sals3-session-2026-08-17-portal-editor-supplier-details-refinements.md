---
tags: [session-note, implementation, sals3-portal, product-editor, supplier-details, category-picker, cj-integration, taxonomy-v1]
aliases: [2026-08-17 Portal Editor Supplier Details Refinements, Portal Basic Information Rework Part 2]
created: 2026-08-17
updated: 2026-08-17
status: merged
authority: historical-session
owner_approved: true
related:
  - "[[../Wiki/wiki/hot]]"
  - "[[../Wiki/wiki/agent-operating-contract]]"
  - "[[../Wiki/wiki/nextjs-component-security-code-rules]]"
  - "[[../Wiki/wiki/project-structure-installation-and-runbook]]"
  - "[[sals3-session-2026-08-16-portal-option-mapping-editor]]"
---

# 2026-08-17 — Portal Editor: Basic Information Rework and Supplier Details Refinements

## Scope

Bogs asked to check the vault for context before starting new `sals3-portal` work, then walked through a two-round redesign of the Product Editor's "Basic Information" tab and its adjoining supplier-evidence sections, driven by side-by-side screenshots comparing the current Sals3 Portal UI against a competitor (CJ Dropshipping's own seller admin) and against Sals3's own earlier screens. The session covered UI layout, an interaction redesign (search-first category picker → browse-first modal), a data-provenance investigation (CJ API points cost and endpoint sourcing), a real bug fix (a summary card not appearing until manual refresh), and two merged pull requests. Two more product/behavior decisions were made mid-session on the owner's explicit instruction: dropping a previously-mandated "reason" field from the category-save flow, and removing the "Pricing basis" panel outright.

Every code change in this session was made inside isolated git worktrees off the latest `develop`, per the standing rule that `sals3-portal`'s shared checkout is worked on concurrently by other agents and must never be used directly for a PR branch (see [[portal-shared-worktree-multi-agent]] in memory — not a vault page, but the persisted operating note this session followed).

## Starting state (recap, not new this session)

Before this session began, `sals3-portal` `develop` already had PR #97 ("harden option mapping editor") merged, which had wired up the variant option-mapping feature end to end: `VariantOptionMappingSection.tsx`, `saveOptionMapping`, `option-split.ts`, Taxonomy v1 preset axis-name prefills, and supplier cost/stock observed-at timestamps. See [[sals3-session-2026-08-16-portal-option-mapping-editor]] for that session's own detail. `hot.md` had not yet been updated to reflect that PR at the time this session started, which was flagged and corrected in memory (not in the vault) during this session's opening context check.

## Round 1 — PR #98: Basic Information layout, category picker rework, Supplier Details merge

**Branch:** `feat/product-editor-basic-info-rework` → **[PR #98](https://github.com/Sals3-Official/sals3-portal/pull/98)** ("Simplify Basic Information, browsable category picker, merge Supplier Details") — merged into `develop` at commit `7ae5b707c7c7d4b995fb5f3e54cc8a8d4b496a08` on 2026-08-15.

### What was requested

Four things, from annotated screenshots of the live Portal:

1. Make the "Product Name" / "Category" layout in Basic Information match a simpler competitor layout (CJ's own admin): plain label above value, no extra card/border around the category field, a pencil-only edit affordance instead of a text "Change" link.
2. Remove the helper paragraph under the category field ("Applies to this product only. Choose carefully — the wrong category can hurt how buyers find and trust this listing.").
3. Change the category-change interaction: clicking the edit control used to open an inline search box that showed nothing until the seller typed something. The ask was for the picker to **open immediately into a browsable selection**, not force typing first.
4. Merge the "Supplier-controlled evidence" block (nested inside Basic Information) and the standalone "Category & Specifications" card into one section, since both were "all uneditable" — renamed **"Supplier Details"**.

A fifth item surfaced mid-round: the "Option groups" summary card (in Variants & Pricing) was not showing up right after a seller finished naming and saving an option mapping — it only appeared after a manual page reload. Diagnosed as a real bug, not a design question, and fixed in the same PR.

### What was implemented

- **`Sals3CategoryPicker.tsx`** — full rework:
  - Compact (already-resolved) display: dropped the `rounded-lg border border-border bg-card p-3` wrapper so it visually matches the plain `flex flex-col gap-1.5` treatment of the other Basic Information fields.
  - Label shortened from `"Sals3 category (leaf, affects pricing and storefront)"` to plain `"Category"`.
  - Removed the trailing helper paragraph entirely.
  - Edit control is now icon-only (`Pencil`, no visible "Change" text), with `aria-label` carrying the accessible name since there's no visible label left on the button itself.
  - Replaced the old `mode: 'compact' | 'search' | 'confirm'` state machine with a `Dialog` (base-ui, via `@/components/ui/dialog.tsx`) that opens immediately on click into a **department drill-down tree**, built client-side (via `useMemo`) from the existing flat `{code, path}` taxonomy list by splitting each `path` on `" > "` — no schema or data-fetching change, since the full ~5,595-row Sals3 Taxonomy v1 list was already being sent to the client for the old search box.
  - A search box remains inside the dialog as an explicit shortcut for a seller who already knows the category name — it filters the same flat list by substring, same `MAX_RESULTS = 20` cap as before.
  - Confirm step (reason + Save, at the time) unchanged in spirit, just moved inside the dialog's last step instead of the old inline "confirm" mode.
  - Prop contract for `onSave` was `(code: string, reason: string) => Promise<...>` at this point in the session (the reason field itself was removed later, in Round 2).

- **`BasicInformationSection.tsx`** — removed the nested `<SupplierEvidenceBlock>` (badge, Supplier product ID / Original category / Last updated, "View Supplier Source Details" button) entirely; that content moved into the new merged section below. Dropped the now-unused `onOpenSourceDrawer` prop.

- **`SpecificationsSection.tsx`** — absorbed the supplier-identity block above its existing `GROUP_ORDER.map(...)` specification groups. New props added: `source`, `supplierCategoryPath`, `onOpenSourceDrawer`. Introduced a shared **`ReadOnlyField.tsx`** primitive (label optional, so it can be used both with its own label and inside `SpecificationField`'s existing external-label pattern) to de-duplicate the dashed read-only box styling that `SupplierEvidenceField` and `SpecificationField`'s locked-row markup had each hand-copied. `SupplierEvidenceBlock.tsx` was deleted outright once its only consumer moved to `ReadOnlyField`.

- **`ProductEditorWorkspace.tsx`** / **`types.ts`** — `EditorSectionCard id="specs"` title changed from `"Category & Specifications"` to `"Supplier Details"`; `EDITOR_SECTIONS`'s matching label updated the same way. The section **id** (`'specs'`) was deliberately left unchanged, since it's load-bearing for `sectionSeverity()`, `EditorSectionNavigation`, and several tests keyed on the literal string.

- **`VariantOptionMappingSection.tsx`** (the bug fix) — root cause: the "Option groups" summary card (`if (mappedAxisNames !== undefined && mappedAxisNames.length > 0) return <summary>`) was driven entirely by a **prop** (`mappedAxisNames`) that only updates once `router.refresh()` round-trips through the server and the read-model re-derives `optionAxisNames` from the database. Between "save resolved" and that refresh landing, the component kept rendering the editing form — which read as the summary never appearing. Fix: added local optimistic state (`savedAxisNames`), set from the just-submitted axis names the instant `onSave` resolves `ok: true`, combined with the prop as `effectiveMappedAxisNames = savedAxisNames ?? mappedAxisNames`. The eventual server-confirmed refresh still lands and either confirms or (on a concurrent edit) overrides the optimistic value.

### Verification (Round 1)

- `npm run verify` (lint → format → typecheck → build → unit tests → Playwright e2e) passed clean via both the pre-commit and pre-push husky hooks. **1,639 unit tests passed** (4 pre-existing skips), **78 e2e tests passed** (6 pre-existing skips).
- This incidentally *resolved* the local verify blockers that the prior 2026-08-16 session (PR #97) had hit — those were caused by stray files (`sals3-portal-optionfix/`, a copied `.next`) sitting inside the *shared* checkout, which don't exist in a clean isolated worktree.
- Manually confirmed the merged "Supplier Details" card rendered correctly via the `?fixture=pass` design-preview route (no database needed).
- **Not verified live:** clicking through the new category-picker dialog against a real, database-backed product in an actual browser session — the local Postgres (via a copied `.env.local`, safely gitignored) had **zero seeded products**. Covered instead by a full rewrite of `Sals3CategoryPicker.test.tsx` (dialog open/close, drill-down, breadcrumb, search fallback, save/error/loading states) and a new regression test in `VariantOptionMappingSection.test.tsx` for the summary-card fix.

## Round 2 — PR #99: drop category reason, CJ-default guardrail, remove Pricing basis, capture package dimensions

**Branch:** `feat/supplier-details-refinements` → **[PR #99](https://github.com/Sals3-Official/sals3-portal/pull/99)** ("Drop category reason, CJ-default guardrail, remove pricing basis, capture package dimensions") — merged into `develop` at commit `94f6e210b0b9e167a58138e2d17e3a20326624cf` on 2026-08-15 (same day; both PRs landed within about an hour of each other).

This round started from a fresh worktree/branch off the now-updated `develop` (PR #98 was already merged), driven by a new batch of annotated screenshots plus two research questions.

### 1. Supplier Details: further cleanup

- Removed the "Everything above is supplier-controlled evidence, selectable and copyable but not the seller's to edit..." intro note, and the "Attributes the supplier did not send are shown empty..." closing note at the bottom of the specifications list.
- Moved "View Supplier Source Details" to sit directly above the specification groups (where the removed intro note used to be), instead of directly under the identity fields.
- The now-unused `Lock` icon import was removed from `SpecificationsSection.tsx`.

### 2. Dropped the "reason" requirement from the category-save flow

Bogs's instruction: *"paki alis na din, no need sa reason"* — remove the Reason field, no longer needed at all. This reversed an explicit prior "owner decision 2026-08-15" documented in the code's own comments (the reason existed as "the seller's own record of why, not a governance review artifact"). Implemented end to end, not just in the UI:

- **`Sals3CategoryPicker.tsx`**: removed the `reason` state, the `<Input>`/`<Label>`/character-count-helper JSX, and the length gate (`reason.trim().length >= 8`) from `canSave`. `onSave`'s signature narrowed from `(code, reason) => ...` to `(code) => ...`.
- **`BasicInformationSection.tsx`** / **`ProductEditorWorkspace.tsx`**: `onDecideSals3Category` / `handleDecideCategory` narrowed the same way, dropping `reason` from the object passed to the server action.
- **`category-mapping-actions.ts`** (the Server Action): removed `reason: z.string().trim().min(8).max(500)` from `decideCategoryInputSchema`, removed it from the call into `decideProductSals3Category`, and softened the `invalid_input` refusal message (it used to say "...and give at least a short reason").
- **`decide-category.ts`** (the domain module): removed `reason` from the function's input type and from the `product.category_declared` audit-event payload.
- Test fallout fixed across `Sals3CategoryPicker.test.tsx` (full rewrite of the reason-related assertions), `category-mapping-actions.test.ts` (removed an entire test — "refuses a reason under 8 characters" — that no longer had anything to refuse), and `decide-category.test.ts`.

**Documented consequence, flagged explicitly to Bogs rather than silently dropped:** the audit trail for `product.category_declared` no longer records *why* a seller picked a category — only *what* and *when*. This is a real, intentional behavior change, not an oversight.

### 3. CJ-default guardrail on the category value

New instruction, from a screenshot of the category dialog: add a guardrail that turns the category value **red** with a **caution icon** whenever it's still the CJ-mirrored default and has never been explicitly confirmed by a seller — hovering the icon explains why.

- Threaded the existing `ProductEditorFixture.sals3CategoryDeclaredBySeller: boolean` (already computed by the read-model, previously only used to drive a separate "missing category" readiness issue) down into `Sals3CategoryPicker` as a new required `declaredBySeller` prop.
- When `effectivePath !== null && !effectiveDeclaredBySeller`: the value renders `text-red-600 font-medium`, with a `TriangleAlert` icon wrapped in the existing `Tooltip`/`TooltipTrigger`/`TooltipContent` primitives (an app-wide `TooltipProvider` already wraps the `(portal)` route group, so no extra provider was needed). Tooltip copy: *"Still defaulted from CJ's own category — nobody has confirmed this as a Sals3 Taxonomy v1 category yet."*
- Same optimistic-update lesson as the Round 1 bug fix, applied proactively this time rather than reactively: a local `justDeclared` boolean flips true the instant a save resolves `ok: true`, combined as `effectiveDeclaredBySeller = justDeclared || declaredBySeller`, so the guardrail clears immediately on save instead of staying red until a `router.refresh()` round-trip lands.
- New test suite `describe('CJ-default guardrail', ...)` added to `Sals3CategoryPicker.test.tsx`: shows/hides correctly, doesn't show when nothing is set at all ("Not set" already communicates that), and clears optimistically on save without waiting for a prop change.

### 4. Removed the "Pricing basis" panel entirely

Bogs asked whether this panel (in Variants & Pricing, showing per-variant "Category policy required" tiles) could be removed — "di ko na makita ang purpose neto." Before removing anything, traced its real purpose and every consumer of the data feeding it, reported back, and only removed it after Bogs confirmed.

**What it was:** the only place on the page showing server-resolved margin/pricing guidance (`resolveProductPricing()` in `src/modules/pricing/resolver.ts`) — margin rate, suggested price, which policy layer applied (category / product override / variant override). "Category policy required" specifically meant the category resolved fine but no margin policy existed yet for it in Settings → Market Rules.

**Confirmed before removal (via a dedicated trace, not assumption):**
- `variantGuidance` / `resolveFixtureVariantGuidance()` had exactly one consumer: `PricingBasisPanel`. Nothing else — not `ProductEditorWorkspace.tsx`, not any page.tsx — read it for anything else.
- The Review & Publish "Pricing" summary line (e.g. "$24.90 – $27.90 retail") is computed independently, straight from each variant's own `retailPrice` (`retailRange()` in `derive.ts`) — no path through `resolveProductPricing()` at all.
- No readiness/blocker logic for the `'variants'` section depends on the resolver's output; the string `"Category policy required"` only ever existed inside `PricingBasisPanel`'s own rendering.
- `resolveProductPricing()` itself (the resolver module) has other real callers (`create-draft.test.ts`, `publish.test.ts`) — only the *panel* and its prop-threading were removed, not the resolver.

**What was deleted:** `PricingBasisPanel.tsx` + its test file, `pricing-guidance.ts` (`resolveFixtureVariantGuidance`) + its test file, the `variantGuidance` prop from `ProductEditor.tsx` and both its call sites in `new/page.tsx` (which also dropped a now-unused `session` binding, since `session.sellerId` was its only remaining use), and the `pricingBasisSection` prop from `ProductEditorWorkspace.tsx`. `ProductEditor.test.tsx` had nine separate `variantGuidance={...}` render props removed. A stale `vi.mock('@/lib/seller-center/product-editor/pricing-guidance', ...)` in `new/page.test.tsx` was removed too, since the module it mocked no longer exists.

### 5. Package-dimensions research and capture

**The question:** could package dimensions (length/width/height) be pulled from CJ the same way "Packed weight (supplier)" already is, and would it cost anything extra?

**First-pass research (via `WebFetch` against CJ's own docs) found:** CJ's Product Details endpoint (`/product/query`) returns `variantLength`/`variantWidth`/`variantHeight`/`variantVolume` per variant (millimetres), alongside `variantWeight` — fields the codebase's CJ schema already declared for length/width/height but never actually used. Initial (incomplete) conclusion: since the codebase already calls `/product/query` for `packedWeight`, dimensions would ride along for free.

**Correction #1 (points cost):** Bogs pushed back — "no CJ points will be deducted?" A second, more targeted fetch of CJ's actual **"Points Resource Rules"** page (not just the generic rate-limit page checked initially) showed CJ does charge points per call: `/product/list` and `/product/listV2` cost **50 points/call**; `/product/query`, `/product/variant/query`, and `/product/variant/queryByVid` cost **10 points/call**. The first answer ("no cost at all") was wrong and was corrected explicitly.

**Correction #2 (which endpoint actually feeds today's UI, and when it runs):** a deeper trace found that the *currently displayed* "Packed weight (supplier)" / "Ships from (supplier)" fields are sourced from the **cheap list-feed** (`candidate_evaluations.feed_snapshot`, populated by `/product/list(V2)` at screening time — 50 pts, deliberately captured *before* spending detail-evidence points, per that schema's own doc comment), **not** from the detail-evidence pipeline (`capture-evidence.ts` → `/product/query`, 10 pts) as first assumed. Dimensions can **only** come from the detail endpoint — there is no list-feed or product-level equivalent.

Further trace established: the detail/evidence-fetch call is **human-triggered**, gated to product-draft creation (`createProductDraftAction`/`bulkCreateProductDraftsAction` → `captureEvidenceBeforeDraft`) — never automatic, never run on page render or in a loop. For a product created going forward through the normal "create draft from a candidate" flow, that call is a required step before the draft exists, so dimensions genuinely do ride along for free on an already-paid call. **But this is not a hard guarantee for the whole catalogue**: `create-draft.ts` tolerates a missing evidence snapshot rather than blocking (flagging `NO_PERSISTED_SUPPLIER_EVIDENCE` instead), and a real production incident on 2026-08-13 (documented in `capture-evidence.ts`'s own comments) left **31,274 `PASS` candidates with only 19 evidence snapshots between them**, producing at least four real product drafts with no captured evidence at all. Those rows, and any future ones created outside the currently-wired path, would simply show no "Package dimensions (supplier)" row — same as any other genuinely absent supplier field.

**What was implemented once the research was settled:**
- `src/lib/cj/enrichment-schemas.ts`: added `variantVolume: looseNumber` to `cjVariantSchema` (length/width/height already existed, unused).
- `src/lib/cj/evidence.ts`: extended `VariantEvidence` with `lengthMm`/`widthMm`/`heightMm`/`volumeMm3`; added `CandidateEvidence.packedDimensionsLabel: string | null` and a `formatPackedDimensions()` helper — one `"L×W×H cm"` reading **per distinct box size actually recorded** across a product's variants, deduplicated via a `Set`, joined for display (mirroring the existing convention `shipsFrom` already uses for its own array-of-raw-values-joined-for-display). Deliberately never averages, rounds to a "representative" single figure, or picks one variant's box and calls it the product's — consistent with this codebase's repeated "nothing is guessed, only what was actually received" convention.
- `src/modules/catalog/products/read-model.ts`: added `packedDimensionsLabel` to the local `evidenceSchema` (the read-model's own reduced parse of the `supplier_snapshots.evidence` JSON column), added it to the internal `SupplierFacts` type/`NO_SUPPLIER_FACTS`/`supplierFacts()` (sourced only from the richer evidence snapshot — the cheap feed has no equivalent), threaded it onto the fixture as `supplierPackedDimensionsLabel`, and added a new `"Package dimensions (supplier)"` row to `editorSpecifications()`'s `supplierFields`, right after `"Packed weight (supplier)"`. Like every other `supplierFields` entry, a `null`/missing value is silently omitted rather than shown as a placeholder.
- `src/lib/seller-center/product-catalogue/types.ts`: added the optional `supplierPackedDimensionsLabel?: string | null` field to `CatalogueProductFixture`, with a doc comment explicitly noting it is "only ever available once `capture-evidence.ts` has run for this product... not guaranteed for every row."
- New/updated tests: `evidence.test.ts` gained cases for a shared box size across variants (deduplicated to one reading), genuinely differing box sizes (both readings shown, comma-joined), and no variant having a complete length/width/height (`null`, not a guess). `read-model.editor-projection.test.ts` gained assertions that the new row appears with the right value and is correctly omitted when absent. `capture-evidence.test.ts` and `qualification.test.ts`'s local evidence-object test factories were updated with the new required fields.

### Verification (Round 2)

- Same full `npm run verify` gate, run three independent times this round: once at commit, once at push (both via the husky hooks, each requiring the Bash tool's timeout raised to 10 minutes since the hook runs the entire lint→format→typecheck→build→unit→e2e chain), and once more as a standalone re-run after Bogs explicitly asked to re-check before merging.
- Every run: lint clean, format clean, typecheck clean, build succeeds, **1,637 unit tests passing** (net of the Pricing-basis-panel test deletions and the new dimension/guardrail tests), **78 e2e tests passing**, 0 failures across all three runs.
- Additionally confirmed via GitHub's own remote CI on the PR itself: the `verify` GitHub Actions workflow passed (9m runtime), the Vercel preview deployment succeeded, and `gh pr checks` reported the PR as `MERGEABLE`/`CLEAN` before merge.
- Same standing limitation as Round 1: no live, database-backed browser click-through of the new dialog/guardrail/dimensions display — the local Postgres still had no seeded products at the time. Relied on the (substantially expanded) automated test suite instead.

## Open follow-ups (not done this session)

- **`hot.md` has not been updated** to reflect either PR #98 or #99. The canonical turnover procedure calls for a wiki-note update pass plus a vault commit before a handoff counts as fully done; this vault entry is that pass for the journal, but `hot.md` itself is still pending a separate edit.
- **Package-dimensions coverage gap**: the 2026-08-13 evidence-capture incident (and the fact that `create-draft.ts` tolerates a missing snapshot rather than blocking) means some real catalogue rows will show no "Package dimensions (supplier)" — and no "Packed weight" from the richer source either, though that field currently reads from the cheaper list-feed anyway. No backfill was scoped or requested this session.
- **No live database-mode QA pass** has been done on either PR's interactive surfaces (category dialog, option-mapping save, dimensions display) against a real seeded product — both PRs shipped on unit/component/e2e-fixture test coverage plus green CI, not a manual click-through with real data.
- The still-open item from the 2026-08-15 pricing-resolver/PDP audit (the **product-level** SKU hash still rendered as visible text on the PDP, distinct from the variant-level fix that already landed) was not touched this session and remains open.

## Git state

| PR | Branch | Merge commit | Status |
|---|---|---|---|
| [#98](https://github.com/Sals3-Official/sals3-portal/pull/98) | `feat/product-editor-basic-info-rework` | `7ae5b707c7c7d4b995fb5f3e54cc8a8d4b496a08` | Merged 2026-08-15 |
| [#99](https://github.com/Sals3-Official/sals3-portal/pull/99) | `feat/supplier-details-refinements` | `94f6e210b0b9e167a58138e2d17e3a20326624cf` | Merged 2026-08-15 |

Both PRs were built in isolated `git worktree`s off the latest `develop` at the time of branching, per the shared-checkout discipline; the shared `sals3-portal` checkout itself was never used to build either PR and was left untouched throughout.
