---
tags: [sals3, adr, catalog, trending, merchandising, cj, ranking]
aliases: [CJ Trending Products, Supplier Trend Ranking, Trending Now Merchandising]
created: 2026-08-10
updated: 2026-08-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-implementation-phases]]"
  - "[[hot]]"
---

# ADR-012 — Supplier trend signals and storefront merchandising

## Status

`approved`

## Problem

CJ serves many Dropshippers, so its catalogue can provide early signals about products receiving supplier-platform interest. Sals3 wants to discover those candidates and show qualified hot items on the ecommerce site without claiming that CJ listing activity proves sales, demand in the enabled Sals3 market, or product quality.

The ranking must not bypass catalogue filters. Raw CJ candidates, blocked products, stale offers, or unresolved legal/media/freight risks must never appear merely because CJ labels them trending.

## Evidence

- CJ's official Product API documents `searchType=2` for Trending Products, `searchType=21` for the expanded trending view, `orderBy=listedNum`, `sort`, and min/max listed-number filters: <https://developers.cjdropshipping.com/en/api/api2/api/product.html>.
- CJ defines `listedNum` as the number of times/listings for a product. It is not documented as units sold or buyer orders.
- `sals3-portal` already normalizes `listedNum` to `listedCount`. The current ecommerce `deals` section sorts only the fetched page by this value, so it is neither catalogue-wide trend analysis nor proof of a discount.
- ADR-010 already requires popularity data to be separated from qualification fingerprints and treats new ranking/enforcement logic as versioned, measured policy.

## Options considered

### Option A: Sort raw CJ products by `listedNum` in ecommerce

Benefits:

- Very small implementation.
- Produces an immediately changing section.

Risks:

- Direct supplier dependency in the storefront.
- Ranks an arbitrary page rather than the qualified catalogue.
- Confuses listing adoption with sales and may surface saturated, unsafe, unavailable, or unprofitable products.

### Option B: Ignore supplier signals until Sals3 has its own sales

Benefits:

- Only first-party outcomes drive merchandising.
- Avoids opaque provider rankings.

Risks:

- Cold-start catalogue has no useful demand signal.
- Discards legitimate provider discovery information.

### Option C: Use supplier trends as gated, versioned discovery signals

Benefits:

- Helps cold-start discovery while preserving Sals3 qualification.
- Can evolve toward first-party conversion and order outcomes.
- Keeps supplier credentials and ranking truth in the Portal/catalog domain.

Risks:

- Provider trend logic is opaque and can reflect competition/saturation.
- Requires snapshots, category normalization, staleness, measurement, and truthful labels.

## Strongest objection

A high CJ listing count can mean that a product is already crowded, copied heavily, or entering a price war. Showing it as “hot” could push Sals3 toward the same saturated catalogue as every other Dropshipper.

This objection is decisive against raw sorting. The selected option treats CJ trend/listing data as one discovery signal, computes change over time, normalizes within category, applies saturation and qualification context, and eventually gives more authority to actual Sals3 views, carts, purchases, delivery, return, and contribution outcomes. The public label is `Trending now`, never `Best seller` without Sals3 sales evidence.

## Decision

Bogs approved Option C on 2026-08-10.

### 1. Portal owns discovery and ranking

`sals3-portal` owns:

- authenticated CJ trending/list requests through `CjSupplierAdapter`;
- raw supplier popularity snapshots and source request IDs;
- category/market normalization and score policy;
- candidate qualification and publication eligibility;
- versioned trend score/state and audit;
- the protected published-product storefront endpoint.

`sals3-ecommerce` never calls CJ directly. It renders only published Sals3 products returned by the Portal, using controlled catalogue media and current purchasability.

### 2. Provider signals

Capture, when provided:

- CJ official trending membership (`searchType=2`/`21`);
- `listedNum`/`listedCount`;
- observation time, provider product ID, connection/provider, category, and source request ID;
- product creation time/newness;
- stock, price, review, shipping, and evidence freshness from the normal candidate pipeline.

`listedCount` is a ranking signal only. It never changes `PASS`, `REVIEW`, `HOLD`, or `BLOCKED`, never triggers an expensive qualification fetch by itself, and never authorizes publication.

### 3. Ranking evolution

- **V0 — cold start:** official CJ trending membership plus category-normalized `listedCount`, after every Sals3 publication gate. No `Best seller` claim.
- **V1 — history available:** add listing velocity (`delta(listedCount) / elapsed time`), time decay, product age, stock/price stability, review confidence, freight/margin readiness, and a versioned saturation/competition signal. Prefer sustained recent growth over a large lifetime count.
- **V2 — Sals3 outcomes available:** add Sals3 impressions, PDP views, add-to-cart, checkout start, purchase conversion, contribution, cancellation/return/refund, and delivery outcomes. First-party verified outcomes progressively outrank the CJ proxy.

Exact weights and thresholds are not fixed in this ADR. They belong to a versioned `TrendRankingPolicy`, run in shadow mode, measured by category/market, and promoted under ADR-010. Correlated signals must not be double-counted as independent proof.

ADR-013 calibrates the rollout: V0 needs only bounded daily snapshots, category-relative ordering, evidence expiry, and the normal publication gates. Velocity, outlier treatment, saturation modelling, and first-party outcome weighting remain V1/V2 work triggered by enough time-series and Sals3 outcome data; they are not phase-1 launch blockers.

### 4. Eligibility before rank

A product is `TRENDING_ELIGIBLE` only when its current published offer/revision is:

- in an approved category and enabled market;
- `LIVE` or permitted `LIVE_NEEDS_ATTENTION`, not `AUTO_PAUSED`;
- currently purchasable with fresh-enough stock, price, freight, and contribution evidence;
- free of unresolved legal, safety, permit, IP, mapping, media-rights, duplicate, or evidence review;
- backed by a valid media set under ADR-011;
- not suppressed by seller/admin merchandising controls.

Trend score is calculated only after this eligibility filter. If eligibility later fails, removal from the public trending set is immediate even when the cached trend score remains high.

### 5. Trend state and truthful labels

```text
TRENDING_ELIGIBLE | TRENDING_ACTIVE | TRENDING_EXPIRED | TRENDING_SUPPRESSED
```

- Portal surfaces: **All Supplier Products -> Trending on CJ**, **Qualified Products -> Trending potential**, and Product Catalogue trend state/last-calculated time.
- Ecommerce surface: **Trending now** contains only `TRENDING_ACTIVE` published products.
- Do not use `Best seller`, `Most purchased`, or a sales count until backed by verified Sals3 orders.
- Do not label the section `Deals` unless a real promotion/previous-price contract proves savings.
- When provider/ranking evidence expires and no valid first-party fallback exists, remove the trend badge/section placement rather than guessing.

### 6. Snapshot cadence, cost, and fairness

- Run trend discovery as a low-priority bounded Portal job, separate from protection-critical stock/price/freight work.
- Initial launch cadence is a versioned configuration, with a conservative daily default for approved pilot categories; change it only after measuring CJ request/points cost and trend usefulness.
- Snapshot only the approved pilot scope and provider result pages needed for the bounded candidate pool.
- Normalize/compare within relevant category and market. Use diversity caps so one supplier/category does not occupy the whole section.
- Persist last success and evidence expiry; provider failure leaves the last score historical but cannot keep an expired public badge alive.

### 7. Storefront contract

The Portal exposes a protected read-only endpoint such as:

```text
GET /api/storefront/products?section=trending&market=<code>&limit=<n>
```

It returns published Sals3 identifiers, revision/media read model, price/purchasability, truthful badge, rank version, and calculation time. It does not expose raw CJ scores, credentials, blocked candidates, reviewer notes, or unpublished evidence.

### 8. Ready-to-code slices

Implement in this order:

1. **Adapter contract:** add a provider-neutral `listTrendingCandidates` capability and CJ implementation using the official trending/listed parameters. Validate the response at the adapter boundary and retain request IDs for support.
2. **Migration and repository:** append-only popularity snapshots, ranking-policy records, component/score/state/expiry, suppression, indexes, idempotent snapshot keys, and tenant/provider/category scope.
3. **Bounded snapshot worker:** approved pilot categories only, cost/request budget, per-connection isolation, lease/checkpoint, daily default cadence, heartbeat, retry/dead-letter, and audit.
4. **Pure ranking engine:** category/market normalization, freshness, V0 components, deterministic tie-break, diversity caps, versioned policy, and shadow output. Keep qualification input read-only and separate.
5. **Eligibility join:** derive trend eligibility from the current published Product/Revision/Offer/Media/Market state; immediate suppression on block/review/hold/pause/staleness even if score storage lags.
6. **Portal surfaces:** `Trending on CJ`, `Trending potential`, component explanation, last calculation/evidence age, suppression control, and Product Catalogue trend state without exposing a misleading sales claim.
7. **Storefront contract and ecommerce section:** protected `section=trending`, controlled media/current price/purchasability, cache expiry no later than score expiry, truthful `Trending now`, and hide/fall back to normal catalogue ordering when no unexpired eligible result exists.
8. **Shadow/canary and evolution:** measure result quality/cost/diversity, approve V0 promotion, then add velocity/history and later Sals3 first-party outcomes under new ranking-policy versions.

## System impact

- Data and schema: `SupplierPopularitySnapshot`, `TrendRankingPolicy`, `CatalogTrendScore`/state, component signals, expiry, audit, and seller/admin suppression.
- Modules: Portal supplier adapter, bounded discovery worker, ranking service, catalogue query, storefront API; ecommerce `Trending now` section and cache only.
- User workflow: sellers can discover trending CJ candidates, see why a qualified/published product is or is not trend-eligible, and suppress merchandising without changing publication.
- Financial or compliance effect: modest supplier/API/storage cost; truthful labels reduce fabricated sales/deal claims; rank gating prevents popularity from bypassing safety/commercial rules.
- Migration and rollback: remove the current page-local `deals` interpretation. A feature flag can disable the public trend section without deleting snapshots/scores. Roll back to the last valid ranking policy or normal catalogue ordering.

## Required verification

- Focused tests:
  - CJ trending/listed fields parse without treating `listedCount` as sales;
  - category normalization and velocity are deterministic for one policy version;
  - popularity-only changes never alter qualification or spend full evidence calls;
  - blocked/review/hold/paused/stale products are never trend-eligible;
  - expired evidence removes `TRENDING_ACTIVE` even when the prior score is high;
  - seller/admin suppression removes merchandising without unpublishing the product.
- Full or cross-module tests:
  - CJ signal -> snapshot -> shadow score -> promoted score -> qualified published endpoint -> ecommerce section;
  - one tenant/provider failure does not affect another and does not leak data;
  - ranking-policy rollback restores the prior ordering/state;
  - storefront returns no candidate, raw supplier score, or unpublished revision.
- Manual acceptance:
  - Portal labels distinguish `Trending on CJ`, `Trending potential`, and public `Trending now`;
  - users never see `Best seller` or `Deals` from listing count alone;
  - category diversity, stale removal, and suppression behave clearly on desktop/mobile.
- Data reconciliation:
  - every public trending product is published, purchasable, policy-current, media-valid, and backed by an unexpired score;
  - snapshot/score/audit counts reconcile by provider/category/policy version;
  - no score exists without component evidence timestamps and an algorithm/policy version.

## Supersession

This supersedes the temporary page-local interpretation of CJ `listedCount` as the ecommerce `deals` ordering signal. It does not supersede ADR-010's governance or any publication gate.
