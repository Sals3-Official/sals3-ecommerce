---
tags: [sals3, roadmap, implementation-plan, task-tracker, canonical]
aliases: [Sals3 Implementation Phases, Sals3 Task Phases, Sals3 Build Register]
created: 2026-07-31
updated: 2026-08-10
status: canonical
authority: execution-plan
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-master-blueprint]]"
  - "[[sals3-feature-landscape-and-expansion-map]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
---

# Sals3 Implementation Phases

> [!IMPORTANT] Canonical Sals3 task register
> This note is the complete source of truth for Sals3 build order, task status, dependencies, and acceptance gates. The stage structure below is [[sals3-ux-build-specification]]'s own **section 20 build order** (Final status, 1 August 2026) — not a paraphrase. [[sals3-management-bible]] defines the domain rules. Historical notes explain why a decision happened but do not override this register.

> [!WARNING] Team-size reality check
> Confirmed team is AJ + Bogs, 2 full-stack developers. Build spec section 21.2: **9 to 14 months to first launch, only with a reduced first release** (section 21.3's "smallest useful first release" table). Do not plan or promise a faster timeline without changing the team size first — this isn't pessimism, it's the spec's own stated condition for this team size.

## Status key

| Marker | Meaning |
|---|---|
| `[x]` | Implemented and verified by code/tests or recorded live evidence. |
| `[~]` | Partially implemented, or the current implementation is incomplete or placeholder behavior. |
| `[ ]` | Approved and open. |
| `[?]` | Requires an owner/leadership decision or real-data evidence. |
| `[P]` | Parked. Do not build without fresh owner approval. |
| `[C]` | Candidate. Useful idea, but not approved as an active build task. |
| `[R]` | Rejected or retired. Preserve for history; do not build. |

## One active track

- **Active track — the new Sals3 system:** the custom customer site and Seller Center. Everything below is governed by [[sals3-ux-build-specification]] section 20.

The earlier dual-track plan in [[sals3-master-blueprint]] is historical and no longer governs execution.

## Constitutional rules for every phase

1. No sample commission rate or payment-partner integration becomes real code until Leadership confirms it (see [[sals3-management-bible#4. Non-negotiable boundaries]]).
2. An out-of-stock variation must never remain purchasable once the catalogue read path exists (build spec section 6.3).
3. The client never calculates a trusted total — only the server's versioned quote is trusted (build spec section 16.1, 16.4).
4. Market-specific tax, invoice, consumer, and governing-law treatment must be confirmed before real money moves. Older Philippine-specific assumptions do not replace review for an Australian-based business and each enabled destination market.
5. Follow the build spec's own dependency table (section 20.2) — do not build a screen before tokens/components exist, the cart before pricing exists, the checkout before idempotency exists, etc.
6. Do not build a parked or candidate item from [[sals3-feature-landscape-and-expansion-map]] without explicit owner approval.

## Retired track — Shopify pop-up store

- [R] Do not deploy or integrate a Shopify interim storefront. Bogs rejected Shopify for the active Sals3 plan on 2026-08-06. Historical blueprint material remains for provenance only.

## Foundation before Stage 1 (not started)

### Vault and planning

- [x] Second-brain vault created, mirroring the BOGS Dashboard vault structure and governance rules (this vault, 2026-07-31).
- [x] Existing v4.0 master blueprint, UI mockups, and presentation deck consolidated into this vault.
- [x] The build spec itself ingested and made canonical (2026-08-03). Team-profile, git sync, and turnover conventions established.
- [~] Category direction confirmed as Taxonomy v0 by ADR-002; commission values, payment partners, market configuration, and category-by-category production validation remain open.
- [?] Confirm whether `sals3.com` domain, hosting, and DNS access are already provisioned.

### The build spec's own "first 10 working days" (section 20.6) — do these before Stage 1

| Day | Action | Output |
|---|---|---|
| 1 | Get access to the old system, hosting, analytics, payment accounts. Name an owner for each. | `access-matrix.md` |
| 2 | Export the plugin list and custom code from WooCommerce (the old system). | `current-features.md` |
| 3 | Map the integrations: payment, courier, notification, analytics, accounting. | `integration-map.md` |
| 4 | Measure the data volumes. Take a sample of each entity. | `data-catalog.md` |
| 5 | Export the top web addresses, traffic, conversion rate, device mix. | `seo-baseline.csv` |
| 6 | Record the seller, support, and finance procedures with those teams. | `feature-list.csv` |
| 7 | Write the golden scenarios with exact expected totals (spec section 20.5). | `golden-scenarios.md` |
| 8 | Build the repository, the pipeline, and the health endpoint — this is Stage 1. | A deployed skeleton |
| 9 | Build the token layer and 3 base components. | A component page |
| 10 | Present the data model, the risks, and the estimate. | `ADR-001` and a backlog |

As of 2026-08-06, the repository and local verification pipeline exist, a verified storefront slice exists, and ADR-001 through ADR-005 record the approved catalog/commerce direction. Old-system discovery work in days 1-7, the deployed skeleton/health endpoint, and the production data model remain incomplete.

## The 8 stages (build spec section 20.3)

### Stage 1 — Foundation (in progress)

- [x] Create the repository. Add lint/type/test pipeline. (Next.js scaffold, ESLint/Airbnb, Prettier, Husky, Vitest, Playwright — verified with lint, format, typecheck, build, unit, E2E, and high-severity npm audit checks on 2026-08-05.)
- [ ] Add the deployment pipeline and a health endpoint.
- [~] Build design tokens: colour, text, space, radius, state. (Font + semantic colour tokens exist in `globals.css`'s `@theme` block as of 2026-08-05 — [[sals3-session-2026-08-05-part01-marketplace-landing-page]]. No space/radius/state token layer yet; still Tailwind defaults.)
- [ ] Build 10 base components: button, input, chip, card, sheet, dialog, tabs, badge, skeleton, toast. (The 2026-08-05 landing page used one-off components instead — flagged as a gap in [[sals3-session-2026-08-05-part01-marketplace-landing-page]], not a substitute for this item.)
- [ ] Add logging, metrics, error reports.

**Exit test:** a page with the base components deploys, and the pipeline blocks a bad change. **Not yet passed** — the pipeline blocks bad changes (verified), but no base component library exists for a page to be built from.

### Stage 2 — Data model and contracts (not started)

- [ ] Define entities: product, variant, offer, `SellerAccount`, category, attribute, media, `SupplierProvider`, `SupplierConnection`, provider product/variant references, `OfferSupplierBinding`, buyer, and address per ADR-001/002/006.
- [x] Approve the CJ-Candidate-Explorer-to-Sals3 contract: candidate-only shortlist, full preflight, hard gates, green/yellow/red human-on-exception operation, auto-publication, Live · Needs Attention, red block/auto-pause, no phase-1 batch import, WIP limits, identity, country/permit/IP controls, editor, API, sync, security, rollback, and tests. See [[cj-candidate-to-sals3-product-draft-implementation-spec]]. This is a specification milestone, not an implementation claim.
- [x] Approve ADR-010's decision-governance amendment: zero silent/untraceable automated decisions, evidence-to-action provenance, risk-aware attention/review boundaries, golden pilot catalogue, shadow/canary promotion, review-only near-duplicate clustering, policy-source records, and explicit future-technology triggers. This is an approved specification milestone, not an implementation claim.
- [ ] Assemble and version the representative 200-500-case golden pilot catalogue when the approved category/market source pool permits it; record expected decisions, reason codes, reviewer, evidence date, and disputed/uncertain cases.
- [ ] Define shadow-decision storage, measured promotion gates, bounded canary activation, enforcement feature flags, and policy-source/applicability records under ADR-010.
- [ ] Define the `Money` and `PriceLine` types (build spec section 16.3).
- [ ] Write API schemas. Generate typed clients.
- [ ] Write the 5 golden scenarios (build spec section 20.5).
- [ ] Add versioned `CategoryMappingRule`, `AttributeMappingRule`, `ProviderProductReference`, `ProviderVariantReference`, mapping log/review state, and audit entities per ADR-001/002/006.

**Exit test:** the team agrees on the entity names, and the schemas generate a client.

> [!WARNING] Do not go to Stage 3 with an unclear data model — a change at Stage 6 costs 10 times more than a change here.

### Stage 3 — Catalogue read path (partially started)

- [~] Build the catalogue service: product, variant, category, media. (`src/services/products.ts` — as of PR #22 (merged 2026-08-05) a Zod-validated wrapper around the real, protected `sals3-portal` storefront API, itself proxying CJdropshipping — a real supplier feed, still not Sals3's own product/variant/category/media model. Wired to the landing page's deals/"For you" grids and the product route below. Two real data-shape bugs found and fixed 2026-08-06: real CJ titles exceeding the schema's length cap failed an entire page's validation (PR #26), and `sals3-portal`'s `totalPages` didn't reflect real reachable depth (its own PR #3). See [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]].)
- [~] Build the list route and product route, server-rendered. (Product route done, PR #21 merged 2026-08-06: `/p/[id]` — server-rendered, `notFound()` on a missing/invalid id or lookup failure, `generateMetadata`, related products. No reviews/description/brand/warranty section — the real `sals3-portal` schema carries none of those fields, so none are shown (an honest cut, not an oversight — see the session note above). No variant selectors — the real backend carries no variant data, none was invented. By-slug lookup now calls `sals3-portal`'s real single-product endpoint directly (PR #28, once its own PR #2 merged) — the earlier capped-scan regression (most real products 404ing) is lifted. Related products still use the capped page-scan stopgap (PR #24) — no category-filter endpoint exists yet. List route (`/c/[category]`) still doesn't exist.)
- [ ] Build filters with counts and the sort control.
- [ ] Build state preservation — test all 6 conditions (build spec section 6.4).
- [ ] Load a realistic quantity of test products, not 20.

**Exit test:** a buyer finds a product with a filter, opens it, and goes back to the same position.

### Stage 4 — Price and promotions (not started)

- [ ] Build the pricing service returning price lines and a total.
- [ ] Build the promotion model (build spec section 17.1).
- [ ] Build the rules engine and quote version.
- [ ] Build the shipping quote input for the delivery region.
- [ ] Implement exact destination/postal freight quote validity and contribution-pricing inputs per ADR-003.
- [ ] Remove fabricated comparison-price behavior or back it with genuine price history.
- [ ] Run the golden carts — every total exact.

**Exit test:** every golden cart returns the exact expected total, deterministically.

### Stage 5 — Cart and checkout (partially started)

- [~] Build the cart service and fulfillment groups. (Cart done, PR #21 open 2026-08-05: client-only, `localStorage`-backed — `src/lib/cart.ts` plus `CartProvider`, `/cart` route, live Add to Cart/Buy Now on the PDP, an add-to-cart toast. No fulfillment groups — no seller/shipment-group data model exists yet, none was invented. Not a server cart: no account, no database, no price/promotion engine behind it — Stage 4 hasn't started, so cart line prices are just the catalogue price.)
- [ ] Build the checkout page with progressive disclosure. (`/checkout` deliberately not built — `Proceed to Checkout` on `/cart` renders disabled with a plain-English note.)
- [ ] Build the guest path.
- [ ] Add the idempotency key and quote version check.
- [ ] Connect one online prepaid method through verified webhooks and reconciliation. **Do not add COD in phase 1**; ADR-005 requires a separate activation gate.
- [ ] Test a retry, a timeout, a duplicate submission.

**Exit test:** the team places a real paid test order; a network retry does not create a second order.

> [!IMPORTANT] Milestone — first vertical slice. The system can take money after this stage.

### Stage 6 — Orders and post-purchase (not started)

- [ ] Build the order record and status history.
- [ ] Connect the courier for tracking data.
- [ ] Build order list and order detail screens.
- [ ] Build self-service return request.
- [ ] Build refund path and notification messages.

**Exit test:** a test order moves from payment to delivery to a refund, visible at each step.

### Stage 7 — Seller and administration tools (not started)

- [ ] Build separate Retailer and Dropshipper registrations and verification. One account has one immutable business model; anyone needing both creates separate accounts and logins. No phase-1 account switcher or automatic conversion.
- [ ] Build Dropshipper-only Supplier Connections: approved provider registry, connection/reauthorization/disconnect states, encrypted secret references, tenant isolation, and sourcing lock until a connection is healthy.
- [ ] Move Aj's existing CJ integration behind `CjSupplierAdapter`; bootstrap the current key once into the separate Sals3 Official Dropshipper Account instead of retaining a global multi-tenant credential.
- [ ] Support one connection per provider per Dropshipper account in phase 1. Enable CJ first; keep Printful, Printify, BigBuy, and Syncee as unevaluated/disabled candidates until separately approved and verified.
- [ ] Present approved providers as curated **Apps & Integrations -> Supplier Apps**. Build installation/scopes/capability records and tenant-owned connections; do not support arbitrary third-party runtime plugins in phase 1.
- [ ] Separate customer payment/Sals3 commission/seller payout from seller-owned supplier payment. Build order-line commission, seller payable, supplier cost, fee/reserve/refund/chargeback, and payout-statement ledger entries; commercial values remain `[?]`.
- [ ] Build CJ funding readiness and pre-payment balance checks. Zero/insufficient balance allows catalog access but funding-holds auto-fulfilled offers, creates `AWAITING_SUPPLIER_FUNDS` for accepted orders, and triggers actionable in-app/push/email recovery with a deadline.
- [ ] Build secure employee product sourcing, attention/exception queue, and audited automatic publication under ADR-001/002.
- [~] Connect Aj's **CJ Candidate Explorer** to shortlist and full preflight; enforce hard gates, versioned scores, near-duplicate detection, `PASS`/`PASS_WITH_ATTENTION`/`REVIEW`/`HOLD`/`BLOCKED`, no phase-1 batch import, and active-job WIP limits.
  - **Done (2026-08-07, `sals3-portal#6`/`#7`):** shortlist persistence in Postgres/Drizzle, `(supplier, external_product_id)` uniqueness so a re-shortlist reuses the row, idempotency replay/conflict, append-only audit, and a real CJ evidence fetch (detail + variants, per-warehouse and per-variant inventory, review counts) stored as one checksummed snapshot per candidate.
  - **Done (2026-08-07, second session, unpublished `sals3-portal` PR pending review):** the automated evaluation pipeline itself — CJ feed ingestion (replacing the manual "Check for Sals3" click), cheap pre-evidence screening, hard gates, and a real `PASS`/`PASS_WITH_ATTENTION`/`TEMPORARILY_INELIGIBLE`/`BLOCKED`/`EVALUATION_FAILED` decision with reason codes, persisted and displayed automatically across new Qualified Products/Evaluating/Blocked-Rejected/Exception-Queue screens. Lease-based job claiming (Postgres `FOR UPDATE SKIP LOCKED`), exponential-backoff retry, and dead-lettering are real and tested. See [[cj-candidate-to-sals3-product-draft-implementation-spec#26. Verified implementation status — updated 2026-08-07 (automated evaluation pipeline)]].
  - **Not done / provisional:** no versioned quality score exists (`candidate_evaluations.score` is reserved and always null). Near-duplicate detection beyond the existing exact `(supplier, external_product_id)` uniqueness is not built. `AU` is approved as the initial buyer destination as of 2026-08-11, but the category/counterfeit policy, price/margin thresholds, source-anchored pilot pack, and AU freight/compliance evidence remain incomplete — see [[parked-ideas-backlog]]. The Portal buyer-destination resolver also remains disabled until the reviewed implementation is updated and merged. Per-seller CJ connections, Supplier Apps, and AliExpress remain a separate, explicitly deferred task.
  - **ADR-010 open work:** no golden catalogue, shadow-decision/promotion record, canary enforcement gate, versioned near-duplicate cluster, policy-source registry, or connection-scoped circuit breaker exists. A different provider product ID may be flagged for `REVIEW`; perceptual similarity must never auto-merge or auto-reject it.
  - **Discovery/queue logic open work (approved 2026-08-10):** replace the fixed page-1-to-5 scan with persistent per-connection scan cycles and non-starving hot/backfill lanes; add explicit queue-admission reasons, positive pilot allowlisting, versioned material versus ranking fingerprints, policy/evidence-freshness re-evaluation, automatic dead-letter reopening on qualifying change/recovery, per-connection failure isolation, fair priority scheduling with aging, completed-cycle disappearance reconciliation, resumable time/request/points budgets, and coverage/lag metrics. For CJ, checkpoint by category/listing time and split only when an observed partition reaches the 6,000-record ceiling—do not build a speculative crawler. Current implementation can miss deep pages, name/shipping changes, policy-version changes, full-evidence drift, and supplier delisting. See [[ADR-010-catalog-decision-governance-and-shadow-enforcement#12. Supplier discovery coverage and queue admission]] and ADR-013.
  - **Publication-blocking correctness fixes:** give every `TEMPORARILY_INELIGIBLE` row a real retry time or recovery trigger; prevent below-threshold null-retry `EVALUATION_FAILED` rows from disappearing; apply one workable-connection rule across ingestion/evaluation and reopen bounded work after reconnect; preserve append-only linked feed/evidence/finding/decision history instead of overwriting the only snapshot; and monitor a real scheduler/coverage heartbeat, not only a green tick response.
  - **Approved disconnect fallback:** owner-requested **Supplier Apps -> Disconnect** is a pause, not a technical failure. Stop supplier calls; expose affected rows under **Blocked / Rejected -> Temporarily unavailable** with `ON_CONNECTION_RESTORED`; preserve their last decision/evidence; disable **Customize & List**; then make **Reconnect and resume evaluation** verify credentials, audit `CONNECTION_RESTORED`, and requeue in bounded batches through **Evaluating**. Development uses this same path—no direct database correction as the normal fallback.
  - **Approved delivery order:** (1) queue/recovery invariants, (2) persistent hot/backfill coverage, (3) material fingerprint and evidence freshness, (4) policy-version re-evaluation, (5) append-only evidence/finding/decision history, (6) isolation/fairness/resumability/heartbeat/delisting reconciliation, (7) approved pilot + golden/shadow/canary, (8) freight/landed-cost/media/duplicate-review gates, then (9) canonical Product Catalogue persistence and **Customize & List -> Add Product**. Units 1-8 are publication prerequisites. Implement ADR-013's lean controls inside these units rather than as a separate platform rewrite.
  - **ADR-011 media work:** build controlled supplier import and seller upload storage; immutable supplier observations; rights/review pipeline; Product Editor **Your pictures** and **Original supplier pictures**; `SELLER_FIRST | SUPPLIER_ONLY` resolver; rights-aware supplier fallback; media source filters/status in Product Catalogue; ProductRevision and immutable order-media tests.
  - **ADR-012 trend work:** extend `CjSupplierAdapter` for official trending/listed queries; persist popularity snapshots; compute versioned category/market-normalized trend state after qualification; add Portal `Trending on CJ`/`Trending potential`; expose published `section=trending`; replace the page-local `deals` interpretation; render truthful ecommerce `Trending now`; add staleness, diversity, suppression, shadow/rollback, and data-reconciliation tests.
  - **ADR-013 evidence-control work:** preserve `totalInventory`, `cjInventory`, `factoryInventory`, and `verifiedWarehouse` separately; rename the current stock-origin check so it cannot imply a destination shipping route; validate real freight at publication and checkout; allow only explicitly supported CJ product modes; keep phase-1 webhooks to explicit live-product subscriptions plus reconciliation; and recover visibly from CJ points exhaustion or inactivity suspension. Factory-backed inventory is policy input (`PASS_WITH_ATTENTION` or `HOLD`), not an automatic rejection.
  - **Automation and stock-sync boundary (approved 2026-08-10):** keep the pilot's protected scheduler and PostgreSQL lease/retry source of truth while queue correctness is fixed. Gate any production Vercel Pro Cron/Queues adoption on beta, cost, region, and reliability review; keep an application-level Exception Queue and idempotent database decisions. n8n is peripheral only. Later stock sync verifies/deduplicates CJ callbacks, re-evaluates the exact variant, updates Product Catalogue availability, reconciles missed events, and revalidates at checkout without rewriting accepted orders. See [[sals3-session-2026-08-10-part21-aj-product-filtering-automation-and-stock-sync]].
- [~] Build CJ-row badges, screening drawer, Product Sourcing queue, My Products Live/Needs Attention/Auto-Paused filters, Issues & Tasks, immediate red in-app attention, and grouped/deduplicated yellow attention.
  - **Done:** the `Check for Sals3` row action and its status pill, a shortlist drawer showing the stored candidate and live CJ evidence, and the Product Sourcing nav group (CJ Candidate Explorer / Shortlisted / Exception Queue) with a Shortlisted queue reading real seller-scoped rows.
  - **Not done:** My Products and its filters, Issues & Tasks, and all attention state and notification behaviour. The drawer shows no score or decision because none exists, and the Exception Queue is empty by construction rather than by missing data.
  - **Superseded 2026-08-10:** the nav group above is stale wording. Qualified Products/Ready/Needs Attention/Evaluating/Blocked-Rejected/Exception Queue are now tabs on one consolidated page, `/products/pipeline` ("Candidate Pipeline" in the nav) - presentation only, no pipeline behaviour changed. A Product Catalogue **design preview** (fictional fixtures, same posture as the Product Editor) now exists at `/listings`, previously a dead nav link. See [[sals3-session-2026-08-10-part22-product-sourcing-consolidation-and-catalogue-preview]] and [[hot]].
- [ ] Build supplier anomaly handling per ADR-007: variant/offer/market-scoped auto-protection, clickable attention evidence/actions, reliable in-app/push/email outbox, severity routing, deduplication, cooldown, retry, and delivery audit.
- [ ] Build immutable `ProductRevision` media and `OrderLineSnapshot` records at order acceptance. Seller/supplier delist or later source edits must block future sales without changing or cancelling accepted orders.
- [ ] Build active-order-aware seller delist and supplier disconnect, fulfillment exception handling, and explicit no-silent-substitution/customer-consent controls.
- [ ] Build versioned country/category allowlists, permit and brand-authorization evidence, counterfeit/IP quarantine, protected-document access audit, and policy-change re-evaluation.
- [ ] Implement **Customize for Sals3** from the existing CJ listing through the approved [[cj-candidate-to-sals3-product-draft-implementation-spec]] contract.
- [ ] Build seller order view and stock control.
- [ ] Build commission calculation and payout report — `[?]` blocked on confirmed commission/fee structure.
- [ ] Build dispute and return handling for the seller.
- [ ] Build support tools: order search, refund, note.

**Exit test:** real Retailer and Dropshipper accounts complete their separate registrations; cannot switch models or cross tenant boundaries; the Dropshipper connects an approved supplier, then completes sourcing, upload, sale, and payout without developer help.

> [!WARNING] Teams frequently forget this stage. A marketplace without seller tools cannot operate — give it a real estimate, not an afterthought.

### Stage 8 — Migration and launch (not started)

- [ ] Build the import tool (build spec section 18).
- [ ] Run the import on a test system; compare counts and sums.
- [ ] Build the redirect map. Crawl the test site.
- [ ] Rehearse the launch. Rehearse the rollback.
- [ ] Launch to a small percentage of traffic, then increase.

**Exit test:** all 6 launch gates (build spec section 19.3) pass.

## The smallest useful first release (build spec section 21.3)

Given the confirmed 2-developer team, the first release must be reduced. Keep these; remove the rest until later:

**Keep:** browse/search/filters/product page; cart, guest checkout, one online prepaid method; order tracking and return request; seller sign-up/product upload/order view/payout report; one correct price with a truthful breakdown; support order search and refund. **COD is removed from phase 1 by ADR-005.**

**Remove for later:** vector search and recommendations; many payment methods; loyalty points and referral programs; advanced seller analytics; complex campaign types; a full support ticket system.

## Ongoing / not yet scheduled

- [ ] Truthful fulfillment/branding protocol: supplier capability, shipping labels, invoices, tracking, and centralized support. Do not claim white-label packaging without verified support from the actual fulfillment path.
- [ ] Confirm incorporation and launch markets; implement and review the required tax, invoice, consumer, and governing-law controls for each market before launch.
- [C] Learned/automated demand forecasting for supplier reorder — candidate, not approved. Build spec section 21.3 explicitly defers "vector search and recommendations."
- [C] Automated platform/stock detection for availability — candidate, not approved.
