---
tags: [moc, hot-cache, current-state, sals3]
aliases: [Hot Cache, Recent Context Cache]
created: 2026-07-31
updated: 2026-08-07
status: current-state
authority: implementation-state
owner_approved: true
related:
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[project-structure-installation-and-runbook]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-implementation-phases]]"
  - "[[index]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-portal-code-review-2026-08-06]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-global-seller-center-ux-blueprint-proposal]]"
  - "[[sals3-session-2026-08-06-part13-seller-center-first-build]]"
---

# Sals3 - Current State Cache

> [!IMPORTANT] Mandatory reading gate
> Read this note first. Before any code, package, configuration, or test edit, read [[agent-operating-contract]], [[nextjs-component-security-code-rules]], and [[project-structure-installation-and-runbook]]. For material product work, read [[sals3-ux-build-specification]] and the relevant approved ADR. Historical session notes do not override current decisions.

## Repository and vault

- Canonical repository: `github.com/Sals3-Official/sals3-ecommerce`.
- Local Windows path used in this workspace: `E:\sals3-ecommerce`.
- Obsidian vault root: `docs/`; do not open the repository root as the vault.
- The old standalone `sals3-2nd-brain` repository is deprecated/frozen.
- Next.js + TypeScript application, tests, linting, formatting, Husky, and CI foundations exist.
- `sals3-portal` is a separate repository/local clone. Whenever work touches it or its storefront API, its actual current code, schema, tests, and API contracts are the strict reference.

### Git safety

- Obsidian Git auto-commit/auto-push remains disabled. A prior live test proved a vault commit can sweep application files outside `docs/`.
- Every change goes through a feature/chore/bug branch and pull request; never commit directly to `main` or `develop`.
- Before staging a vault change, verify that only intended paths are included.

## Canonical technical authority

- [[sals3-ux-build-specification]] is the current technical authority. The target is a new system, not continued WooCommerce architecture.
- [[sals3-master-blueprint]] remains business-strategy context and contains sample values that are not automatically approved implementation facts.
- [[sals3-management-bible]] and [[sals3-implementation-phases]] summarize boundaries and progress; keep them synchronized with approved ADRs and verified code.

## Verified implementation state

### Implemented foundations

- Marketplace landing page, header, footer, promo carousel, category row, deals/For You grids, and numbered pagination.
- Product route `/p/[id]` backed by the current `sals3-portal` single-product API contract.
- Guest header strip and a `noindex` signup placeholder. Real buyer account pages, protected checkout, and role-aware account UI do not exist yet.
- `/login` is a built, `noindex` split-hero sign-in UI implementing the approved `Sals3 Login.dc.html` design (Instrument Sans, auth palette tokens, Zod-validated fields, Show/Hide reveal). Email/password remains a local placeholder: no credential endpoint is called, the password never leaves React state, and Continue reports that accounts are not switched on yet. Continue with Google now uses Firebase Authentication for a Google popup, exchanges the fresh Firebase ID token for a server-verified 24-hour `httpOnly` `sals3_session` cookie through `/api/auth/session`, clears client Firebase persistence, then redirects home without a success banner. The header verifies that server session before showing a sanitized first-name account dropdown, hides the account shortcut from signed-out visitors, hides top `Log In`/`Sign Up` links while signed in, and signs out through a CSRF-protected session delete. `next.config.ts` sends baseline security headers on document routes plus `Cache-Control: no-store` on `/login`.
- Client-only `localStorage` cart with Add to Cart/Buy Now and cart toast; no server cart or checkout exists.
- Route-independent SEO/GEO/AEO foundations: `robots.txt`, `llms.txt`, Organization/WebSite JSON-LD, home metadata, and sitemap wiring where real data permits it.
- PWA icon/manifest work and responsive cart/PDP fixes from the 2026-08-05/06 sessions.
- `sals3-portal` renamed to "Seller Center" with 7 new permission-gated screens (Overview, Orders, Inventory, a new-listing wizard, Finances, Payouts, Market rules) built against its own real design system - illustrative data throughout, no order/inventory/finance/payout backend. See [[sals3-session-2026-08-06-part13-seller-center-first-build]].

### Incomplete or placeholder

- No product/variant/offer model, supplier import workflow, secure employee admin, checkout, payment, settlement, tax, order fulfillment, or return flow exists. A Seller Center UI prototype now exists in `sals3-portal` (see below) - real routes and real permission enforcement, but illustrative data throughout and no order/inventory/finance/payout backend.
- A **first real catalog database does now exist**, in `sals3-portal` only: PostgreSQL + Drizzle ORM, four tables (`supplier_candidates`, `idempotency_records`, `supplier_snapshots`, append-only `audit_events`). It covers the CJ candidate **Shortlist** step plus a real **CJ evidence fetch** (detail, variants, per-warehouse and per-variant inventory, review counts) stored as one checksummed snapshot per candidate. Verified against the live CJ API and the live database.
- What is still missing is the **judgement**, not the evidence: hard gates, quality scoring, and the compliance gate are **not** built, so no `PASS`/`BLOCKED` decision or quality score exists anywhere. Freight evidence is also not fetched, because ADR-003 has approved no destination market. Import, publication, and attention state remain unbuilt. See [[cj-candidate-to-sals3-product-draft-implementation-spec#26. Verified implementation status — 2026-08-07]].
- Two CJ API traps found and fixed while wiring the fetch, worth remembering: `variantInventories` comes back in a different order from the detail response's `variants` (join on `vid`, never index), and the product-level and per-variant inventory objects name the same field differently (`totalInventoryNum` vs `totalInventory`). The second one silently reported zero stock for every variant while 36,338 real units existed.
- Current customer product data is CJ-sourced through the protected `sals3-portal` storefront API, not yet a curated Sals3 catalog.
- `/c/[category]` does not exist.
- The cart is browser-local only; `/checkout` does not exist.
- Real inventory/variant data is not present in the storefront contract, so the intended out-of-stock purchase guard is not yet complete.
- Google buyer sign-in now creates a Firebase-backed server session cookie, but no protected buyer account, server cart, checkout, profile, or authorization workflow exists yet. Email/password is still unavailable; when it lands it must re-validate with `src/lib/auth/login-schema.ts` on the server and add password-specific rate limiting and CSRF protection. `/login/reset` is referenced by the form but not built.

## Approved catalog and commerce decisions - 2026-08-07

The original all-in-one ADR and later seller/supplier decisions are now split into eight approved, independently auditable ADRs. They are approved direction, not implemented behavior.

> [!IMPORTANT] Persistence stack and placement - decided 2026-08-07 by Bogs
> Approved stack: **PostgreSQL + Drizzle ORM + Drizzle Kit + `postgres.js` + Zod**. Prisma was evaluated and rejected; do not reintroduce it.
> The catalog database lives in **`sals3-portal`**, with the Seller Center screens that write to it. This **supersedes** the earlier spec/ADR-001 wording that placed it in `sals3-ecommerce` and forbade a writable catalog in the portal. Internal catalog writes use Server Actions, so no service-to-service credential exists for them; `sals3-ecommerce` still reads through the protected `/api/storefront/*` endpoints. Rationale and trade-off recorded in [[cj-candidate-to-sals3-product-draft-implementation-spec#3.2 Initial physical placement]].

- [[ADR-001-seller-center-cj-sourcing-to-my-products]] - CJ is a supplier; Sals3 publishes a curated, separate catalog through a server-side modular boundary. Seller identity is separate from per-offer fulfillment mode. Original copy, rights-aware media, objective hard rejects, reviewable risk signals, and secure employee administration are required.
- [[ADR-002-sals3-taxonomy-and-cj-category-mapping]] - the workbook is adopted as **Sals3 Taxonomy v0** for pilot use, not declared fully production-ready. It contains 1,345 data rows and 29 L1 departments; the 13-row matrix is only a partial summary. Real-product mapping, category-form QA, and provenance/license review remain required.
- [[ADR-003-international-availability-shipping-and-pricing]] - Sals3 supports explicitly enabled countries rather than making an unverified worldwide claim. Geo-IP is a hint, regional zones are browse estimates, and checkout requires a fresh destination/postal quote. Phase 1 is USD. Pricing uses landed cost and contribution economics, not a flat markup.
- [[ADR-004-cj-ordering-tracking-and-fulfillment]] - a verified server-side payment event queues an idempotent direct CJ order flow. CJ wallet balance, retries, outbox/reconciliation, signed webhook verification, `messageId` deduplication, and tracking-source conflict rules are required. CJ documents Delivered and other logistics statuses; an aggregator is optional only after evaluation.
- [[ADR-005-payment-settlement-refunds-and-cod]] - customer payment, gateway settlement, supplier spend, refunds, and delivery are separate states. COD is disabled/out of phase 1 until courier, remittance, refusal/return, fraud, accounting, and market controls are approved and verified.
- [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]] - Retailer and Dropshipper use separate registrations, accounts, and logins; one account has one immutable business model. Dropshippers source through healthy connections they own. CJ is the first provider adapter, and Sals3's current CJ credential belongs to a separate Sals3 Official Dropshipper Account. Shopify is not a supplier connection.
- [[ADR-007-supplier-change-attention-and-immutable-order-snapshots]] - supplier delist, zero stock, cost spike, freight loss, connection failure, and material source changes protect new checkout automatically and open one actionable seller attention case with severity-based in-app, push, and email delivery. Accepted orders remain active and render immutable product/variant/price/terms/media/supplier snapshots; no later listing change or silent substitution rewrites history.
- [[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]] - Dropshippers install curated Supplier Apps and connect their own provider accounts/API credentials. Customer payment/Sals3 commission/seller payout are separate from seller-to-supplier payment. CJ does not pay the Sals3 seller; it charges the seller's own CJ account/wallet. Zero balance permits catalog access but not automatic balance fulfillment; affected offers funding-hold and accepted orders become actionable `AWAITING_SUPPLIER_FUNDS` exceptions. Exact commercial rates/providers remain pending.
- [[cj-candidate-to-sals3-product-draft-implementation-spec]] - approved implementation contract connecting Aj's existing **CJ Candidate Explorer** (`sals3-portal` `/products`) to the Sals3 Catalog Admin API. Phase 1 is human-on-exception: selected green items auto-publish, yellow items auto-publish as **Live · Needs Attention**, and red items block or auto-pause. It defines persistent status surfaces, deduplicated in-app attention, shortlist/preflight gates, country/permit/IP controls, identity, editor, API, sync, and rollback. No implementation is claimed.
- Shopify is not part of the active Sals3 plan or CJ import path. Earlier Shopify pop-up-store material is historical/sample context only and must not create implementation tasks.

## Corrected external facts

As verified against current official CJ documentation on 2026-08-06:

- Product detail can provide `description` and `productImageSet`.
- `GET /shopping/pay/getBalance` exists.
- Logistics webhook statuses include `12 = Delivered`, `13 = exception`, and `14 = return`.
- CJ uses endpoint-specific daily points plus per-second limits. The current documented base allowance is 50,000 points/day plus transaction-based points; responses include `pointsInfo`.
- `/product/list` costs more points than common detail/variant/freight operations and does not provide the previously assumed free `totalVerifiedInventory` field in the current route used by the portal.
- Freight calculation is destination-specific and can use postal code; one representative country cannot prove every country in a region.
- CJ documents `listedNum` as the number of platform listings, not units sold, orders, or buyers.
- `GET /product/productComments` provides a total and individual review scores/comments, but the documentation does not expose a direct units-sold field or documented aggregate product-rating field. Treat derived review metrics as CJ supplier-platform evidence, never as Sals3 buyer reviews.
- A CJ freight result proves neither import legality nor product eligibility. Country/category policy, permits, certifications, and IP rights require separate evidence and review.

References:

- <https://developers.cjdropshipping.com/en/api/api2/api/product.html>
- <https://developers.cjdropshipping.com/en/api/api2/api/logistic.html>
- <https://developers.cjdropshipping.com/en/api/api2/api/shopping.html>
- <https://developers.cjdropshipping.com/en/api/start/webhook.html>
- <https://developers.cjdropshipping.com/en/api/api2/standard/points.html>
- <https://developers.cjdropshipping.com/en/api/api2/standard/limit.html>

## Active risks and blockers

### Fabricated comparison price

`sals3-portal` currently derives `oldPriceMinor` by applying an uplift to the current price for deals. That is not evidence of a genuine prior price. Remove the comparison price or back it with real price history before selling. [[ADR-003-international-availability-shipping-and-pricing]] prohibits fabricated was/now pricing.

### Jurisdiction and market configuration

Sals3 is described as Australian-based while older vault material assumes a Philippine company/home market. This is not a find-and-replace: Australian obligations apply to the business, while each destination market can add consumer, tax, product, and disclosure requirements. Resolve incorporation, target launch markets, governing law, and qualified legal/accounting review before real tax, invoice, payment, or launch-gate work. See [[parked-ideas-backlog]].

### Portal findings

[[sals3-portal-code-review-2026-08-06]] records seven read-only findings. The live pagination/page-size mismatch is highest priority. Long-process cache growth and fabricated totals are current correctness/operations risks. Permission-error handling is defense-in-depth because every present role currently includes `product:read`.

The current CJ integration is also single-account prototype infrastructure: global `CJ_API_KEY`, shared in-memory token cache, fixed CJ service/base URL, direct CJ catalogue UI, and development `userId`/`sellerId`. No real registration, tenant, encrypted per-account credential, `SupplierConnection`, or provider selector exists. Preserve Aj's verified CJ behavior but move it behind `CjSupplierAdapter`; do not treat the global key as a multi-tenant design.

## Current build priorities implied by the decisions

1. Resolve the fabricated comparison price defect.
2. Implement real authentication plus separate Retailer/Dropshipper registration, immutable business-model entitlements, and tenant isolation.
3. Implement `SellerAccount`, `SupplierProvider`, `SupplierConnection`, `ProviderProductReference`, `ProviderVariantReference`, and `OfferSupplierBinding`; migrate the current CJ key to the Sals3 Official Dropshipper Account using encrypted secret storage.
4. Approve one low-risk category-and-market pilot rule pack with official-source anchors and named compliance/review owners.
5. Implement shortlist, preflight, hard gates, versioned scoring, attention/exception queues, near-duplicate detection, and WIP limits before any selected CJ candidate can enter auto-publication.
6. Implement the approved server-side catalog/BFF boundary and contracts in [[cj-candidate-to-sals3-product-draft-implementation-spec]].
7. Implement Product, Variant, Offer, Media, candidate, compliance, evidence, mapping, revision, workflow, and audit entities from that specification.
8. Pilot and validate selected Taxonomy v0 branches against representative CJ products.
9. Add secure employee administration, audited auto-publication, Live · Needs Attention, red auto-pause, manual exception, and compliance workflows.
10. Implement points-aware supplier jobs and exact destination freight quoting.
11. Build server cart/checkout and payment reconciliation before order fulfillment.
12. Implement the ADR-004 state machine and recovery controls before sending real CJ orders.
13. Implement ADR-007 immutable `OrderLineSnapshot`, controlled revision media, supplier-change event processing, notification outbox, active-order-aware delist/disconnect, and no-silent-substitution tests.
14. Implement ADR-008 curated Supplier Apps/installations, declared provider capabilities, seller-owned connection/payment isolation, marketplace commission ledger, payout statements, and supplier funding-readiness/funding-hold recovery.

## Recent session notes

- [[sals3-session-2026-08-05-part01-marketplace-landing-page]]
- [[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]]
- [[sals3-session-2026-08-05-part02-footer-and-pagination]]
- [[sals3-session-2026-08-05-part03-geo-aeo-seo-machine-endpoints]]
- [[sals3-session-2026-08-05-part04-home-page-seo-geo-aeo]]
- [[sals3-session-2026-08-05-part05-product-detail-page]]
- [[sals3-session-2026-08-05-part06-guest-header-strip]]
- [[sals3-session-2026-08-05-part07-cart]]
- [[sals3-session-2026-08-05-part08-cart-toast-and-ux-audit]]
- [[sals3-session-2026-08-05-part09-ui-ux-pro-audit]]
- [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]]
- [[sals3-session-2026-08-06-part11-pwa-icons-and-cart-mobile-overflow]]
- [[sals3-session-2026-08-06-part12-category-row-tile-band-and-related-products-dedup]]
- [[sals3-session-2026-08-06-part13-seller-center-first-build]]

## Reusable lessons

See [[sals3-skills]] for the detailed engineering lesson register. Continue to verify against actual code/data, keep source contracts strict, avoid fabricated public claims, and report exact validation evidence rather than assumed behavior.
