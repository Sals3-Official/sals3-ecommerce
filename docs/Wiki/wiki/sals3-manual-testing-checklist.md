---
tags: [sals3, manual-testing, testing, acceptance-checklist]
aliases: [Sals3 Manual Testing Checklist, Sals3 Testing Checklist]
created: 2026-07-31
updated: 2026-08-06
status: active-checklist
authority: acceptance-evidence
owner_requested: true
related: ["[[sals3-management-bible]]", "[[sals3-implementation-phases]]", "[[hot]]"]
---

# Sals3 — Manual Testing Checklist

> [!IMPORTANT] Purpose
> This is the resumable manual-testing queue for Sals3. A checked box means the owner personally observed the expected behavior in a real browser/app, not just a passing automated test. Automated tests do not replace these checks.

## Current automated baseline

- Workspace: `E:\sals3-ecommerce` (merged code + vault repo, confirmed 2026-08-04). `develop` as of 2026-08-06 has all seven PRs from this session merged: PR #21 (PDP/cart/guest header), #24 (CJ rate-limit cap), #25 (deals/for-you decoupling), #26 (title/imageAlt truncation), #28 (switch to the real single-product endpoint); `sals3-portal`'s #2 (single-product lookup) and #3 (`totalPages` self-correction).
- `npm run verify` (lint, format:check, typecheck:clean, build, test:run, test:e2e) plus `npm audit --audit-level=high`: all passing as of 2026-08-06 across every PR above. See [[hot]] and [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]] for per-PR verification detail.
- Landing page and PDP now read the real `sals3-portal`/CJdropshipping backend (per PR #22), not DummyJSON. Local dev shows real CJ photos/data only when `sals3-portal` (`E:\sals3-portal`) is also running with real CJ credentials — otherwise the existing placeholder fallback renders, which is correct, expected behavior, not a bug.
- Update this section with the real branch/commit/test result again each time a material change lands.

## Before each manual testing session (template — adjust once a real stack exists)

- [ ] Confirm which environment is running (local dev, staging, Shopify pop-up, production) and its exact URL.
- [ ] Record baseline numbers relevant to the test (stock, order count, payout balance) before any mutation-sensitive test.
- [ ] Use copies of source workbooks/exports; preserve the originals.
- [ ] Back up the database first if it contains real evidence.

## Pillar 1 — Shopify pop-up store

- [ ] Storefront loads and the Smart Quality Filter has visibly been applied (no obviously low-quality/junk listings).
- [ ] Checkout completes end-to-end with at least one real payment method.
- [ ] Order and customer records are being logged somewhere migratable, not only inside Shopify's own admin.

## Pillar 2 — Customer website (partially started)

- [ ] Curated catalog shows only quality-gate-passed items. (No curated catalog yet — landing page and PDP read the real `sals3-portal`/CJdropshipping feed as of PR #22, but it's a raw supplier feed, not a Sals3-curated catalog; cart is still client-only.)
- [ ] Out-of-stock variations are actually hidden/disabled in real time, not just flagged. **Real regression as of PR #21's reconciliation (2026-08-05):** the real `sals3-portal` schema has no stock field at all, so Add to Cart/Buy Now can no longer be disabled for an out-of-stock item — this must be restored once real inventory data exists. Flagged in [[hot]], not silently dropped.
- [ ] Checkout works on both mobile and desktop. (`/checkout` doesn't exist. `/cart`'s "Proceed to Checkout" is a disabled placeholder with a plain-English note.)
- [ ] Shipping/tax calculator produces a real, correct BIR tax invoice. (No pricing/promotion engine exists — Stage 4 not started.)
- [ ] Product detail page (`/p/[id]`) loads real product data, images, price, and related products; an invalid or missing id returns a real 404. **Regression from PR #24 lifted 2026-08-06 (PR #28):** the PDP now calls `sals3-portal`'s real single-product endpoint (its own PR #2) directly — one request, real products resolve normally instead of 404ing past page 2 of the old stopgap scan. Related products still use the capped stopgap (no category-filter endpoint exists yet). Reviews/description/brand/warranty sections were removed entirely (PR #21) since the real backend has no such fields — not a regression, an honest cut. Agent-verified live in the browser 2026-08-06 against a real local `sals3-portal` instance (not yet owner-observed — this box means the owner saw it personally, per this checklist's own definition above).
- [ ] Home page pagination past the current page still shows real products and controls, without falling back to placeholder data. Agent-verified 2026-08-06 after three real bugs found and fixed this session (see [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]]) — not yet owner-observed.
- [ ] Add to Cart / Buy Now on the PDP update the cart and show a toast confirmation; Buy Now goes straight to `/cart`. Agent-verified 2026-08-05, not yet owner-observed.
- [ ] `/cart` quantity +/-, remove, and the running subtotal all update correctly; removing the last item shows the empty-cart state. Agent-verified 2026-08-05, not yet owner-observed.
- [ ] Cart survives a real browser restart / new tab (it's `localStorage`-backed, should persist — not yet tested by anyone across a full browser restart, only within a session).
- [ ] Guest header strip and `/login`/`/signup` placeholders render correctly and don't claim functionality that doesn't exist. Agent-verified 2026-08-05, not yet owner-observed.

## Pillar 3 — Seller Center (not started)

- [ ] Dashboard KPI bar numbers match the underlying order/product data, not placeholder values.
- [ ] Order status lifecycle (`UNPAID → PAID → PROCESSING → SHIPPED → DELIVERED → COMPLETED`) transitions correctly and cannot skip a required state.
- [ ] Bulk SKU Excel import round-trips correctly for a real multi-variation product.
- [ ] Payout ledger math (`Selling Price - Supplier Cost - Logistics Fee - Sals3 Fee`) matches manual calculation for a real order, using confirmed (not sample) fee values.

## Cross-cutting

- [ ] White-label check: no supplier name, logo, or branding leaks to the customer anywhere in the order lifecycle.
- [ ] Live tracking portal (`tracking.sals3.com`) reflects the real courier status, not a static placeholder.
