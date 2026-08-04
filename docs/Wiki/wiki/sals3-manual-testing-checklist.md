---
tags: [sals3, manual-testing, testing, acceptance-checklist]
aliases: [Sals3 Manual Testing Checklist, Sals3 Testing Checklist]
created: 2026-07-31
updated: 2026-07-31
status: active-checklist
authority: acceptance-evidence
owner_requested: true
related: ["[[sals3-management-bible]]", "[[sals3-implementation-phases]]", "[[hot]]"]
---

# Sals3 — Manual Testing Checklist

> [!IMPORTANT] Purpose
> This is the resumable manual-testing queue for Sals3. A checked box means the owner personally observed the expected behavior in a real browser/app, not just a passing automated test. Automated tests do not replace these checks.

## Current automated baseline

- No Sals3 codebase exists yet as of 2026-07-31. No automated test suite, no commit, no workspace to point to.
- Update this section with the real workspace path, branch, commit, and test result the first time a Sals3 repository exists.

## Before each manual testing session (template — adjust once a real stack exists)

- [ ] Confirm which environment is running (local dev, staging, Shopify pop-up, production) and its exact URL.
- [ ] Record baseline numbers relevant to the test (stock, order count, payout balance) before any mutation-sensitive test.
- [ ] Use copies of source workbooks/exports; preserve the originals.
- [ ] Back up the database first if it contains real evidence.

## Pillar 1 — Shopify pop-up store

- [ ] Storefront loads and the Smart Quality Filter has visibly been applied (no obviously low-quality/junk listings).
- [ ] Checkout completes end-to-end with at least one real payment method.
- [ ] Order and customer records are being logged somewhere migratable, not only inside Shopify's own admin.

## Pillar 2 — Customer website (not started)

- [ ] Curated catalog shows only quality-gate-passed items.
- [ ] Out-of-stock variations are actually hidden/disabled in real time, not just flagged.
- [ ] Checkout works on both mobile and desktop.
- [ ] Shipping/tax calculator produces a real, correct BIR tax invoice.

## Pillar 3 — Seller Center (not started)

- [ ] Dashboard KPI bar numbers match the underlying order/product data, not placeholder values.
- [ ] Order status lifecycle (`UNPAID → PAID → PROCESSING → SHIPPED → DELIVERED → COMPLETED`) transitions correctly and cannot skip a required state.
- [ ] Bulk SKU Excel import round-trips correctly for a real multi-variation product.
- [ ] Payout ledger math (`Selling Price - Supplier Cost - Logistics Fee - Sals3 Fee`) matches manual calculation for a real order, using confirmed (not sample) fee values.

## Cross-cutting

- [ ] White-label check: no supplier name, logo, or branding leaks to the customer anywhere in the order lifecycle.
- [ ] Live tracking portal (`tracking.sals3.com`) reflects the real courier status, not a static placeholder.
