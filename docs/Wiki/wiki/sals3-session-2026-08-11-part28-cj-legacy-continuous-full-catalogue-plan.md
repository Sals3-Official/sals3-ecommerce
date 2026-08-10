---
tags: [sals3, session, cj, catalog, discovery, queues, webhooks, neon, vercel]
aliases: [CJ Legacy Continuous Full Catalogue Plan, No Cron CJ Discovery Decision]
created: 2026-08-11
updated: 2026-08-11
status: approved
authority: owner-decision
owner_approved: true
implementation_status: in-progress-unverified
related:
  - "[[hot]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-session-2026-08-11-part29-cj-discovery-operations-and-provider-global-architecture]]"
---

# 2026-08-11 — CJ legacy continuous full-catalogue plan

## Owner decision

Bogs approved a rework of the current uncommitted discovery-coverage implementation. The target is to discover and evaluate every product CJ exposes through the legacy endpoint:

```text
GET /api2.0/v1/product/list
```

Sals3 will not use `/product/listV2` for this workflow. The documented `totalRecords` maximum of `6000` belongs to Product List V2 and must not be applied to the legacy scanner. A legacy total at or above 6,000 is density information, not `SPLIT_REQUIRED`, failure, or proof of completion.

The enforceable correctness objective is:

> No silent omission and no false completeness.

No third-party API crawler can honestly guarantee zero possible error. A catalogue partition whose coverage cannot be proven remains `PROVIDER_COVERAGE_UNRESOLVED`; its parent cycle cannot become complete.

## Continuous managed flow

The approved runtime target is Neon PostgreSQL plus private Vercel Queues in Sydney. PostgreSQL remains authoritative; queue messages carry only IDs, versions, operation type, and idempotency data.

The queue chain uses bounded operations for cycle start, partition discovery, candidate evaluation, product reconciliation, webhook processing, and outbox dispatch. Each consumer validates input, claims an exact database lease, is safe under at-least-once delivery, commits durable state and successor intent, and confirms the successor before acknowledging the current message.

There is no cron or scheduled GitHub Actions tick in the target architecture. One protected owner-authorized Start/Resume action creates the durable chain. Each completed cycle enqueues its successor with a queue delay based on CJ points and freshness pressure. It continues while the owner's browser and computer are closed. Start, pause, and resume are authenticated, idempotent internal controls; a database run state prevents duplicate active chains.

The existing scheduled tick may remain only as a temporary protected break-glass path until the queue replacement is tested. The schedule itself is removed only after replacement coverage exists.

## Coverage algorithm

Each discovery cycle has an immutable cutoff. Products created after that cutoff belong to the next cycle. The cycle persists leaf-category roots and recursively partitions by CJ-supported filters:

1. Fetch page 1 with the legacy maximum `pageSize=200` for a category/time/price partition.
2. Validate page identity, page size, total, total pages, content size, product IDs, and mathematical consistency before ingestion.
3. `total=0` proves only that partition empty.
4. `total<=200` completes only when the returned valid unique PID count equals the reported total.
5. `total>200` first bisects time; at minimum time resolution it splits by price with safe boundary overlap and PID deduplication.
6. Fixed daily or weekly windows are not the primary strategy; split size follows observed density.
7. Page traversal is reserved for an atomic time-and-price bucket that cannot be split further.

Atomic-bucket pagination must enumerate all reported pages twice with fixed deterministic ordering. Two consecutive sorted-PID checksums must match, and the unique PID count must equal the reported total. Failure to converge remains visibly unresolved and blocks cycle completion.

Before live rollout, an owner-authorized read-only CJ contract probe must verify timestamp format/timezone, earliest accepted date, boundary inclusivity, price precision, category behavior, totals, and ordering. This plan does not authorize that call.

## Product status and freshness

Every newly discovered PID receives a non-null persisted status in the same transaction as its upsert and obtains one logical evaluation admission keyed by PID plus evidence/policy version. The lifecycle preserves existing approved vocabulary for discovered, queued, evaluating, pass, pass-with-attention, temporary ineligibility, blocked, and technical failure.

Initial discovery queues full Product evaluation for every discovered product. Subsequent freshness is tiered:

- selected/imported/live/order-linked: webhook event plus daily reconciliation;
- qualified but unselected: at least every 72 hours;
- other operational or nonterminal products: at least every 30 days;
- permanent policy blocks: only when relevant source data or policy version changes.

`PROVIDER_COVERAGE_UNRESOLVED` is a coverage-partition state, not a fabricated product status for a product that was never discovered.

## CJ webhook boundary

CJ callbacks verify the exact raw body with the documented Base64 HMAC-SHA256 contract, use constant-time comparison, validate the decoded payload, deduplicate `messageId`, persist an inbox/outbox record, and return HTTP 200 within three seconds without doing supplier/evaluation work in the request.

After July 2026 `subscribeAll=true` is unavailable. Sals3 subscribes only selected/imported/live/accepted-order products, batches no more than 100 IDs, tracks account limits, and handles PRODUCT, VARIANT, and STOCK changes idempotently. Webhooks improve important-product freshness; they do not replace full catalogue discovery.

## Cost and capacity controls

- Default supplier rate is one request per second until the real CJ account tier is verified.
- Parse and persist `pointsInfo`; background work uses at most 80% of known points and reserves at least 20% for live/order-critical operations.
- HTTP 429 and low budget create delayed continuation instead of aggressive retries or a sleeping serverless function.
- A database-backed limiter coordinates concurrent workers.
- Neon development-pilot storage warns near 70% and pauses broad discovery near 80% without deleting evidence.
- Neon Free's 0.5 GB allowance may not hold the full CJ catalogue. Vercel Hobby/Neon Free are development-pilot constraints, not approved commercial production capacity.

## Implementation state and safety

Claude received a detailed one-pass turnover prompt to replace the current uncommitted page-centric discovery work. At the time of this decision:

- implementation is in progress and unverified;
- the current migration is assumed unapplied and must not be executed during code work;
- no commit, push, deployment, live supplier call, Neon mutation, or Vercel mutation is authorized;
- the branch remains intentionally unsynchronized with `origin/develop` until reviewed;
- local tests cannot prove real CJ catalogue completion.

Completion requires reviewed code, all repository verification gates, an owner-authorized migration/deployment, a read-only legacy-contract probe, sustained queue operation, and zero unresolved required partitions.

## Operations and multi-seller follow-up

The reviewed implementation remains connection-scoped and its protected status endpoint is not a finished operator dashboard. The current read model reports only an active cycle; a terminal `COVERAGE_UNRESOLVED` cycle may disappear from that response even though its database records remain. Pilot rollout therefore also requires unresolved-history visibility and explicit targeting of the Sals3 Official connection rather than the all-workable-connections default.

The proposed long-term direction is one shared provider catalogue/evidence scan plus seller-specific connection, selection, policy/economics, subscription, offer, and order bindings. This proposal does not authorize sharing the seller-owned Sals3 Official credential across sellers. See [[sals3-session-2026-08-11-part29-cj-discovery-operations-and-provider-global-architecture]].

## Final reviewed state and application PR (2026-08-11)

Two Codex review rounds ran against the implementation before this note's application PR was opened. Both surfaced real defects, both were fixed the same day, and both are reflected in the merged diff — not just proposed:

**Round 1** (four defects):
- delayed outbox rows were gated on `notBefore` at claim time, so a delayed sweep/retry/next-cycle message could never publish once the chain went quiet — fixed by claiming and publishing delayed rows immediately, letting the queue transport hold them via `delaySeconds`;
- a candidate whose evaluation message was lost or parked by the delivery cap could remain `QUEUED`/`EVALUATING` indefinitely — fixed with a stranded-row recovery sweep;
- evaluation's own CJ evidence calls bypassed the shared database rate limiter and never persisted `pointsInfo` — fixed with a governed-fetch wrapper used by every evaluation HTTP call;
- no sweep re-evaluated decided rows (including `BLOCKED`) when the policy version changed — fixed with a policy-version-mismatch sweep.

**Round 2** (two defects):
- Start/Resume reported success even when the chain kick-off message failed to publish, which would have let the chain silently never start — fixed: the control result now carries `chainDispatched`, and the routes return `503 queue-publish-failed` instead of a false `200`;
- a rate-limited evidence fetch (a real CJ `429`, or the shared limiter refusing a slot under concurrency) was recorded as an ordinary technical failure and burned an attempt, which could dead-letter a healthy product purely from load — fixed: rate-limiting now defers with a retry time and leaves the attempt budget untouched.

**Fresh validation evidence, application PR** (`sals3-portal` branch `codex/discovery-coverage-checkpoints`):
- `npm run test:run` — 632 passed, 4 skipped, 0 failed;
- `npm run lint` / `npm run format:check` / `npm run typecheck:clean` / `npm run build` — pass;
- `npm audit --audit-level=high` — pass (0 high/critical; pre-existing moderate advisories in a dev-only dependency chain, unrelated);
- `npm run test:e2e` and `npm run verify` — pass (51 passed, 1 skipped, 0 failed) **after** migration 0009 was applied to the local development database only, under separate explicit owner authorization scoped to that database (`localhost:5432/sals3`), specifically so the hook-enforced `verify` gate could observe the new `next_refresh_at` column. Neon, staging, and production remain unmigrated; applying there is a separate, still-pending owner-authorized deployment step.

**Still true, not superseded by the above:** the official-connection lock, the terminal/historical unresolved-coverage status expansion, and the Product Sourcing scan-health panel remain unimplemented follow-up work (see [[sals3-session-2026-08-11-part29-cj-discovery-operations-and-provider-global-architecture]]). The owner-authorized read-only CJ contract probe has not been run. No commit reached Neon/staging/production, and no live CJ/Vercel call occurred. Local tests prove the reviewed logic, not live provider catalogue completion.
