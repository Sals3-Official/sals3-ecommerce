---
tags: [sals3, sals3-portal, taxonomy, category-picker, cj-mirror, production-rollout, ux, session]
aliases:
  - Taxonomy v1 Production Rollout
  - Category Picker Compact View
  - Part 48
created: 2026-08-15
updated: 2026-08-16
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-portal-cj-to-sals3-category-mapping-pilot]]"
  - "[[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]"
  - "[[sals3-session-2026-08-15-part46-cj-evidence-field-capture-and-points-ledger]]"
  - "[[sals3-turnover-prompt-template]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-15/16, part 48 — Taxonomy v1 goes live, and the category picker gets a Shopee-style compact view

> [!NOTE] Numbering note
> This was originally drafted as "part 47" and briefly merged to `develop`
> under that name. A separate, earlier session (#88,
> `docs/session-part47-and-taxonomy-v1`) had already claimed that number for
> its own note ([[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]])
> covering `sals3-portal` PRs #81-87 - the actual Taxonomy v1 build (option
> mapping wired end to end, supplier change detection shipped, Sals3 Taxonomy
> replaced with v1/Google Product Taxonomy). Neither session could see the
> other's number was taken, since neither had merged when each checked. That
> note is chronologically first and rightfully keeps "part 47"; this one is
> renumbered to "part 48" while resolving #88's merge conflicts against
> `develop`. Read #88's note first for the taxonomy v1 build itself - this
> one continues straight from it, covering what broke in production
> afterward and how the picker's UX was reworked.

The seller-facing Sals3 category picker (`sals3-portal`) was built, shipped
to production, hit two real production bugs, got fixed, had its one-time
seed infrastructure cleaned up, and was reworked twice more for UX — six
merged PRs (#91–#96) across this session and the one immediately before it.
All work merged to `develop`.

## 1. The original build — sellers pick their own real Sals3 category (PR #91)

`sals3-portal` [PR #91](https://github.com/Sals3-Official/sals3-portal/pull/91),
"Let sellers pick a real Sals3 category directly in the editor" — 25 files,
+1,640/-218, merged 2026-08-15. Reverses [[ADR-014-admin-portal-platform-governance-and-global-controls|ADR-014's]]
Admin-Portal-only assignment for category-mapping governance: sellers now
assign a real, curated Sals3 Taxonomy v1 category to their own product
directly from the product editor's Basic Information tab, replacing a
retired decorative "Sals3 Category" L1 dropdown.

- **Per-seller, per-product, not platform-wide** — a seller's pick changes
  only the one product they had open, never another product or another
  seller's catalogue. An earlier iteration of this same branch reused a
  shared CJ-category-keyed governance table; the owner reversed that the
  same day categorising is each seller's own business call, on their own
  risk, not a shared cross-tenant mapping decision.
- **Server-validated, never invented** — `sals3CategoryCode` is resolved
  against the real Sals3 Taxonomy v1 table before any write; an unrecognised
  code refuses cleanly.
- **The "CJ Category" field (read-only supplier evidence in Specifications)
  stays untouched** — sourced only from `supplierCategoryPath`, with a
  dedicated regression test proving this pick can never leak into it.
- **A reminder, not a publish blocker** — a missing seller-declared category
  (distinct from the pre-existing CJ auto-mirror fallback, which already
  resolves a plausible category for almost every CJ-sourced product) surfaces
  as a `WARNING`, never a `BLOCKER` — retroactively blocking every already-live
  product that predates this picker was rejected as the wrong call for what
  is the seller's own business risk, not a technical gate.
- Two independent adversarial reviews (each catching real, since-fixed
  issues) plus an owner review pass — which reversed the platform-wide
  design and downgraded the blocker to a warning — happened before this PR
  opened.

## 2. Production bug: the picker searched CJ's mirror, not the real taxonomy (PR #92)

`listSals3CategoryV1Options` (`src/modules/catalog/taxonomy/v1-reference.ts`)
selected the whole `sals3_categories` table with no filter. That table holds
two unrelated row sources: the frozen Sals3 Taxonomy v1 extraction (Google
Product Taxonomy, 5,595 rows, every code prefixed `CAT-GGL-`) and
`cj-mirror.ts`'s `ensureMirrorCategoryRow`, which silently inserts one row
per unmapped CJ supplier category, named verbatim as CJ's own observed
category text (`code = CJ-<externalCategoryId>`). Live evidence: a seller
searched "fedora" in the picker and got a match, even though the real v1
sheet has no such term — it was matching CJ's own mirrored language, exactly
what this picker was built to move sellers away from.

Fixed with `.where(like(sals3Categories.code, 'CAT-GGL-%'))`. Regression test
added (`v1-reference.test.ts`) that inspects drizzle's `queryChunks` for the
literal `CAT-GGL-` pattern rather than trying to serialize the whole
condition object (drizzle's `SQL` condition is circular — `JSON.stringify`
throws).

## 3. Production had zero real v1 rows (PR #93, PR #94)

After the filter fix shipped, the picker still returned no matches for any
search term. A purpose-built, read-only, `CRON_SECRET`-authenticated
diagnostic endpoint (`/api/internal/catalog/taxonomy/status`,
[PR #93](https://github.com/Sals3-Official/sals3-portal/pull/93), same
break-glass pattern as the existing `evaluate-tick.yml` — no Vercel dashboard
access or raw DB credentials needed) confirmed why: production had **0 real
v1 rows and 3 CJ-mirror rows only**. The v1 seed had never actually run
against production.

A second one-time endpoint (`/api/internal/catalog/taxonomy/seed-v1`,
[PR #94](https://github.com/Sals3-Official/sals3-portal/pull/94),
additive-only via `onConflictDoNothing({ target: sals3Categories.code })`,
same `CRON_SECRET`/`workflow_dispatch` trigger) inserted the real 5,595-row
extraction directly from `src/lib/db/seed-data/sals3-taxonomy-v1.json`. Run
once, confirmed via the status endpoint (now 5,595 real rows) and by Bogs
directly in the live picker (screenshot). The seed endpoint, its function,
tests, and workflow were then **removed**
([PR #95](https://github.com/Sals3-Official/sals3-portal/pull/95)) — its job
was done, it was never meant to be reusable. The read-only status
endpoint/workflow stay, for any future troubleshooting.

## 4. Category picker UX: compact view + repositioned beside Product Name

Two explicit requests from Bogs, both shipped in
[PR #96](https://github.com/Sals3-Official/sals3-portal/pull/96)
(`src/components/products/editor/Sals3CategoryPicker.tsx`,
`BasicInformationSection.tsx`):

- **Compact/read-only display once a category is decided.** Before: the
  component always rendered an open search `<input>` on load, regardless of
  whether the product already had a real, saved category — so an
  already-decided field looked exactly like "still needs picking." Reference
  supplied: Shopee Seller Center's "Category" field, a plain-text value + a
  small pencil "Change" button, never an open input sitting there unprompted.
  The component now has three states (`mode: 'compact' | 'search' |
  'confirm'`): `compact` whenever `savedPath ?? currentPath` is non-null and
  the seller hasn't clicked "Change"; `search` for the original
  filter-5,595-rows-by-substring UI, shown only on first pick or after
  "Change"; `confirm` for the pick + required reason (>=8 chars) + Save step,
  unchanged. Saving returns to `compact`, not back to an open search box —
  that reset-to-search-on-save behaviour was the second half of the original
  complaint.
- **Moved beside Product Name.** The picker used to render as its own
  full-width block below the entire Basic Information 2-column grid. It now
  sits inside that grid, directly after Product Name (same row).

## 5. A real accessibility subtlety, worth keeping (see [[sals3-skills]] lesson 75)

Giving the compact view's "Change" button the same `id` as the section's
`<Label htmlFor="editor-sals3-category-v1">` (needed so
`getByLabelText`/screen-reader users can still find *a* control for that
label in every state) silently overrode the button's own visible text as its
accessible name — the label's text wins over a labelable element's own
content per HTML/ARIA name computation. Fixed with an explicit
`aria-label="Change category"` on the button, which wins back a sensible name
without breaking the label association.

## 6. Verification

Full `npm run verify` (lint, format:check, typecheck:clean, build, test:run,
test:e2e) run clean before every commit and push, on both branches:
- `chore/remove-taxonomy-seed-v1-endpoint` (PR #95): 177→ files unaffected in
  count, 5 files deleted (313 deletions).
- `feat/category-picker-compact-view-and-layout` (PR #96): 179 test files /
  1638 tests passed (4 skipped), 78 e2e passed (6 skipped).

Both PRs' CI was independently re-checked against the real GitHub Actions job
logs (not just the green checkmark) before merging — confirmed genuinely 0
failures; the only "error"-looking log lines are tests deliberately
exercising no-database-configured code paths, plus one unrelated GitHub
infra notice (Node 20→24 runner deprecation). Merged to `develop` on Bogs's
explicit "merge both."

**Not verified live in a browser.** The picker's states require a real
logged-in seller session and a real product row with a resolved category
(`?productId=<uuid>`, `requireDropshipperAccount()`) — fixture mode
(`?fixture=...`) never wires the category picker at all, by design. This gap
was disclosed rather than silently skipped; the 12 passing
`Sals3CategoryPicker.test.tsx` unit tests are the actual verification for
this change.

## 7. Open item this session surfaced, not resolved here

[[ADR-002-sals3-taxonomy-and-cj-category-mapping]] still describes "Sals3
Taxonomy v0" (a 1,345-row internal workbook) as the current, adopted
taxonomy. The real, live sals3-portal code — confirmed extensively this
session — has already moved to "Sals3 Taxonomy v1" (the Google Product
Taxonomy, 5,595 rows, `CAT-GGL-` prefix), and nothing in this wiki documents
that v1 exists at all (a full-vault grep for "Taxonomy v1", "CAT-GGL", and
"Google Product Taxonomy" outside code found zero hits). Bogs flagged that
"one entry in the ecommerce wiki has a problem" without naming it; ADR-002 is
the strongest candidate found by inspection but has not been confirmed as
the intended entry, and has deliberately not been rewritten yet — see the
current [[hot]] for the open flag, and confirm with Bogs before touching
ADR-002 itself.

## 8. Session close-out: turnover prompt + this vault update

Bogs asked for a copy-paste turnover prompt for the next agent before any
vault update started - delivered as a `.txt` file (not stored in the vault;
per [[sals3-turnover-prompt-template]] it's a live handoff artifact, not the
archive). It corrects a real finding from this session: the turnover
template's default vault path (`E:\SALS3 2nd brain`) is itself stale - that
standalone vault was marked superseded/frozen on 2026-08-04 (commit
`d17a0e4`), with everything merged into this repo's `docs/Wiki/`. Anyone
still pointing a fresh agent at the old standalone vault path is handing them
a dead end.

This note, the [[hot]] updates, and [[sals3-skills]] lesson 75 were first
committed on branch `docs/taxonomy-v1-production-rollout-session-note` (off
`develop`) and opened as PR #89 - which merged (2026-08-15) before a
follow-up commit renaming this note from "part 47" to "part 48" could be
included, orphaning that fix (see [[sals3-skills]] lesson 73 for this exact
failure mode - a merged PR can orphan uncommitted follow-up work from the
same session). Rather than opening a third PR for a one-file rename, the fix
landed here instead, folded into resolving #88's own merge conflicts against
`develop` - both notes needed the same renumbering fix at the same time, and
#88 was already touching `hot.md` and adjacent notes for unrelated reasons.
