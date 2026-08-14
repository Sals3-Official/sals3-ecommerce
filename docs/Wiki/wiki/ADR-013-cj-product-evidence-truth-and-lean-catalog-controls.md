---
tags: [sals3, adr, catalog, cj, inventory, scanning, webhooks, product-evidence]
aliases: [CJ Product Evidence Truth, Lean Catalog Controls]
created: 2026-08-10
updated: 2026-08-12
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: partially-implemented
related:
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-session-2026-08-10-part21-aj-product-filtering-automation-and-stock-sync]]"
  - "[[sals3-session-2026-08-11-part28-cj-legacy-continuous-full-catalogue-plan]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[hot]]"
  - "[[agent-operating-contract]]"
---

# ADR-013 — CJ product evidence truth and lean catalog controls

## Status

`approved`

## Problem

The catalog decision framework is strong, but a deep review found places where the current CJ evidence shape loses distinctions, where a UI label can overstate what was actually proven, and where an initially proposed solution would be heavier than the pilot requires. Sals3 needs the smallest reliable controls that make **All Supplier Products**, **Evaluating**, **Ready**, **Product Catalogue**, and the public storefront truthful without turning optional future integrations into launch blockers.

This ADR separates three things that must not be blurred:

1. verified CJ contract facts;
2. Sals3 policy decisions built on those facts;
3. optional or parked controls that do not belong in the first low-risk pilot.

## Evidence

### Verified CJ contract facts

- CJ inventory exposes separate `totalInventory`, `cjInventory`, `factoryInventory`, and `verifiedWarehouse` fields. `verifiedWarehouse=1` means verified inventory and `2` means unverified inventory. CJ does not state that factory-backed inventory is automatically unorderable: <https://developers.cjdropshipping.com/en/api/api2/api/product.html>.
- Product List V2 has `page <= 1000`, `size <= 100`, and a documented maximum `totalRecords` value of `6000`. It supports category, listing-time, price, warehouse-verification, supplier, product-type, and customization filters, so an over-cap query can be partitioned rather than silently truncated: <https://developers.cjdropshipping.com/en/api/api2/api/product.html>.
- After July 2026 CJ no longer permits `subscribeAll=true`; product/variant/stock notifications require explicit product subscriptions. Subscription capacity depends on the CJ user level, and a webhook topic can auto-close after sustained poor callback success: <https://developers.cjdropshipping.com/en/api/api2/api/webhook.html>.
- CJ's points model gives a base 50,000 points per day, charges documented endpoints, returns HTTP `429` when insufficient points remain, replenishes usable points per minute, and can suspend API access after 30 consecutive days with zero CJ transaction amount. Reactivation occurs on CJ's API page: <https://developers.cjdropshipping.com/en/api/api2/standard/points.html>.
- CJ's documented synchronization flow is product list -> details -> variants when needed -> real-time inventory. Freight calculation is a separate destination-specific operation: <https://developers.cjdropshipping.com/en/api/start/Products-Synchronization-Processing.html>, <https://developers.cjdropshipping.com/en/api/api2/api/logistic.html>.

### Verified current Sals3 behavior

- `sals3-portal/src/lib/cj/enrichment-schemas.ts` parses the split inventory quantity fields (`totalInventory`, `cjInventory`, `factoryInventory`); `verifiedWarehouse` is not parsed at all today — the Zod schema strips it at the supplier boundary. `src/lib/cj/evidence.ts` then reduces each stock row to `totalInventory`. The qualification rules then use that total for stock and stocked-origin findings. The resulting decision cannot explain whether stock was CJ-warehouse or factory-backed.
- The current `checkShippingRoute()` only proves that at least one observed warehouse row has stock. It does not call destination freight and therefore does not prove a usable route; its name overstates its evidence.
- The current discovery tick starts from the first bounded CJ pages rather than maintaining completed coverage. The active portal adapter uses legacy `GET /api2.0/v1/product/list`, not Product List V2. The documented V2 maximum `totalRecords=6000` therefore cannot be used as a legacy completion, split, or failure rule. Legacy coverage needs adaptive category/time/price partitions and explicit refusal of false completeness.

### External-channel boundary

Google Merchant/Search specifications are not Sals3 catalog authority. They may become useful compatibility references if Sals3 later exports a Google product feed or structured product data, but they do not create phase-1 requirements. Core authority remains: owner-approved Sals3 rules, actual workspace/code evidence, the enabled market's official requirements, and the official supplier contract.

## Strongest objection

Adding separate inventory states, scan partitions, webhook bookkeeping, and recovery states can become enterprise architecture before the first catalog exists. The low-risk pilot may have fewer than 100 live products, one store-wide return policy, no external search index, and no need for global product identifiers.

The objection is valid. This ADR therefore uses **triggered complexity**: preserve evidence now, add the small correctness guard now, and activate heavier machinery only when the real limit or integration appears.

## Decision

Bogs approved the calibrated direction on 2026-08-10. The earlier product-gap recommendations are narrowed as follows.

### 1. Preserve inventory truth without declaring factory stock unusable

Store inventory observations per exact provider variant and origin with:

```text
countryCode
cjInventory
factoryInventory
totalInventory
verifiedWarehouse: VERIFIED | UNVERIFIED | UNKNOWN
capturedAt
sourceRequestId
```

Derived stock evidence is:

```text
CJ_WAREHOUSE_STOCK | FACTORY_BACKED_STOCK | MIXED_STOCK |
ZERO_STOCK | UNKNOWN_STOCK
```

- `ZERO_STOCK` and `UNKNOWN_STOCK` remain recoverable `HOLD` conditions.
- Factory-backed or unverified stock is not automatically blocked. It may produce `PASS_WITH_ATTENTION` when the pilot policy accepts its handling risk and later freight/order confirmation succeeds; otherwise it is a policy-defined `HOLD`.
- A customer-facing availability claim never comes from `totalInventory` alone. Publication and checkout re-confirm the exact variant, current orderability, cost, stock, and destination freight.
- Preserve raw components even when a derived total is convenient. A future policy change must be able to re-evaluate old evidence without another supplier call solely because Sals3 previously discarded fields.

### 1a. Keep All Supplier Products inventory review manual and intentionally sparse

**Owner decision, 2026-08-12 — implemented in `sals3-portal` (migration `0013_lean_supplier_intake` generated, NOT applied).** The raw **All Supplier Products** catalogue is a discovery and local-screening surface, not a mandate to call CJ inventory for every observed PID. It starts with `INVENTORY_NOT_CHECKED` / `STOCK_NOT_CHECKED`; Sals3 does not automatically call a CJ inventory endpoint during discovery, routine review, drawer opening, or background polling merely to replace that state.

- The catalogue uses legacy Product List summaries plus Sals3-local hard rules only. No Gemini or other AI service is part of this path.
- A staff member may inspect the matching product manually in CJ/MyCJ and record a **manual stock attestation** in Sals3: `IN_STOCK`, `NO_INVENTORY`, or `COULD_NOT_VERIFY`, with actor, timestamp, optional observed quantity/origin, and a short note. This is not labelled CJ API-verified evidence and does not spend CJ API points.
- A manual finding of no stock/no stocked origin becomes `NEEDS_ATTENTION`; it is recoverable, never a permanent product block. An uninspected row remains `STOCK_NOT_CHECKED`, not falsely `IN_STOCK` or `NEEDS_ATTENTION`.
- "View Supplier Source Details" is read-only and must render the saved Sals3 snapshot/attestation with its timestamp. Opening it must never make a supplier request. Any future explicit API refresh control requires a separate owner decision, a visible point-cost disclosure, server-side authorization, and idempotency.
- When a product is deliberately converted to a real Sals3 draft, the product-detail fetch needed to obtain variants/media/attributes remains a separately budgeted action. It is not an excuse to poll inventory on every raw supplier row.

This preserves the existing requirement to retain truthful stock evidence whenever Sals3 actually obtains it, while making the mass-catalogue intake cheap and honest about what it has not checked.

> [!IMPORTANT] Narrow exception carved out 2026-08-13 — owner decision
> **All Supplier Products** may now also browse CJ's **live** catalogue on
> demand, superseding the "no CJ calls" rule above **for this page only**.
> Each render makes exactly one live `GET /product/list` request through the
> signed-in seller's own CJ connection (200 products per page, the documented
> legacy maximum), throttled to 30 CJ calls/minute per user, plus an
> hourly-cached category tree read. Cost is higher **by design** — roughly 50
> points per page view, accepted by the owner in exchange for lower database
> load — and every fast-paging seller is capped by the per-user throttle
> before it can drain the shared discovery budget.
>
> This still spends **zero writes**: browsing never creates, refreshes, or
> evaluates a candidate, and discovery's own workers remain the only writers.
> `listBrowsePage` on the adapter contract is a new, separate entry point from
> discovery's `listCatalogPage`/`listCuratedPage`, whose deterministic
> `orderBy=createAt&sort=asc` ordering is untouched. A seller-scoped
> `findPipelineMatchesByPid` lookup (`LEFT JOIN` on `candidate_evaluations`,
> deliberately, so a discovered-but-unevaluated candidate still matches) shows
> whether a live row has already entered the pipeline, without making that
> answer authoritative for anything else.
>
> The saved-data read this section originally described is fully replaced for
> this one page, not layered on top of it — the old model is deleted. §1a's
> manual-review rule for stock attestation is unchanged: browsing shows CJ's
> own live numbers as CJ's numbers, and does not become a stock attestation.
> `sals3-portal` [PR #57](https://github.com/Sals3-Official/sals3-portal/pull/57), merged.

#### CJ call-budget principle (owner decision, 2026-08-12)

CJ points and QPS are a finite shared operational resource, reserved first for real customer- and order-critical operations: checkout, order acceptance, the necessary final freight/inventory/order-confirmation actions, selected/live-product operations, and owner-approved recovery. Discovery, browsing, review, and refresh work are all lower priority than any of those and must visibly defer rather than consume the reserve.

Concretely:

- Before adding or retaining any CJ call, establish that the same user outcome cannot come from persisted Sals3 data, an existing webhook/event, a bounded cached result, or a human manual review. If it can, use that route.
- A UI render, typing/search/filter action, pagination action, source-drawer open, routine poll, broad-catalogue review, or passive freshness timer must never create a CJ request by default.
- New supplier calls are server-side only, bounded, idempotent where applicable, rate-limited through the shared limiter, and observable with purpose, count, and points impact. No hidden background polling and no per-row or per-render calls.
- Persist and honour `pointsInfo`, and account for the documented endpoint cost before any fan-out.

The four concrete applications of this principle are the new-PID intake ceiling, the one-time existing-backlog drain, the local-only All Supplier Products search/category/signal views, and manual stock review. None of them may be weakened by adding a convenience supplier call. [[agent-operating-contract]] §9 carries the short form every agent must read before planning a CJ-connected change.

#### 1b. New-PID intake ceiling and one-time existing-backlog drain (owner decision, 2026-08-12)

**Intake ceiling.** A hard ceiling of **5,000 NEW CJ product PIDs admitted from broad discovery per supplier connection** — a ceiling on unique products, not on HTTP requests. This is the active intake policy until the owner explicitly changes it; it does not expire, reset, or raise itself, and no ordinary seller/admin UI control may move it. Configuration name: `CATALOG_NEW_DISCOVERY_PID_LIMIT`, default `5000`, validated strictly.

- Every CJ product-list discovery lane shares one durable capacity ledger, including the curated Trending / Most listed / New arrivals lanes. Re-observing an already persisted PID never consumes capacity.
- The ceiling is never overshot. Capacity is taken by a conditional database update inside the same transaction that inserts the candidate, so concurrent workers and at-least-once redelivery cannot race past it. A lane that cannot fully ingest the page it is about to request does not request it: it defers the unit, persists `NEW_PID_CAP_REACHED`, and leaves its checkpoint resumable. The result is exact or safely underfilled by less than one page — never exceeded, never partially ingested, never silently truncated.
- A later owner-approved increase resumes from the durable ledger without restarting, duplicating, or losing coverage.

**One-time existing-backlog drain.** Candidate Pipeline work that existed when the lean policy activated must be reconciled to it before broad discovery makes any new `product/list` request. The gate is per connection, database-backed, and stamps an immutable activation cutoff plus a `DRAIN_COMPLETE` equivalent, so retries, restarts, and future products cannot re-arm it.

- "Backlog" means only pre-cutoff work that is still in-flight or retryable under the lean policy. Permanent terminal screening decisions are already resolved and never deadlock the gate; nor does an exhausted dead letter, which belongs to the Exception Queue and a person.
- Draining is local: it re-admits bounded batches to the screening evaluator, which spends no CJ points. It never drains the backlog with mass `product/query` or inventory calls, and it deletes no candidate, snapshot, evaluation, or audit event.
- While backlog is nonzero, no lane advances a checkpoint, marks coverage complete, or discards a pending partition. A cap or backlog pause is a pause, never a completed catalogue cycle.

**Curated CJ lanes.** `CJ Trending` (`searchType=2`), `Most listed on CJ` (`orderBy=listedNum`, fixed `sort=desc`), and `New arrivals` (`orderBy=createAt`, fixed deterministic sort, bounded `createTimeFrom`/`createTimeTo`) use only legacy `GET /api2.0/v1/product/list`. They wait behind the drain gate, share the same PID ledger, deduplicate PID admission, and are structurally incapable of marking a partition, cycle, or catalogue complete — they live outside the coverage machinery entirely. A signal observation (`CJ_TRENDING`, `CJ_HIGH_LISTED`, `CJ_NEW_ARRIVAL`) never changes a product's lifecycle status, market eligibility, or manual stock-review state. `listedNum` remains platform listings, never units sold.

A second `CJ Trending — more` (`searchType=21`) lane is **deliberately not implemented**: the decision authorized it only if CJ's real response contract provides a distinct continuation/result set, and no primary source verifies that. Creating it anyway would double-report the same products as a second signal.

> [!IMPORTANT] Superseded 2026-08-12 — owner decision
> The **5,000-PID lifetime ceiling** above is replaced by a **600-PID rolling
> wave**: `CATALOG_NEW_DISCOVERY_WAVE_SIZE` replaces
> `CATALOG_NEW_DISCOVERY_PID_LIMIT`. Discovery now admits up to 600 new unique
> PIDs per wave, then waits for that wave's queued/evaluating/retryable work to
> settle before the next wave opens — not a lifetime cap, so the catalogue can
> exceed 5,000 total PIDs across successive waves. Migration
> `0016_rolling_pid_waves.sql` backfills existing capacity rows (`limit_value`
> becomes each connection's current `admitted_count`, or 600 if zero) so no
> connection's history is silently reinterpreted as under- or over-cap.
>
> Running this change against production the same day surfaced two discovery
> deadlocks this section's design did not anticipate — a Resume that could not
> revive a freshness-sweep chain a Pause had killed, and 82,679 historical rows
> re-filling the intake gate faster than evaluation could drain it — plus a
> curated-lane starvation issue (the coverage-partition scanner winning every
> wave by raw request rate rather than by priority). All three were fixed the
> same day. Full detail, production counters, and the exact fixes:
> [[sals3-session-2026-08-12-part36-rolling-pid-waves-and-discovery-deadlocks]].

### 2. Separate stocked origin from freight route

Rename the current finding to describe what it proves, for example `NO_STOCKED_ORIGIN`. A stocked origin is useful discovery evidence, not a confirmed route.

`FREIGHT_ROUTE_CONFIRMED` requires the approved destination, exact variant and quantity, origin, product logistics properties, weight/volume, logistics method, amount, response reference, captured time, and expiry under ADR-003. Candidate evaluation can remain `Ready` only under the explicit meaning **qualified candidate**; publication and checkout remain separate current-evidence gates.

### 3. Use legacy adaptive scan coverage with explicit completion proof

- Use only legacy `GET /api2.0/v1/product/list` for full-catalogue discovery. Do not call/listV2 and do not apply its `6000` maximum to legacy results.
- Give each cycle an immutable cutoff and persistent leaf-category roots. Record every category/time/price partition's filters, ancestry, observed count, PID checksum, lease, started/completed time, and error state.
- Fetch at `pageSize=200`; a partition with `total<=200` completes only when valid unique PID count equals total. Split denser partitions adaptively by time and then price with boundary overlap and PID deduplication.
- If the minimum time-and-price bucket remains dense, reconcile every legacy page twice under fixed ordering. Require two identical complete PID-set checksums and unique count equal to reported total. Otherwise persist `PROVIDER_COVERAGE_UNRESOLVED` and block parent/cycle completion.
- **All Supplier Products** may show observed supplier rows, but a completed coverage badge/count requires every required partition to prove completion. `Ready` never means every supplier row has been evaluated.

### 4. Keep webhook handling proportional to the live catalog

- Subscribe a CJ product when it becomes a selected import/live product or has an accepted order needing protection; do not spend subscriptions on the full raw candidate pool.
- Store a minimal subscription record with provider connection, product ID, desired/observed state, last verification, failure reason, and retry time.
- Queue-delayed reconciliation covers missed events and verifies subscription/webhook health; it is not a cron schedule.
- Priority eviction, multiple subscription tiers, or a dedicated subscription allocator is activated only when measured live-product demand approaches the account limit.
- Monitor auto-closed topics and surface a **Reactivate webhook** action; webhooks never replace reconciliation.

### 5. Treat points exhaustion and inactivity suspension as recoverable connection health

- Read and persist `pointsInfo` from CJ responses. Reserve budget priority for checkout, accepted-order protection, and live-offer reconciliation before discovery backfill or trend snapshots.
- HTTP `429` sets a retry time from the next sensible replenishment window; it does not create a permanent product failure.
- Distinguish `POINTS_EXHAUSTED` and `SUSPENDED_INACTIVITY` from bad credentials and intentional disconnect. Affected queued products move to recoverable `HOLD`.
- **Supplier Apps** shows the real recovery: visit/reactivate the CJ API access when required, verify the connection, append an audit/outbox event, and requeue affected work in bounded batches.

### 6. Use a small supported-product-mode allowlist

The pilot accepts only product modes whose order, inventory, content, and fulfillment behavior are implemented and tested. Unknown modes, service-only items, packaging-only items, and unsupported customization/POD flows receive `NOT_SUPPORTED_IN_PILOT`; this is not a claim that they are invalid products.

Do not share one assumed `productType` enum between CJ endpoints when their documented value sets differ. Normalize endpoint-specific values into a Sals3 provider capability record. Expand the allowlist only with representative fixtures and an end-to-end order test.

### 7. Keep phase-1 identity minimal and variant-safe

- Canonical identity remains Sals3 `Product.id` and `Variant.id`; CJ `pid`, `vid`, SKU, and barcode remain provider references/claims.
- Do not invent GTIN, MPN, manufacturer, or brand values. Those fields become required only when an enabled category, market, manufacturer record, or approved external channel needs them. [[ADR-016-google-merchant-center-product-feed-compliance]] (2026-08-11) is that approved external channel — it requires the eventual Product/Offer schema to carry nullable `gtin`/`mpn`/`brand`/`identifierExists` columns from the first migration, but does not itself authorize inventing a value for any specific product; this screening rule is unchanged until a real GTIN/MPN/brand source is verified per product.
- Preserve Sals3 variant IDs when CJ labels or ordering change. New variants enter draft; removed variants become unavailable/tombstoned; ambiguous option changes create `VARIANT_MAPPING_CONFLICT`.
- Never silently substitute a provider variant on an accepted order. Any future supplier failover applies only to new purchases after fresh validation and an audited binding change.

### 8. Make media truthful with the smallest useful binding

ADR-011 remains controlling. Add an explicit variant-to-media binding when a product's option changes the visible item. The selected variant's public picture, color/style label, included quantity, and required measurement facts must agree. A mismatch is `NEEDS_MEDIA_REVIEW`; it is not solved by a better-looking generic image.

The pilot can launch supplier-controlled media first and add seller upload later through the same resolver. No separate enterprise media-moderation service is approved.

### 9. Keep returns and public-catalog consistency lean

- One approved, versioned store-wide return/refund/warranty policy per enabled pilot market is sufficient initially. Record the accepted version on the order. Add product-specific exceptions only when an enabled category genuinely needs them.
- The Product Catalogue database is the phase-1 source of truth. The storefront read model includes only the published revision, live offer, current market eligibility, purchasable variant, and resolved media.
- A separate outbox/search-index repair system is required only when Sals3 introduces an independently updated search index or catalog cache. Until then, do not build infrastructure for a component that does not exist.

### 10. Keep reviews and trending truthful but simple

- The simplest safe review launch is to omit CJ reviews from customer-facing Sals3 ratings. If shown, label them **Supplier-platform reviews** and keep them separate from future **Verified Sals3 purchases**.
- ADR-012 V0 remains: official CJ trending membership plus category-relative `listedCount`, daily bounded snapshots, expiry, and all normal publication gates. `listedCount` is never units sold and cannot support `Best seller` or `Deals`.
- Velocity, outlier treatment, saturation modelling, and first-party conversion/return outcomes remain V1/V2 triggers, not V0 launch blockers.

### 11. Park controls that do not belong in the low-risk pilot

The following remain discoverable in [[parked-ideas-backlog]] and are not authorized phase-1 work:

- product-safety incident/recall case automation;
- GTIN/MPN and channel-feed integration;
- automated physical sample-inspection software;
- external search-index reconciliation before such an index exists;
- advanced trend statistics;
- complex per-product return-policy rules.

### 12. Keep core automation inside Sals3; use durable managed delivery without cron

- The catalogue decision engine, tenant authorization, supplier evidence, policy version, retry/recovery state, current projection, and audit remain Sals3 TypeScript/PostgreSQL responsibilities. n8n is not an authoritative catalogue runtime.
- The approved implementation target is Neon PostgreSQL plus private Vercel Queues in Sydney. One authenticated idempotent Start/Resume action creates a durable chain; each cycle enqueues its successor with a points/freshness-aware delay. Browser or owner-PC presence is not required after start.
- No cron or scheduled GitHub Actions tick belongs in the target runtime. The existing protected tick may remain temporarily as break-glass recovery only until queue replacement tests pass.
- Queue consumers remain idempotent because Vercel Queues is at-least-once. PostgreSQL stores leases, CAS state, outbox intent, failed-work visibility, and the Exception Queue because the transport has no application DLQ.
- Queue messages contain stable Sals3/provider IDs, evidence/policy versions, and admission reason only. They never contain provider tokens, database credentials, raw supplier payloads, or seller personal data.
- n8n may handle peripheral alerts, reports, reminders, and later CRM/accounting integrations. It never decides qualification, stock/publication eligibility, or tenant ownership.

Current official platform references, verified 2026-08-10:

- Vercel Cron limits: <https://vercel.com/docs/cron-jobs/usage-and-pricing>
- Vercel Queues delivery/security/retry behavior: <https://vercel.com/docs/queues>
- n8n execution-based pricing and five-minute schedule estimate: <https://n8n.io/pricing/>

## Ready-to-code order

1. Preserve split inventory evidence and tests; correct the stocked-origin finding name/meaning.
2. Implement queue/retry/reconnect correctness already approved by ADR-010.
3. Add legacy category/time/price partitions, immutable cycle cutoffs, atomic-bucket reconciliation, and explicit unresolved coverage; remove every V2/6,000 assumption.
4. Add points/inactivity classifications and bounded recovery.
5. Add supported product-mode normalization/allowlist.
6. Implement exact variant identity/drift handling and simple variant-media truth.
7. Unpark destination freight only after ADR-003 approves a market; then add publication/checkout confirmation.
8. Subscribe imported/live CJ products and add simple reconciliation when the canonical Product/Variant/Offer slice exists.
9. Implement the lean Product Catalogue/storefront resolver.
10. Implement truthful trend V0 after qualified published products exist.

## Required verification

- Inventory fixtures cover CJ-only, factory-only, mixed, zero, unknown, verified, and unverified rows without losing source fields.
- Factory-only evidence follows the versioned pilot policy; it is not hard-coded as either clean pass or permanent block.
- A stocked origin cannot set `FREIGHT_ROUTE_CONFIRMED` without a fresh destination quote.
- Legacy totals exactly 6,000 and greater never trigger a V2-cap rule; density-driven time/price splitting, overlap/deduplication, stable atomic reconciliation, and unresolved non-convergence are deterministic.
- HTTP `429`, inactivity suspension, intentional disconnect, bad credentials, and webhook auto-close produce different audited recovery actions.
- Unsupported product modes remain visible with `NOT_SUPPORTED_IN_PILOT` and consume no unsupported import/publication path.
- New/removed/renamed variants preserve Sals3 identity and accepted orders never change binding.
- The public read model cannot return a raw candidate, unpublished revision, invalid media set, or non-purchasable offer.
- Trend V0 never changes qualification and never labels `listedCount` as sales.

## System impact

- Cost: neutral to lower for the pilot. The decision preserves necessary evidence but defers unused services and advanced models.
- Security: no new client trust; supplier evidence, points, subscriptions, media, and recovery actions stay server-side and tenant-scoped.
- Data: split inventory observations, scan partitions, connection-health reasons, minimal webhook subscriptions, product-mode normalization, and variant-media bindings are future implementation work.
- Rollback: policy versions can return factory/unverified evidence to `HOLD`, disable trend V0, or pause affected publication without deleting snapshots, variants, orders, or audit history.

## Supersession

This calibrates the implementation detail of ADR-010/011/012 without weakening their evidence, publication, media-rights, or truthful-label boundaries. It supersedes any interpretation that Google channel rules are core catalog authority, that factory inventory is automatically unusable, or that every listed future control is a launch blocker.
