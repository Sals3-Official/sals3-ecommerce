---
tags: [sals3, manual-testing, testing, acceptance-checklist]
aliases: [Sals3 Manual Testing Checklist, Sals3 Testing Checklist]
created: 2026-07-31
updated: 2026-08-07
status: active-checklist
authority: acceptance-evidence
owner_requested: true
related: ["[[sals3-management-bible]]", "[[sals3-implementation-phases]]", "[[hot]]"]
---

# Sals3 — Manual Testing Checklist

> [!IMPORTANT] Purpose
> This is the resumable manual-testing queue for Sals3. A checked box means the owner personally observed the expected behavior in a real browser/app, not just a passing automated test. Automated tests do not replace these checks.

## Current automated baseline

- Workspace: `E:\sals3-ecommerce` (merged code + vault repo, confirmed 2026-08-04). `develop` as of 2026-08-06 has all seven PRs from the reconciliation session merged: PR #21 (PDP/cart/guest header), #24 (CJ rate-limit cap), #25 (deals/for-you decoupling), #26 (title/imageAlt truncation), #28 (switch to the real single-product endpoint); `sals3-portal`'s #2 (single-product lookup) and #3 (`totalPages` self-correction). PR #30 (iOS/Android PWA icons + manifest) and PR #31 (cart mobile price-overflow fix) are open, not yet merged, as of 2026-08-06.
- `npm run verify` (lint, format:check, typecheck:clean, build, test:run, test:e2e) plus `npm audit --audit-level=high`: all passing as of 2026-08-06 across every PR above, including #30 and #31. See [[hot]], [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]], and [[sals3-session-2026-08-06-part11-pwa-icons-and-cart-mobile-overflow]] for per-PR verification detail.
- Landing page and PDP now read the real `sals3-portal`/CJdropshipping backend (per PR #22), not DummyJSON. Local dev shows real CJ photos/data only when `sals3-portal` (`E:\sals3-portal`) is also running with real CJ credentials — otherwise the existing placeholder fallback renders, which is correct, expected behavior, not a bug.
- **2026-08-07, `sals3-portal`:** branch `feat/catalog-candidate-drizzle-persistence` (PR #6, open). `npm run verify` and `npm audit --audit-level=high` pass locally — **137** unit/component and **32** Playwright tests. GitHub Actions `Verify` passed on commit `8a8b48f`, which contains all the substantive code; the two commits after it have **no CI run** because pushes stopped triggering one after a transient runner-acquisition failure. Those two are verified locally only. `sals3-ecommerce` PR #48 (vault-only) passes CI.
- Update this section with the real branch/commit/test result again each time a material change lands.

## Before each manual testing session (template — adjust once a real stack exists)

- [ ] Confirm which environment is running (local dev, staging, or production) and its exact URL.
- [ ] Record baseline numbers relevant to the test (stock, order count, payout balance) before any mutation-sensitive test.
- [ ] Use copies of source workbooks/exports; preserve the originals.
- [ ] Back up the database first if it contains real evidence.

## Retired — Shopify pop-up store

- [x] No manual Shopify testing required. The owner rejected Shopify as an active Sals3 path on 2026-08-06; preserve this heading only to explain why older test items disappeared.

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
- [ ] Adding the site to an iOS home screen shows the real Sals3 logo, not a generic gray placeholder. Agent-verified 2026-08-06 via the `apple-touch-icon` link tag resolving to `/apple-icon.png` at 180×180 in the browser dev server — not yet owner-observed on a real iOS device (PR #30).
- [ ] Adding the site to an Android/Chrome home screen (or "Install app") shows the real Sals3 logo. Agent-verified 2026-08-06 via the `manifest` link tag resolving to `/manifest.webmanifest` with correct icon entries (192×192, 512×512) in the browser dev server — not yet owner-observed on a real Android device (PR #30).
- [ ] `/cart` line items don't overflow off-screen on a narrow mobile viewport — the price stays visible next to the title/quantity stepper. Agent-verified 2026-08-06 via `getBoundingClientRect()` at 375px and 320px widths (PR #31), not yet owner-observed on a real device.

## Pillar 3 — Seller Center (partially started)

### CJ candidate shortlist — open manual acceptance (added 2026-08-07)

Automated coverage exists (137 unit, 32 Playwright). These are the checks a
person still has to make, because they depend on real CJ data and on judgement
about wording rather than on assertable state. Requires `sals3-portal` running
with a configured `DATABASE_URL`.

- [ ] `Check for Sals3` on a row with **many variants** shows every variant, and each variant's stock is plausible against CJ's own product page — the two inventory levels use different field names and a regression there reports "not reported" instead of failing loudly.
- [ ] The per-variant stock figures **sum to the warehouse total** shown in the same panel. A mismatch means the `vid` join or a field name has drifted.
- [ ] Shortlisting the **same product twice** shows "Already shortlisted earlier" and does not add a second row to the Shortlisted queue.
- [ ] With `sals3-portal` running but the database stopped, the row action reports a failure and the Shortlisted page says no database is configured — neither shows a 500 or a fabricated success.
- [ ] A product with **no CJ reviews** shows `0` and a dash, never an invented rating; a product **with** reviews labels them CJ supplier-platform evidence and not Sals3 buyer reviews.
- [ ] Nothing anywhere reads as a pass/fail verdict, score, or "Ready" state — no preflight exists, so any such wording is a defect.
- [ ] `Platform listings` is never described as sales, orders, or customers.
- [ ] Keyboard only: reach the row action, activate it, read the drawer, and close it. Screen-reader announces the status pill's text, not just a colour.
- [ ] The page heading, sidebar link, and browser tab all read `CJ Candidate Explorer`; the topbar shows the `Product Sourcing` group.

### Not started

- [ ] Dashboard KPI bar numbers match the underlying order/product data, not placeholder values.
- [ ] Order status lifecycle (`UNPAID → PAID → PROCESSING → SHIPPED → DELIVERED → COMPLETED`) transitions correctly and cannot skip a required state.
- [ ] Bulk SKU Excel import round-trips correctly for a real multi-variation product.
- [ ] Payout ledger math (`Selling Price - Supplier Cost - Logistics Fee - Sals3 Fee`) matches manual calculation for a real order, using confirmed (not sample) fee values.

## Cross-cutting

- [ ] White-label check: no supplier name, logo, or branding leaks to the customer anywhere in the order lifecycle.
- [ ] Live tracking portal (`tracking.sals3.com`) reflects the real courier status, not a static placeholder.
