---
tags: [sals3, session, sals3-portal, product-catalogue, dropshipping, adr-011, adr-013, adr-007]
aliases: [Product Catalogue Dropshipping Alignment]
created: 2026-08-10
updated: 2026-08-22
status: session-note
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-session-2026-08-10-part22-product-sourcing-consolidation-and-catalogue-preview]]"
  - "[[sals3-session-2026-08-22-part67-the-catalogue-column-that-was-doing-nothing]]"
---

# Sals3 session 2026-08-10, part 23 — Product Catalogue aligned with the approved dropshipping system

> [!WARNING] Superseded in one part, 2026-08-22 — the `Availability` column is no longer drawn
> The three-separate-dimensions correction below still stands: Availability, Media status,
> Attention and listing status are still four distinct fields, not one Active/Inactive flag.
> What changed is that **Availability is no longer a parent column or a `Refine by` select** on
> `/listings` — owner decision 2026-08-22, taken because the nine-column table was clipping its
> own Actions cell. `deriveProductAvailability` still runs, the `Out of stock (N)` quick filter
> and its count still read it, and the expanded variant rows still show it per variant with
> `supplierObservedQuantity` / `evidenceFreshness` / `lastCheckedAt` beside it. Nothing in
> ADR-013 is contradicted. The Actions cell described in §5 below is also gone: publish and pause
> now live in the row's `More` menu. See
> [[sals3-session-2026-08-22-part67-the-catalogue-column-that-was-doing-nothing]].

`sals3-portal` PR [#21](https://github.com/Sals3-Official/sals3-portal/pull/21), branch `feat/portal-shell-redesign`, commit `d224713`.

## 1. Problem being corrected

Part 22's Catalogue preview at `/listings` (see [[sals3-session-2026-08-10-part22-product-sourcing-consolidation-and-catalogue-preview]]) was built as a generic TikTok-Shop/Shopee-style seller catalogue: `Active/Inactive/Draft/Pending QC/Violation/Deleted` statuses, an editable Stock column with a pencil icon, a client-owned Active toggle, A/B test tags, and fictional units-sold/wishlist/views/rating/content-score micro-metrics. None of that matches the approved Sals3 dropshipping contract already recorded in [[ADR-007-supplier-change-attention-and-immutable-order-snapshots]], [[ADR-011-product-media-source-selection-and-supplier-original-preservation]], and [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] - it read as a mirror of a normal e-commerce admin panel rather than what a Sals3 seller actually manages after CJ sourcing and customization.

This session did the actual correction (not merely a recommendation), following the owner's detailed handoff and the mandatory-reading ADRs/spec, then re-verified and updated this PR.

## 2. System position preserved and now made explicit in the UI

```text
All Supplier Products
  -> Evaluating
  -> Ready
  -> Customize & List
  -> Product Catalogue: Draft
  -> server-side Publication Gates
  -> Product Catalogue: Live
  -> Sals3 storefront
```

Product Catalogue is the seller's authoritative list of *Sals3-managed listings* after sourcing/customization - never a duplicate of All Supplier Products, never a raw CJ mirror, never a place where a Ready candidate is presented as already published, and never a client-side bypass around publication/reactivation gates. A row is a Sals3 Product; expanded rows are Sals3 Variants. Supplier pid/vid/SKU remain provider references, never Sals3 canonical identity.

## 3. Approved lifecycle/status dimensions now modeled as separate fields

| Dimension | Values | Source |
|---|---|---|
| **Listing status** | `Draft \| Live \| Live · Needs Attention \| Auto-paused \| Archived` | ADR-011 (no `Deleted` - Archive is the safe, recoverable action, row + bulk, with confirmation) |
| **Availability** | `Available \| Some variants unavailable \| Out of stock \| Supplier check pending \| Supplier disconnected \| Market unavailable \| Unknown or stale` | ADR-013 source-health truth; derived from the variant list, never stored independently of it |
| **Media status** | `Own pictures \| Supplier pictures \| Mixed pictures \| Supplier fallback \| Needs media review \| No usable pictures` | ADR-011's exact catalogue labels |
| **Attention** | severity (`Critical/High/Medium/Low`) + count, per open `AttentionIssue`-shaped reason | ADR-007 |

These are independent table columns/filters now, not one Active/Inactive flag. `src/lib/seller-center/product-catalogue/derive.ts` (new, pure, unit-tested) computes:

- `deriveProductAvailability(variants, fallback)` - one unavailable variant among purchasable siblings never reports the whole product out of stock (smallest affected scope); every variant unavailable always reports the product fully unavailable, never "available" by omission; a zero-variant single-offer product uses its own fallback field.
- `worstAttentionSeverity`, `worstEvidenceFreshness` - "worst of" aggregation, never silently dropping a severity/staleness signal.
- `isCheckoutAllowed` - a `Live`/`Live · Needs Attention` product with no attention reason that blocks checkout; everything else (Draft/Auto-paused/Archived, or any blocking reason) is `false`.
- `estimateMarginMinor` - illustrative only, `null` on a currency mismatch rather than a silently wrong subtraction.

## 4. Supplier stock: read-only evidence, not an editable number

The old Stock column with a pencil icon is replaced by an **Availability** badge plus, per variant, `supplierObservedQuantity` (labelled "Supplier-reported... not a guaranteed promise", `null` renders as "unknown" rather than a fake zero), `evidenceFreshness`, and `lastCheckedAt` (shown via the existing UTC `formatDateTime`, matching `product-editor/format.ts`'s hydration-safety convention rather than a `now`-relative "2h ago" string). ADR-013's raw evidence kinds (`CJ_WAREHOUSE_STOCK/FACTORY_BACKED_STOCK/MIXED_STOCK/ZERO_STOCK/UNKNOWN_STOCK`) are preserved on the fixture type even though the table surfaces the derived `Availability` primarily - factory-backed/unverified stock is never hard-coded as either a clean pass or a permanent block.

## 5. No client-owned Active toggle

The Active `<Switch>` is gone from both the product row and the variant row. In its place:

- **Pause listing / Pause variant** - a seller can always pause, so this is a real (in-memory, this-tab-only) state transition with an honest "preview-only, not persisted" toast. Bulk pause on the workspace mirrors this.
- **Review & resume**, **Publish**, and **Request fresh check** stay visible but always show an honest "isn't built yet" toast - they would need server-side gates (supplier connection, variant identity, stock, market/freight, price/margin, media, content, compliance) that do not exist yet, so this preview never simulates either succeeding.
- **Archive** replaces Delete everywhere (row menu and bulk action bar), behind an `AlertDialog` confirmation stating plainly that archiving stops new sales without deleting the product, revision, supplier evidence, audit history, or affecting any accepted order - mirroring `EditorActionBar`'s existing destructive-action convention.
- **Duplicate as new draft** and **View Live Page** wording was corrected: duplicate is framed as creating a new Sals3 draft (never duplicating raw supplier identity or order history), and View Live Page is disabled with `(not live)` for any non-`Live`/`Live · Needs Attention` row instead of offering a link that goes nowhere real.

## 6. Identity separation

`externalProductId` labelled "Product ID" is gone. Every row now shows **Sals3 Product ID** (canonical) alongside **CJ Product ID** (labelled as the supplier name + CJ ID, read-only reference), and every variant shows **Sals3 Variant ID**, **Seller SKU**, and **CJ Variant ID** separately. Every copy action has an explicit `aria-label` and calls a new shared `src/lib/seller-center/clipboard.ts` helper that wraps `navigator.clipboard.writeText` in try/catch - the previous version's unguarded call was an unhandled promise rejection on any clipboard failure (denied permission, insecure context).

## 7. Filters reworked for dropshipping operations

Search now has an explicit field selector (`Product name / Sals3 Product ID / Seller SKU / Supplier reference (CJ ID)`) instead of a generic "Product ID" that conflated Sals3 and CJ identity. New filters: Availability, Media status, Supplier, Supplier evidence freshness, and a "Needs attention" quick toggle alongside the existing "Out of stock" quick toggle (now driven by derived availability, not a raw `totalStock` field). A/B testing is removed entirely (no experiment/attribution backend exists and it is not launch-critical), and the fake "Sales (30d)" sort is replaced with "Most urgent attention first". Market filtering was deliberately **not** added - no destination market is approved yet (ADR-003), and a fixture filter with no honest meaning would misrepresent freight/eligibility truth.

## 8. Fictional metrics trimmed

`MicroMetricBadges.tsx` (units sold/wishlist/views/rating) is deleted outright - none of those have a backend anywhere in this repo, and the handoff's instruction to "remove or demote metrics that crowd out availability, supplier health, media, and attention" was read as removal rather than a smaller fictional badge. Content readiness (renamed from "content score") survives only as a small secondary chip under the product name, explicitly never a substitute for a hard publication gate.

## 9. Representative fixture states

`src/lib/seller-center/mock-data/product-catalogue.ts` was rebuilt to 11 rows covering every state item 11 of the handoff asked for: fully available (clean baseline), Live · Needs Attention from one unavailable variant among purchasable siblings, Live · Needs Attention from a material supplier-cost spike under review, Auto-paused from all variants unavailable, Auto-paused from a disconnected supplier connection, Auto-paused from a confirmed post-publication policy violation (ADR-007's "product becomes prohibited/unsafe" row), Draft with stale/unknown evidence and supplier-fallback media, Draft needing media review, Draft with no usable pictures, Live · Needs Attention from a market with no confirmed freight route, and Archived. Every row still links `editorFixtureKey` to one of the Product Editor's 8 existing fixtures (`pass/attention/blocked/mixed-stock/market-route/price-spike/delisted/stale-evidence`) so "Edit" opens the same real screen rather than a second, parallel one.

## Verification

- `npm run verify` (lint, format, `typecheck:clean`, build, 319 unit tests [15 new: `derive.test.ts` + rewritten `filter.test.ts`], 51 e2e passed / 1 skipped [5 new in `e2e/product-catalogue.spec.ts`]) - clean, ran automatically via the pre-commit/pre-push hooks.
- `npm audit --audit-level=high` - clean. One pre-existing **moderate** advisory remains (`esbuild` via `drizzle-kit`'s dev-only `@esbuild-kit/*` chain) - unrelated to this change, not a high/critical finding, and not fixed in this session since it would require a breaking `drizzle-kit` downgrade (`npm audit fix --force`) outside this task's scope.
- Manually exercised the live dev server (`http://localhost:3001/listings`) at desktop (800px) and mobile (375px, reloaded so load-time device gates re-ran): every fixture rendered its correct derived Availability/Media/Attention/Listing-status label, zero console errors, `document.documentElement.scrollWidth` equalled `window.innerWidth` at both sizes (no page-level horizontal scrollbar). The session's browser tool could not composite an actual screenshot in this environment (the Browser pane wasn't displayed), so this manual pass used the accessibility tree and extracted page text rather than a rendered image, backed by the real-browser Playwright e2e suite (which does click buttons, fill inputs, and open dialogs) for the interaction proof a static screenshot wouldn't have covered anyway.

## What remains fixture-only / unimplemented

Unchanged by this session, stated here so it stays visible next to the corrected UI rather than only in code comments:

- No `Product`/`Variant`/`Offer`/`ProductRevision`/`OfferSupplierBinding` table exists anywhere in this repo. `sals3-portal`'s schema is still the nine tables listed in [[hot]] (`supplier_candidates`, `candidate_evaluations`, `supplier_snapshots`, `audit_events`, `idempotency_records`, `seller_accounts`, `supplier_providers`, `supplier_connections`, `supplier_connection_secrets`).
- Pause is the only Catalogue action that really mutates state, and only in this browser tab (`ProductCatalogueWorkspace`'s React state) - a reload discards it. Publish, Review & resume, Request fresh check, price edits, Duplicate, and every bulk action besides Pause/Archive remain disabled/unbuilt with an honest toast.
- Archive updates only the in-memory fixture status; no server call, no audit event, no real preservation guarantee exists yet - the UI states this plainly in its own confirmation dialog.
- The ADR-011 media resolver, ADR-013 split inventory evidence capture, and ADR-007 attention/notification pipeline are all still approved-but-unimplemented backends; this session only made the Catalogue *preview* stop contradicting them.

## Conflicts found against the handoff, and how they were resolved

None required stopping. One judgment call worth recording: the handoff listed "estimated margin only if all values and assumptions are explicit fixtures" as optional; it was included (variant row, illustrative, excludes freight/fees, `null` on currency mismatch) since every fixture already carries explicit `sellingPrice`/`supplierCost` and the subtraction has no hidden assumption. Market-based filtering was the one recommended filter deliberately *not* added, per the handoff's own "only if the fixture meaning is honest" caveat and ADR-003's unapproved destination market.
