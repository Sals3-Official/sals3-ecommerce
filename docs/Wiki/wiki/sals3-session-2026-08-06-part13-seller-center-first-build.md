---
tags: [sals3, session, seller-center, sals3-portal, design-system]
aliases: [Seller Center First Build Session]
created: 2026-08-06
updated: 2026-08-06
status: current-state
authority: implementation-state
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-global-seller-center-ux-blueprint-proposal]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[sals3-portal-code-review-2026-08-06]]"
  - "[[sals3-portal-strict-reference-rule]]"
---

# Session — Seller Center, first build (2026-08-06)

## What happened

Bogs imported a Claude Design mockup ("Seller Center.dc.html", project
"Seller center portal redesign") specifying 7 seller-facing screens
(Overview, Orders, Listings, Inventory, Finances, Payouts, Market rules)
and asked to implement it into `sals3-portal`, renaming that app "Seller
Center." This is Seller Center's first real code in either repository.

## Decisions confirmed by Bogs before building

1. **Visual style:** adapt the mockup's screens/copy/interactions to
   `sals3-portal`'s own established design system (`design-system/sals3-portal/MASTER.md`
   — shadcn/ui, brand tokens shared with the storefront, Plus Jakarta
   Sans/Outfit) rather than porting the mockup's own bespoke look (Archivo +
   IBM Plex Mono fonts, raw inline hex colours). The mockup was treated as an
   IA/copy/interaction reference, not a visual source of truth.
2. **Build scope:** all 7 screens this session, each as independently
   reviewable components — never one monolithic page, per this vault's
   mandatory component-by-component rule.
3. **Rename scope:** whole app identity — sidebar header, page metadata,
   README — became "Seller Center." Package name (`sals3-portal`) and repo
   path stayed unchanged; only user-facing branding changed. The existing
   Products catalogue became one section (`Catalogue` nav group) inside the
   renamed app.
4. **Data:** realistic static placeholder data, explicitly documented as
   illustrative in code comments and per-screen design docs — no order,
   inventory, finance, or payout backend exists in `sals3-portal` yet.

## What is real versus illustrative

**Real:** 7 new Next.js routes (`/overview`, `/orders`, `/listings/new`,
`/inventory`, `/finances`, `/payouts`, `/market-rules`), each gated by a
real, server-enforced permission in `src/lib/auth/permissions.ts` (9 new
permissions added: `overview:read`, `order:read`, `order:fulfill`,
`inventory:read`, `inventory:adjust`, `finance:read`, `payout:read`,
`payout:manage`, `market_rules:read`; the listing wizard reuses existing
`product:create`/`product:submit`). Verified live: a `seller_staff`-role
session cannot see the "Money" nav group (Finances/Payouts hidden) and a
direct navigation to `/finances` as that role throws a real `PermissionError`
server-side — confirmed with `PORTAL_DEV_ROLE=seller_staff`, not just a UI
claim. The on-screen interactions (Orders' row selection + sticky
bulk-action bar, Inventory's quantity stepper + audit trail, the Listings
wizard's stage accordion, the Payouts schedule chooser and destination
change confirmation dialog) are real, and Orders'/Inventory's toast+Undo
pattern (new `sonner` dependency) genuinely reverts the browser-tab state.

**Illustrative, stated plainly in code and docs:** every order, SKU, ledger
line, payout, and market-rule row is static placeholder data in
`src/lib/seller-center/mock-data/*.ts`, none of it persists past a reload,
and none of it reaches a backend — there is no order, inventory, finance,
or payout system in `sals3-portal`. The 3 sample markets (Philippines,
Indonesia, Singapore) in `src/lib/seller-center/market-config.ts` are
illustrative examples carried over from the mockup, not confirmed Sals3
launch markets or approved fee/tax/carrier figures — deliberately a static,
code-reviewed config module (`PORTAL_DEV_MARKET` env var), not a self-serve
console, matching the Seller Center blueprint's own v1 cut of that idea.

## Real bug caught and fixed during manual verification

Orders' "print labels" undo action initially used a `useState`-held
"previous selection" snapshot (`setBeforePrint`) read back inside the same
`handlePrint` closure — a stale-closure bug: `Undo` would restore `null`
(or a stale value) instead of the selection just cleared, because the
just-called `setBeforePrint` had not yet landed in that render's closure.
Fixed by capturing the previous selection in a local `const` inside
`handlePrint` instead of a second piece of state — a plain closure variable
is enough since each `handlePrint` call gets its own. Caught by manual
browser verification (not a unit test), confirmed fixed via direct DOM
`.click()` dispatch (`javascript_tool`) after establishing that this
session's headless Browser pane cannot composite frames, so coordinate-based
`computer` clicks were unreliable for elements needing exact hit-testing
(sonner toast action buttons) — a real methodology finding for future
sessions using this same preview tooling, not a product bug.

## Governance note

`sals3-ecommerce`'s vault (this note's own `hot.md` and the blueprint
proposal) recorded Seller Center as Stage 7, not started, pending Stages
1–6 and a field-research go/no-go gate. Bogs's direct instruction this
session is the actual owner decision that vault language was waiting on —
recorded as an addendum on
[[sals3-global-seller-center-ux-blueprint-proposal]] rather than flipping
its `status`/`owner_approved` fields, since this build is a UI prototype
against the proposal's structure, not Leadership approval of the underlying
Pillar 3 product strategy (cost model, field-research validation, launch
market), which remains genuinely pending. The listing wizard overlaps with
[[ADR-001-seller-center-cj-sourcing-to-my-products]]'s real CJ-sourcing
flow — this build is a read-only preview, not that flow; reconcile before
either is built for real.

## Verification

Full `npm run verify` (lint, format:check, typecheck:clean, build, unit
tests, E2E) passes clean in `sals3-portal`: 0 lint errors, Prettier clean,
`tsc --noEmit` clean, production build succeeds with all 7 new routes
listed, **72 unit tests pass** (14 files — includes 3 new files for
Seller Center: `permissions.test.ts`, `market-config.test.ts`,
`money.test.ts`, plus `DisclosureBanner.test.tsx`/`StatusPill.test.tsx`),
and **26 E2E tests pass** (includes 8 new Seller Center specs, one per
screen plus a cross-screen mobile-overflow sweep). `npm audit
--audit-level=high` reports 0 vulnerabilities. Manually verified live in
the browser at 375/768/1440px: all 7 screens render, sidebar reads "Seller
Center," every nav link resolves, permission-based nav filtering and
route-level blocking both work (`seller_staff` cannot see or open
Finances/Payouts — confirmed both by hiding the nav group and by a direct
`/finances` navigation throwing a real server-side `PermissionError`), and
the interactive signature behaviors on each screen work as designed.

One methodology note for future sessions: the first E2E run showed 9
failures that looked like real product bugs (checkboxes not toggling,
text not found, stage defaults wrong). Re-running against a **freshly
started** dev server (rather than reusing the one this session had been
manually testing against via the browser-preview tool, which had absorbed
many Fast-Refresh reloads over a long session) fixed 7 of the 9 — the
same "stray/stale dev server serves broken behavior" pattern already
recorded in [[sals3-skills]]. The remaining 2 were genuine test-authoring
bugs (ambiguous text locators matching 2 elements), fixed by scoping the
assertions, not a code defect.
