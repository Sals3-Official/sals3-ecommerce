---
tags: [sals3, adr, catalog, cj, inventory, scanning, webhooks, product-evidence]
aliases: [CJ Product Evidence Truth, Lean Catalog Controls]
created: 2026-08-10
updated: 2026-08-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[parked-ideas-backlog]]"
  - "[[hot]]"
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

- `sals3-portal/src/lib/cj/enrichment-schemas.ts` parses the split inventory fields, but `src/lib/cj/evidence.ts` reduces each stock row to `totalInventory`. The qualification rules then use that total for stock and stocked-origin findings. The resulting decision cannot explain whether stock was CJ-warehouse or factory-backed.
- The current `checkShippingRoute()` only proves that at least one observed warehouse row has stock. It does not call destination freight and therefore does not prove a usable route; its name overstates its evidence.
- The current discovery tick starts from the first bounded CJ pages rather than maintaining a completed category/time scan. ADR-010 already approves persistent hot/backfill coverage and recovery, but the documented CJ 6,000-result cap requires an adaptive partition rule before Sals3 can claim full coverage.

### External-channel boundary

Google Merchant/Search specifications are not Sals3 catalog authority. They may become useful compatibility references if Sals3 later exports a Google product feed or structured product data, but they do not create phase-1 requirements. Core authority remains: owner-approved Sals3 rules, actual workspace/code evidence, the enabled market's official requirements, and the official supplier contract.

## Strongest objection

Adding separate inventory states, scan partitions, webhook bookkeeping, and recovery states can become enterprise architecture before the first catalog exists. The low-risk pilot may have fewer than 100 live products, a category query below 6,000 results, one store-wide return policy, no external search index, and no need for global product identifiers.

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

### 2. Separate stocked origin from freight route

Rename the current finding to describe what it proves, for example `NO_STOCKED_ORIGIN`. A stocked origin is useful discovery evidence, not a confirmed route.

`FREIGHT_ROUTE_CONFIRMED` requires the approved destination, exact variant and quantity, origin, product logistics properties, weight/volume, logistics method, amount, response reference, captured time, and expiry under ADR-003. Candidate evaluation can remain `Ready` only under the explicit meaning **qualified candidate**; publication and checkout remain separate current-evidence gates.

### 3. Use adaptive scan coverage, not a speculative crawler

- Start with persistent category/time checkpoints, stable create-time ordering, `pid` deduplication, and a small overlap between resumed windows.
- Record every scan partition's filters, observed count, first/last source keys, started/completed time, and error state.
- Split a category/time window only when its response reaches the documented 6,000-record cap or another provider limit. Split further by supported filters only when time partitioning is insufficient.
- **All Supplier Products** may show observed supplier rows, but a completed coverage badge/count requires every required pilot partition to finish. `Ready` never means every supplier row has been evaluated.

### 4. Keep webhook handling proportional to the live catalog

- Subscribe a CJ product when it becomes a selected import/live product or has an accepted order needing protection; do not spend subscriptions on the full raw candidate pool.
- Store a minimal subscription record with provider connection, product ID, desired/observed state, last verification, failure reason, and retry time.
- A simple scheduled reconciliation covers missed events and verifies subscription/webhook health.
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
- Do not invent GTIN, MPN, manufacturer, or brand values. Those fields become required only when an enabled category, market, manufacturer record, or approved external channel needs them.
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

## Ready-to-code order

1. Preserve split inventory evidence and tests; correct the stocked-origin finding name/meaning.
2. Implement queue/retry/reconnect correctness already approved by ADR-010.
3. Add persistent category/time scan checkpoints and split only on an observed provider cap.
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
- A scan below 6,000 completes without unnecessary partitioning; an at-cap fixture splits deterministically, overlaps safely, and deduplicates `pid`.
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
