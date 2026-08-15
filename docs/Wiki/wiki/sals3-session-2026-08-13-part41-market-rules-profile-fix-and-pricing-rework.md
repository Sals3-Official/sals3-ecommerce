---
tags: [sals3, session, sals3-portal, market-rules, pricing, market-profile, reconstructed]
aliases: [Market Rules Pricing Rework, Funding Buffer Rename, Orders Market Profile Fix]
created: 2026-08-14
updated: 2026-08-14
status: session-note
authority: session-record
owner_approved: false
implementation_status: merged-to-develop
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]"
  - "[[sals3-portal-seller-market-configuration]]"
---

# Sals3 session 2026-08-13, part 41 — orders market-profile fix and Market Rules pricing rework (reconstructed)

`sals3-portal`. **Reconstructed from git history** — like [[sals3-session-2026-08-13-part39-aj-catalogue-storefront-and-sourcing-work]] and [[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]], this work landed on `develop` with no session note written by whoever did it. Written 2026-08-14 while verifying the real current state of Market Rules ahead of a turnover to a fresh agent. Two commits, both already merged and already green on CI (`Verify` workflow) at the time of this reconstruction.

## 1. `91b5265` — fix(orders): read active market profile

`/orders` had its own dependency on the illustrative PH/ID/SG `market-config.ts` fixture — the same fixture [[sals3-portal-seller-market-configuration]] already replaced for `/market-rules` itself on 2026-08-12 (`6e5b244`). This commit wires `/orders` onto the real `seller_market_profiles` table / `src/modules/market-config/repository.ts` instead, so it no longer silently depends on a mock module that correctly returns `null` in production. No schema change.

## 2. `166d0ec` — feat(market-rules): rework category pricing and FX adjustment into an inline, dialog-free flow

The larger of the two. Reworks the ADR-015 Phase 1 pricing UI ([[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]) that shipped as a flat 1,345-row table behind a `CategoryPolicyFormDialog` modal:

- **Category pricing** is now a grouped, expandable list — `CategoryMarginGroupRow` / `CategoryMarginLeafRow` — 226 L1>L2 groups over the same 1,345 leaf categories. A leaf edits and commits inline on first interaction; a group-level bulk overwrite requires an inline arm/confirm step before it touches every leaf underneath (the safety net moved from "a modal makes you stop and look" to "a second click makes you confirm," not removed).
- **"FX adjustment" was renamed "Funding buffer"** in the UI and in the resolver's typed unavailable-reasons (`FX_ADJUSTMENT_POLICY_REQUIRED`/`POLICY_EXPIRED` → `FUNDING_BUFFER_REQUIRED`/`FUNDING_BUFFER_EXPIRED`). The rename reflects that this buffer was never actually reachable as a real currency-pair FX adjustment yet (part34 §2 already flagged the FX branch as dead code pending a real reference-FX provider) — "funding buffer" describes what a seller can actually configure today more honestly than "FX adjustment" did.
- Migration `drizzle/0018_rare_william_stryker.sql` drops the now-meaningless `source_currency`/`target_currency`/`funding_rail` columns (and the `funding_rail` enum) from `pricing_fx_adjustment_policies`, and rebuilds its partial unique index. **This is a real `DROP COLUMN`/`DROP TYPE` migration**, not purely additive like every other Market Rules migration to date — worth double-checking it actually ran cleanly wherever it's been applied, since a drop can't be silently re-run if it half-failed.
- Added `PolicyHistoryButton` — a shared, lazy-fetch audit-history popover used by category leaf rows, group rows, and the funding-buffer card alike.
- The commit's own message claims zero behavior change to the Market Profile section of the same page (`MarketProfileSection`, `MarketProfileTransitionDialog`, `BeginMarketProfileSetupDialog`) — confirmed true by inspection: those stayed real `Dialog`s, only the pricing section went dialog-free.

## 3. What this means for the vault

- [[sals3-portal-seller-market-configuration]] (2026-08-12) predates both commits and is updated separately with a dated follow-up section pointing here.
- [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]'s `implementation_status` frontmatter had been sitting at `not-started` throughout all of this — also corrected separately, with an amendment section, since three commits (`973fa0e`, `6e5b244`/`91b5265`, `166d0ec`) have now shipped against its approved design.
- The capability module (`src/modules/market-config/capabilities.ts`) is at `seller-market-capability-v2-au-ph-usd-publishable` as of current `develop` HEAD, with `authorizedSellingCurrencyCodes: ['USD']` now populated for both AU and PH — up from the empty arrays [[sals3-portal-seller-market-configuration]] originally documented. When or why that moved from v1 to v2 has no note of its own; flagged here as a gap, not resolved.
- Per the current portal `README.md` (added `2238bc5`, 2026-08-14): production `seller_market_profiles` and `pricing_category_policies` are both reported empty as of that verification — no seller has actually used either feature in production yet. Not independently re-verified against a live database by this note; taken from the repo's own first-party documentation.

## 4. Open gap noted while reconstructing this

`pricing_category_policies`/`pricing_product_overrides`/`pricing_variant_overrides` are still keyed to `supplier_candidates.id` (part34 §2's documented, deliberate placeholder pending a real Product/Variant table). A real canonical Product/Revision/Variant/Offer model has since landed in this codebase via a separate, unrelated migration (`0013_cold_timeslip.sql`). Nobody has revisited the pricing tables' foreign keys to point at the new model — genuinely unresolved, not a code TODO, not yet flagged anywhere else in the vault before this note.
