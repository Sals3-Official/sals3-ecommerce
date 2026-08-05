---
tags: [sals3, manual-testing, testing, acceptance-checklist]
aliases: [Sals3 Manual Testing Checklist, Sals3 Testing Checklist]
created: 2026-07-31
updated: 2026-08-05
status: active-checklist
authority: acceptance-evidence
owner_requested: true
related: ["[[sals3-management-bible]]", "[[sals3-implementation-phases]]", "[[hot]]"]
---

# Sals3 — Manual Testing Checklist

> [!IMPORTANT] Purpose
> This is the resumable manual-testing queue for Sals3. A checked box means the owner personally observed the expected behavior in a real browser/app, not just a passing automated test. Automated tests do not replace these checks.

## Current automated baseline

- Workspace: `E:\sals3-ecommerce` (merged code + vault repo, confirmed 2026-08-04). Branch `feat/pdp-cart-guest-header-ux-audit`, [PR #21](https://github.com/Sals3-Official/sals3-ecommerce/pull/21) open against `develop`, not yet merged as of 2026-08-05.
- `npm run verify` (lint, format:check, typecheck:clean, build, test:run, test:e2e) plus `npm audit --audit-level=high`: all passing as of 2026-08-05 — 63 unit tests, 6 e2e tests, 0 vulnerabilities. See [[hot]] for the per-session verification detail.
- Update this section with the real branch/commit/test result again once PR #21 merges, and each time a material change lands.

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

- [ ] Curated catalog shows only quality-gate-passed items. (No curated catalog yet — landing page, PDP, and cart all still read the external DummyJSON placeholder feed, not a real Sals3 catalog.)
- [ ] Out-of-stock variations are actually hidden/disabled in real time, not just flagged. (`/p/[id]` shows a real `stockLine` and disables Add to Cart/Buy Now when `stock` is 0, sourced live from DummyJSON — but there's no real Sals3 inventory system behind it yet.)
- [ ] Checkout works on both mobile and desktop. (`/checkout` doesn't exist. `/cart`'s "Proceed to Checkout" is a disabled placeholder with a plain-English note.)
- [ ] Shipping/tax calculator produces a real, correct BIR tax invoice. (No pricing/promotion engine exists — Stage 4 not started.)
- [ ] Product detail page (`/p/[id]`) loads real product data, images, price, reviews, and related products; an invalid or missing id returns a real 404. Agent-verified live in the browser 2026-08-05 (not yet owner-observed — this box means the owner saw it personally, per this checklist's own definition above).
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
