---
tags: [sals3, session, cj, discovery, operations, monitoring, multi-tenant, provider-catalog]
aliases: [CJ Discovery Operations Plan, Provider Global CJ Catalogue Architecture]
created: 2026-08-11
updated: 2026-08-11
status: proposed
authority: design-proposal
owner_reviewed: true
owner_approved: false
implementation_status: not-started
related:
  - "[[hot]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-11-part28-cj-legacy-continuous-full-catalogue-plan]]"
---

# 2026-08-11 — CJ discovery operations and provider-global architecture

> [!IMPORTANT] Decision status
> Bogs requested that this operating model and long-term design be recorded in detail. The monitoring requirements and explicit-connection pilot safeguard are required before rollout. The provider-global data model is a **proposed long-term architecture**, not implemented and not yet approved as an amendment to ADR-006/ADR-008. Those ADRs still prohibit treating the Sals3 Official Dropshipper's seller-owned credential as a platform-global credential shared with third-party sellers.

## Problem

The continuous legacy CJ scanner now has database-level coverage states, leases, failure records, outbox state, points accounting, and an authenticated internal status endpoint. It does not yet have a finished operator dashboard. More importantly, the current implementation creates discovery cycles per `supplierConnectionId`; calling Start without an explicit connection targets every workable seller connection.

That shape is safe for tenant isolation but expensive and duplicative for a provider catalogue whose product identities and base feed are largely shared. If 100 sellers connect CJ, a default all-connections Start can create 100 full catalogue scans, consume 100 account budgets, store duplicate supplier rows/evidence, and make coverage harder to understand.

The design must separate:

1. platform discovery of what CJ exposes;
2. shared provider product identity and evidence;
3. seller-owned credentials, selections, subscriptions, orders, economics, and eligibility overlays.

## Verified current implementation

### Connection-scoped execution

The current code is not one provider-global scan. It is a reusable discovery engine instantiated per workable supplier connection:

```text
sellerAccount
  -> supplierConnection
       -> discoveryRunState
       -> discoveryCycle
       -> discoveryPartitions
       -> points/rate budget
       -> supplierCandidates/evaluations
       -> webhook secret/subscriptions
```

When `POST /api/internal/catalog/discovery/start` or `/resume` omits `supplierConnectionId`, `applyDiscoveryControl()` selects every workable connection. Data, leases, budgets, candidates, and secrets remain isolated by connection, but the provider catalogue can be fetched repeatedly.

### Existing internal status surface

The protected endpoint is:

```text
GET /api/internal/catalog/discovery/status
Authorization: Bearer <DISCOVERY_CONTROL_SECRET>
Cache-Control: private, no-store
```

It currently reports:

- generated time;
- workable connection ID and run state (`RUNNING | PAUSED | NEVER_STARTED`);
- current active cycle ID/state, cutoff, start time, and heartbeat;
- total/terminal/unresolved partition counters;
- counts by partition state;
- up to 25 active-cycle blocked partitions with category, provider total, error, and unresolved reason;
- observed CJ points total/remaining/used, observation time, and pause deadline;
- global pending/failed outbox depth and oldest pending time;
- number of failure records in the previous 24 hours;
- Neon storage allowance, utilization, warning, and broad-discovery pause state.

It does not expose supplier tokens, API credentials, webhook signatures, raw payloads, or decrypted secrets.

### Confirmed monitoring gap

The read model calls `findActiveCycle()`, whose states are only `SEEDING` and `RUNNING`. A cycle that terminates as `COVERAGE_UNRESOLVED` is no longer active. Its database rows remain intact, but the current status response may return `cycle: null` and omit that terminal unresolved cycle's blocked partitions.

Therefore the current endpoint is not yet sufficient proof that unresolved coverage is visible to operators. Before rollout it must show at least:

- the active cycle, when one exists;
- the latest terminal cycle;
- unresolved/failed cycle history;
- the oldest unresolved partition age;
- whether a newer cycle succeeded without resolving an older gap;
- a stable operator action/recovery state.

No dashboard should claim “Healthy” or “Complete” while an unresolved required cycle is hidden in history.

## Who should see discovery operations

Full-feed coverage is a platform/supplier-integration responsibility, not a normal seller workflow. The recommended UI separation is:

### Internal Admin/Operations surface

A future permission-gated Admin Portal page owns provider-wide operational truth:

- provider and discovery account identity;
- run/pause state;
- active and latest terminal cycles;
- partition progress and unresolved history;
- heartbeat/stall detection;
- queue/outbox health;
- CJ points/rate state;
- webhook health and subscription utilization;
- database storage pressure;
- safe Start, Pause, Resume, Retry unresolved, and Reactivate webhook actions;
- immutable audit trail of every operator action.

The exact employee permission name is not approved here. It must be a dedicated least-privilege catalogue-operations permission, separate from seller ownership and ordinary product-read access.

### Seller-facing surfaces

Sellers should see only their relevant business state:

- whether a selected/imported product is evaluating, ready, blocked, temporarily unavailable, or failed;
- last evidence time and next refresh;
- seller-actionable supplier connection problems;
- product-level attention affecting their listings/orders.

Sellers should not receive provider-global partition IDs, other sellers' connection identifiers, platform points reserves, infrastructure failures, or internal retry controls. A provider-global outage may produce a sanitized service-health notice, not expose the operations console.

## Operational state interpretation

### Healthy running

```text
runState = RUNNING
active cycle heartbeat is fresh
outbox.failed = 0
oldest pending outbox age is within threshold
storage pause = false
no unresolved required history
```

### Paused intentionally

```text
runState = PAUSED
checkpoints retained
no new broad supplier calls
resume requires authenticated, audited owner action
```

### Temporarily delayed

Examples:

- rate slot unavailable;
- CJ points reserve reached;
- HTTP 429;
- transient network/provider failure;
- queue publish retry;
- connection temporarily unavailable.

These retain their state and successor intent. They must have either a delayed retry or an explicit recovery trigger.

### Failed partition

Repeated provider, validation, or worker failure exhausts the bounded partition attempt budget:

```text
partition.state = FAILED
cycle cannot become COMPLETE
failure record contains a redacted stable error code
operator sees retry/investigation requirement
```

### Unresolved provider coverage

An atomic category/time/price bucket is enumerated repeatedly. Coverage is proven only when two consecutive complete sorted-PID checksums match and unique PID count equals the provider total. Otherwise:

```text
partition.state = PROVIDER_COVERAGE_UNRESOLVED
cycle.state = COVERAGE_UNRESOLVED
catalogue coverage claim = false
```

The system may continue later cycles so new products are not starved, but the historical unresolved obligation remains open until an authorized recovery run proves it or a reviewed provider-contract decision changes the required partition.

## Required alerts and operator actions

The first operations UI/monitor must alert on:

| Signal | Suggested condition | Required response |
| --- | --- | --- |
| Stalled heartbeat | no heartbeat beyond the configured sweep tolerance | inspect queue/outbox; idempotent Resume or break-glass recovery |
| Pending outbox aging | oldest pending exceeds normal publish/retry window | inspect transport/auth; do not mark chain healthy |
| Failed outbox | any failed successor intent | surface exact operation/reference; owner-controlled retry |
| Failed partition | any partition reaches `FAILED` | inspect redacted error and provider behavior; retry through repository workflow, never direct DB editing |
| Unresolved coverage | any required partition/cycle unresolved | retain incomplete status; run bounded reconciliation/contract investigation |
| Points pressure | background reserve reached or HTTP 429 | delay broad work; preserve live/order reserve |
| Storage warning | approximately 70% configured allowance | capacity review before continuing broad growth |
| Storage pause | approximately 80% configured allowance | stop new broad discovery; never delete evidence automatically |
| Webhook degradation | success rate/health indicates possible auto-close | verify callback and owner-controlled reactivation |
| Queue backlog | oldest evaluation/partition age grows past SLO | inspect concurrency, points, connection, and poison work |

Exact numeric heartbeat/backlog SLOs require pilot measurements; they must not be fabricated before real queue operation.

## Pilot deployment safeguard

The development pilot must not invoke the current all-workable-connections default.

Required pilot behavior:

1. Configure one explicit Sals3 Official Dropshipper seller account and its exact CJ `supplierConnectionId`.
2. Start, pause, resume, status, and break-glass actions must be scoped to that configured connection.
3. A missing, unknown, non-workable, or non-official pilot connection must fail closed; it must not fall back to every connection.
4. A successful Start must return the exact targeted connection/cycle and confirm the kick-off reached the queue.
5. Deployment documentation must show the explicit scoped request; an empty request body must not be the production runbook.
6. No third-party seller connection participates in the pilot full scan.
7. The Sals3 Official credential remains encrypted, server-only, and seller-owned under ADR-006/ADR-008.

This is a release safeguard, not the final provider-global architecture.

## Proposed long-term architecture: one provider-global discovery scan

### Core principle

Discover the shared CJ catalogue once, then attach seller-specific state through references and overlays:

```text
CJ provider catalogue discovery
  -> shared ProviderProduct / ProviderVariant / ProviderEvidence
       -> market + policy evaluation projection
            -> SellerProductBinding / OfferSupplierBinding
                 -> seller pricing, selection, listing, subscription, order
```

Do not copy the full raw CJ product/evidence graph into every seller account merely because each seller has a CJ connection.

### Shared provider layer

Candidate target entities:

- `ProviderCatalogueSource`: provider, discovery capability, credential owner/type, region, contract version, enabled state;
- `ProviderProduct`: CJ PID, normalized provider identity, first/last seen, source-presence state, material feed fingerprint;
- `ProviderVariant`: CJ VID and provider variant identity/tombstone state;
- `ProviderFeedSnapshot`: append-only/checksummed list evidence;
- `ProviderEvidenceSnapshot`: append-only detail, variants, media, inventory-origin, and review evidence with freshness;
- `ProviderDiscoveryCycle` and `ProviderDiscoveryPartition`: provider-source coverage rather than seller-candidate coverage;
- `ProviderWebhookEvent`: deduplicated provider event when the subscription belongs to the authorized discovery/operational account.

Shared records contain provider facts only. They do not contain seller margin, seller credentials, seller order funding, seller payouts, or another seller's private configuration.

### Evaluation layers

Separate evaluation by the scope of the rule:

1. **Provider-invariant derivation** — normalization, exact provider identity, source presence, raw evidence checksums, and evidence quality.
2. **Platform market/policy evaluation** — category eligibility, AU destination policy, compliance evidence, media rights, freshness, and platform safety rules, keyed by provider product + market + policy/evidence version.
3. **Seller overlay evaluation** — seller-specific allowed category, margin, pricing, business model, selected variant, connection health, funding readiness, listing state, and seller policy version.
4. **Order-time validation** — exact seller connection, accepted order snapshot, wallet/funding, variant stock, cost, and destination freight. Shared catalogue evidence never authorizes an order by itself.

Only the layers whose inputs changed re-evaluate. A platform policy change can re-evaluate shared evidence once; a seller margin change recalculates only that seller's bindings.

### Seller connection/binding layer

Seller-owned records remain separate:

- `SupplierConnection`: encrypted seller credential, account identity hash, health, capabilities;
- `SellerProductBinding` or approved equivalent: seller selection of a shared provider product;
- `OfferSupplierBinding`: exact seller offer/variant to provider variant and connection;
- `ProductSubscription`: subscription desired/observed state and account limit for the connection actually protecting the selected/live/order product;
- seller pricing/margin/FX adjustments;
- seller listing status, seller media, and attention;
- seller orders, immutable order-line snapshots, funding, and fulfillment exceptions.

One seller cannot read, spend, subscribe, order, or mutate through another seller's connection.

## Credential and ADR boundary

The phrase “provider-global scan” must not mean “reuse a seller credential as an invisible platform master key.” Current ADR-006 and ADR-008 state that the Sals3 Official Dropshipper connection is seller-owned and is not shared with third-party sellers.

Before implementing the long-term shared provider layer, approve one of these credential models through an ADR amendment:

1. **Dedicated platform discovery account/capability (recommended)** — a separately authorized CJ account/credential used only for catalogue discovery and shared provider evidence; seller connections remain required for seller-specific subscriptions, ordering, funding, and account-scoped operations.
2. **Sals3 Official-only catalogue** — the Sals3 Official seller connection scans only for that seller; no shared use by third-party sellers. This is compatible with the immediate pilot but is not provider-global multi-seller architecture.
3. **Provider-supported public catalogue credential** — use only if CJ explicitly documents and contractually permits platform-wide catalogue caching/sharing under that account scope.

Required external verification before choosing:

- CJ API/account terms for multi-merchant catalogue caching and reuse;
- whether list/detail/stock results vary by CJ account, level, warehouse, region, pricing, or permissions;
- product-content/media redistribution rights;
- points/rate/subscription limits per account/IP;
- deletion/takedown obligations and data-retention rules.

Until verified and approved, shared provider records are an architecture proposal, not authorization to expose one seller's supplier data to another.

## Migration path from current connection-scoped implementation

### Phase 0 — safe pilot

- Keep the reviewed current schema/code.
- Require explicit Sals3 Official connection targeting.
- Fix terminal unresolved-cycle visibility in the internal status read model.
- Apply migration only to a disposable/test database first and pass full verification.
- Run the owner-authorized read-only CJ contract probe.
- Operate without a seller-facing dashboard; use the protected status endpoint plus database/queue observability.

### Phase 1 — internal operations surface

- Add Admin/Operations read model for active/latest/unresolved cycle history.
- Add safe audited Start/Pause/Resume/retry/reactivate actions.
- Add alerts for heartbeat, outbox, unresolved coverage, points, webhook, and storage.
- Keep seller UI limited to seller-actionable product/connection states.

### Phase 2 — shared provider identity/evidence

- Introduce provider product/variant references and append-only provider snapshots.
- Backfill/deduplicate current connection-scoped CJ PID/VID records into the shared identity layer without deleting historical seller candidate/audit records.
- Preserve a compatibility mapping from every old candidate/evaluation to its shared provider product and original seller connection.
- Run old and new projections in shadow mode and compare counts, decisions, evidence checksums, and tenant access.

### Phase 3 — provider-global discovery cutover

- Start one approved provider discovery source.
- Stop per-seller full scans only after shared coverage and seller bindings are proven equivalent.
- Retain seller-specific refresh/order calls where the provider contract or business rule is account-specific.
- Roll back by pausing the shared chain and retaining the previous connection-scoped read path; never delete evidence during cutover.

## Acceptance criteria

The pilot operations layer is acceptable only when:

- explicit connection targeting is enforced for deployment;
- wrong/missing pilot connection fails closed;
- active and terminal unresolved cycles are visible;
- no unresolved/failed partition permits `COMPLETE`;
- Start cannot report success when the kick-off was not published;
- queue/outbox/heartbeat/points/storage state is observable without secrets;
- every recovery action is authenticated, idempotent, and audited;
- migration-backed E2E and `npm run verify` pass in a disposable/test environment;
- no live CJ call, migration, or deployment happens without owner authorization.

The provider-global architecture is acceptable only when:

- credential/account scope is approved without weakening tenant isolation;
- CJ terms and account-dependent data behavior are verified;
- one shared product/evidence record can serve multiple seller bindings without leaking seller data;
- seller-specific policies/economics/orders remain separate;
- per-seller full-scan duplication is removed measurably;
- shadow comparison proves no loss of provider identity, status, evidence, audit, or order binding;
- rollback preserves all historical evidence and tenant ownership.

## Recommendation

For the immediate pilot, lock discovery to the explicit Sals3 Official connection and build internal unresolved-history visibility before deployment. Do not build a seller-facing coverage dashboard.

For long-term scale, pursue one shared provider catalogue/evidence layer with seller-specific bindings and evaluation overlays, but first approve a dedicated provider-discovery credential model and verify CJ's contractual/account-dependent behavior. Do not silently reinterpret the Sals3 Official seller credential as a platform-global credential.
