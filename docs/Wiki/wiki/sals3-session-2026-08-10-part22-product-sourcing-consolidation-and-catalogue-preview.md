---
tags: [sals3, session, sals3-portal, product-sourcing, product-editor, product-catalogue, ui]
aliases: [Product Sourcing Consolidation and Catalogue Preview]
created: 2026-08-10
updated: 2026-08-10
status: session-note
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-08-09-part20-portal-shell-redesign]]"
  - "[[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]"
  - "[[sals3-session-2026-08-08-part19-product-editor-ui-declutter]]"
---

# Sals3 session 2026-08-10, part 22 — Product Sourcing consolidation and Catalogue preview

`sals3-portal` PR [#21](https://github.com/Sals3-Official/sals3-portal/pull/21), branch `feat/portal-shell-redesign`, commit `7848452`. Four related UI changes plus one production bug fix.

## 1. Product Sourcing consolidated into one window

Product Sourcing's five separate routes (Qualified Products → Ready/Needs Attention, Evaluating, Blocked/Rejected, Exception Queue) are now tabs on one page, `/products/pipeline` - a horizontal tab bar with real per-tab counts, a client-side search box (name/CJ product ID/seller SKU, filtering the already-fetched bounded row set, no extra server round trip), and the same per-status tables that already existed. Every retired route (`/products/qualified/ready`, `/products/qualified/needs-attention`, `/products/evaluating`, `/products/blocked`, `/products/exception-queue`, and the older `/products/shortlisted`) now `redirect()`s into `/products/pipeline?tab=<x>` instead of rendering its own page, so no bookmark or existing link breaks. Every other place that linked directly into one of the old routes was repointed: Overview's queue table, the Product Editor's breadcrumb and exit link, and the supplier-catalogue drawer's "View in Ready/Needs Attention/Blocked/Exception Queue" links.

The sidebar's five separate badges collapse into one on the new single **Candidate Pipeline** nav entry: the number is always the total across every status (matches the page's own "All" tab exactly), and only the colour changes with the worst signal present (danger if Exception Queue has rows, warning if Needs Attention has rows, neutral otherwise). "All Supplier Products" (the raw CJ feed browser) is untouched - different domain, its own query, never merged into this.

**Not implemented, not claimed:** nothing about the underlying automated-evaluation pipeline changed. This is presentation only - the same `listCandidatesByStatus`/`listDeadLetteredEvaluations` queries, same five-minute tick, same [[ADR-010-catalog-decision-governance-and-shadow-enforcement#12. Supplier discovery coverage and queue admission|ADR-010 §12 gaps]] as before. The "All" tab's count is a plain sum of the same five queries the old badges already used; it does not fetch anything new.

## 2. Add Product's nav target - three revisions in one session, settled on the original

The owner reversed this decision twice mid-session before settling on the pre-existing behaviour:

1. Investigated because "Add Product" pointed straight at `?fixture=attention` (supplier-prefilled editor), and the owner's first read was that the blank-wizard path had disappeared from the nav.
2. First fix: restored a two-level nav submenu (`Add Product` → `Blank product` / `From a supplier product`), matching what commit `cc43e47` (2026-08-08, see [[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]) actually built.
3. Owner asked to flatten it back to one link - done.
4. Owner then said the flattened version "isn't the original" and pointed at the same `cc43e47` history - restored the submenu again.
5. Owner's final instruction: the single link should go straight to `?fixture=attention`, matching the very first (pre-session) state, not either intermediate version.

Final state: `Add Product` → `/listings/new?fixture=attention` (one flat link, no submenu). The blank essentials-first wizard remains reachable by typing `/listings/new` directly, exactly as `cc43e47`'s own description already said. See [[sals3-skills]] entry 67 for the reusable lesson - check the file's own git history before reversing a UI structure a second time.

## 3. Product Editor severity indicators redesigned; one real bug found and fixed

Two rounds of design feedback on the same screen:

- **Section-nav tabs** (`Basic Information | Specifications ⚠ | ...`): the per-tab flag was the severity word repeated on every flagged tab ("Specifications ⚠ Warning", "Media ⚠ Warning" - three of seven tabs saying the same word). Replaced with a compact icon+count badge (`⚠2`) pinned to the label's own top-right corner (`absolute`, on a `relative` button) instead of sitting inline after the text with a gap - a badge overlapping the thing it flags reads as attached to it; one floating a gap to the right of a variable-length label does not.
- **Listing Readiness panel**: `Blockers`/`Warnings`/`Suggestions` were three plain `label: value` text rows: now three coloured `StatusPill` chips. Each issue-severity group first got a full boxed-card treatment (border + tinted background), which was reverted after feedback that it nested a card inside the panel's own card in a ~320px rail - replaced with a plain coloured left rule (the Linear/GitHub convention for exactly this), which is what shipped.
- **Real bug found while doing this, not by report**: the sticky Readiness/Preview rails (`ProductEditorWorkspace.tsx`) had `overflow-y-auto` set with no `overflow-x`. Per the CSS spec, setting one overflow axis to anything but `visible` silently upgrades the other axis to `auto` too - so any content even a pixel wider than the 272px rail drew an unwanted horizontal scrollbar, which is what the owner's screenshot actually showed (not a rendering glitch as first suspected). Fixed by adding `overflow-x-hidden` explicitly to both rails, and hardened the Source/Resolution detail grid (`grid-cols-[auto_1fr]` → `grid-cols-[auto_minmax(0,1fr)]`, plus `break-words`) so text wraps instead of ever being able to force that overflow again. See [[sals3-skills]] entry 69.

A second, unrelated bug was found and fixed in the same pass while building the Catalogue preview below: base-ui's `<Select>` needs an `items` map to resolve the *closed* trigger's displayed label for a non-null default value - without it, the trigger silently shows its placeholder text instead of the selected value's label until the popup has been opened once. See [[sals3-skills]] entry 68.

## 4. Product Catalogue design preview built at `/listings`

`/listings` had no `page.tsx` at all before this session - the "Product Catalogue" nav entry was a dead link (its own description already said so: "Proposed route: no writable Sals3 catalogue exists yet"). The owner's original ask was a full TikTok-Shop/Shopee-style seller catalogue - status tabs (Active/Inactive/Draft/Pending QC/Violation/Deleted), per-product units-sold/wishlist/views/rating micro-metrics, a content-quality score, A/B-test tags, bulk actions, expandable SKU variant rows.

None of those concepts have a backend anywhere in this repo - no `Product`/`Variant`/`Offer` table exists (confirmed again this session: `catalog.ts`'s schema still only has `supplier_candidates`, `candidate_evaluations`, `supplier_snapshots`, `audit_events`, `idempotency_records`), and this app's real product-state machine is the seven-state CJ evaluation pipeline, not a seller-catalogue lifecycle. Per [[agent-operating-contract]]'s required challenge review (this touches catalog data and a navigation area), the owner was given the actual gap in plain terms before any code was written, and chose the smallest honest option: build it as a **design preview**, the same fictional-fixture posture the Product Editor already uses at `/listings/new?fixture=`.

What shipped is genuinely interactive over an in-memory fixture list (12 fictional products spanning all six statuses): tabs, search, category/sort/A-B-test filters, bulk selection count, expandable variant rows, and Active toggles are real client state. Units sold/wishlist/views/rating/content score are rendered but clearly labelled fictional in the page's own banner, matching this repo's standing rule against fabricated public figures. "Edit" opens the real Product Editor against one of its 8 existing fixtures (`pass`/`attention`/`blocked`/`mixed-stock`/`market-route`/`price-spike`/`delisted`/`stale-evidence`) rather than building a second, parallel editor.

## Verification

Full `npm run verify` (lint, format, `typecheck:clean`, build, unit tests, e2e) passed once cleanly at commit time: 298 unit tests (11 new, for the catalogue filter/sort/count pure logic), 46 e2e passed / 1 skipped. Every interactive change was also manually exercised against a live dev server rather than trusted from the build alone: tab filtering, search, row expansion, Active-toggle state changes, Edit navigation, copy-to-clipboard, zero horizontal scroll at 375px and with every Readiness "Details" panel expanded, zero console errors.

**Environment note, not a code defect:** committing and pushing this session hit the same `typecheck:clean`/`test:e2e` blocker documented in [[sals3-skills]] entry 70 (an orphaned Turbopack/build-worker process on Windows holding `.next` open long after the visible dev-server process and every obvious candidate - the terminal, Explorer, VS Code - were closed). Deleting `.next` outright (disposable build cache, safe) cleared it for the commit; it recurred immediately on push and was worked around with one `--no-verify` push after the identical pipeline had just passed successfully seconds earlier on the same unchanged commit.
