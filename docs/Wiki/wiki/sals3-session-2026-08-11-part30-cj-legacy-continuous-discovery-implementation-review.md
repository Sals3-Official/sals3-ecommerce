---
tags: [sals3, session, sals3-portal, cj, discovery, queues, webhooks, adr-010, adr-013]
aliases: [CJ Legacy Continuous Discovery Implementation and Review, Discovery Coverage Checkpoints Rework]
created: 2026-08-11
updated: 2026-08-11
status: session-note
authority: session-record
owner_approved: true
implementation_status: implemented-not-deployed
related:
  - "[[hot]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-11-part28-cj-legacy-continuous-full-catalogue-plan]]"
  - "[[sals3-session-2026-08-11-part29-cj-discovery-operations-and-provider-global-architecture]]"
---

# Sals3 session 2026-08-11, part 30 — CJ legacy continuous discovery: implementation, two Codex review rounds, and both PRs

`sals3-portal` branch `codex/discovery-coverage-checkpoints`, off `develop`. Committed, pushed, and opened as [sals3-portal PR #29](https://github.com/Sals3-Official/sals3-portal/pull/29). This vault documentation shipped as [sals3-ecommerce PR #64](https://github.com/Sals3-Official/sals3-ecommerce/pull/64), branch `docs/cj-legacy-continuous-discovery`. This note is the single end-to-end record of the work [[sals3-session-2026-08-11-part28-cj-legacy-continuous-full-catalogue-plan]] approved: what was actually built, both correction rounds, and the exact evidence behind both PRs.

## 1. Starting point

Part28's owner decision authorized replacing the branch's existing uncommitted, page-cursor discovery implementation (hot/backfill lanes over CJ's legacy feed, with a `CJ_OBSERVED_RESULT_CAP = 6000` split rule inherited from Product List V2) with a queue-driven, no-cron rework. Claude received the full turnover in `CLAUDE_TURNOVER_CJ_LEGACY_CONTINUOUS_DISCOVERY_REWORK.txt` and executed it in one pass, then Codex reviewed the result twice before either PR was opened.

## 2. What was built

**Persistence** — new `src/lib/db/schema/discovery.ts`, migration `drizzle/0009_concerned_luckman.sql`: `discovery_run_states` (Start/Pause/Resume desired state per connection), `discovery_cycles` (immutable `cycleCutoff`, category snapshot, seed cursor, partition counters, one active cycle per connection enforced by a partial unique index), `discovery_partitions` (category/time/price bounds, lease token + CAS state machine `PENDING → RECONCILING → COVERED | SPLIT | PROVIDER_COVERAGE_UNRESOLVED | FAILED`), `discovery_reconcile_pids` (atomic-bucket PID accumulator, PK-deduplicated), `work_outbox` (transactional outbox), `discovery_failures` (append-only, the dead-letter visibility Vercel Queues itself doesn't provide), `supplier_request_budgets` (shared rate/points ledger), `webhook_inbox`, `product_subscriptions`, `supplier_webhook_secrets`. Plus one column on the existing `candidate_evaluations`: `next_refresh_at` (freshness deadline).

**Coverage algorithm** (`src/modules/catalog/discovery/`) — `partition-plan.ts` bisects a dense partition (`total > 200`) by time then price at provider precision, refusing non-progressing splits; `page-validation.ts` implements the full invalid-pagination matrix (wrong page identity, size overflow, empty-with-remaining-total, malformed PIDs, ...) fail-closed; `coverage-checksum.ts` hashes the sorted-unique-PID set plus immutable partition identity for the atomic-bucket double-pass proof. **No 6,000 constant exists anywhere in this code.** `handle-partition.ts` is the per-partition state machine: probe → split or reconcile → `COVERED`/`PROVIDER_COVERAGE_UNRESOLVED`/`FAILED`, with cycle-completion bookkeeping (`cycle-repository.ts#tryFinishCycle`) that only allows `COMPLETE` when every partition is terminal and none is unresolved.

**Queue/outbox** — `@vercel/queue@0.4.0`, topic `catalog-discovery`, one private consumer route (`src/app/api/queues/catalog-discovery/route.ts`, `vercel.json` `experimentalTriggers`). Six operations: `DISCOVERY_CYCLE_START` (ensure/seed/sweep — also the chain's self-healing heartbeat), `DISCOVERY_PARTITION`, `EVALUATE_CANDIDATE`, `RECONCILE_PRODUCT` (freshness + recovery sweep), `WEBHOOK_EVENT`, `OUTBOX_DISPATCH`. Every handler validates its message (Zod, `messages.ts`), claims work with exact state+version+lease-token CAS, and publishes-and-confirms successors before acknowledging.

**Control/webhook surface** — `POST /api/internal/catalog/discovery/{start,pause,resume}` and `GET .../status`, all behind `DISCOVERY_CONTROL_SECRET` (constant-time compare); `POST /api/webhooks/cj` verifies the documented raw-body Base64 HMAC-SHA256 (secret = the connection's encrypted CJ `openId`), size-caps before heavy work, dedupes by `messageId`, and does no supplier/evaluation work in-request.

**Budget/recovery** — `budget-repository.ts` (shared 1 req/s/connection limiter + points ledger, 80% background cap / 20% live reserve), `storage-guard.ts` (Neon pilot warn-70%/pause-80%), `governed-fetch.ts` (added in round 1, see below).

**Removed**: `src/modules/catalog/candidates/ingestion.ts` + its test (the old hot/backfill-lane implementation), the `CJ_OBSERVED_RESULT_CAP`/`SPLIT_REQUIRED` concept entirely, and the GitHub Actions cron schedule on `evaluate-tick.yml` (that route is now break-glass-only, invoked by manual `workflow_dispatch`).

## 3. Codex review round 1 — four defects, all fixed same day

1. **Outbox claim gated on `notBefore` → chain stall.** `claimDispatchableOutbox` only selected rows whose scheduled delivery time had already passed, but nothing woke the dispatcher once the queue went idle — every delayed sweep/retry/next-cycle message would sit forever. Fixed: delayed rows are claimed and published *immediately*, with `delaySeconds` telling the transport to hold them; `releaseOutboxAttempt` no longer overwrites the row's scheduled `notBefore` on a failed publish attempt.
2. **Delivery-cap acknowledgment could strand candidates.** A message dropped past `MAX_QUEUE_DELIVERIES` was recorded as a failure and acknowledged, but nothing re-created its successor — a candidate could sit `QUEUED`/`EVALUATING` forever. Fixed: `repository.ts#listStrandedEvaluations` (new), wired into the `RECONCILE_PRODUCT` `SWEEP` mode, re-enqueues evaluation messages for any row stuck `QUEUED` past a stall threshold or `EVALUATING` with an expired lease.
3. **Evaluation bypassed the shared limiter and never persisted `pointsInfo`.** The evidence fetch (detail/inventory/comments, 3 calls) used only in-process spacing inside the CJ adapter, so concurrent evaluation workers could collectively exceed CJ's rate limit, and points quota was only ever observed from discovery list pages. Fixed: `discovery/governed-fetch.ts` (new) wraps `fetch` with the same database-backed limiter plus `pointsInfo` persistence; `evaluateCandidate` gained an optional `fetchImpl` parameter that the queue handler supplies.
4. **No policy-version re-evaluation.** ADR-010 §12.6 requires that a policy/algorithm-version change re-evaluates affected candidates even when nothing about the supplier data changed — including historical `BLOCKED` rows. Nothing did this. Fixed: `repository.ts#requeuePolicyVersionMismatches` (new), wired into the same freshness sweep, requeues stale-policy decided rows with admission `POLICY_VERSION_CHANGED`.

## 4. Codex review round 2 — two defects, both fixed same day

1. **Start/Resume could report success while the chain never actually started.** `applyDiscoveryControl` ignored the result of its own `dispatchOutbox()` call after enqueuing the kick-off message; if that publish failed, there was no queue delivery in flight to ever retry it, so the chain would silently never begin despite a `200 OK`. Fixed: `ControlResult` gained `chainDispatched: boolean`; the `start`/`resume` routes now check it and return `503 { reason: 'queue-publish-failed' }` instead of a false success. Start/Resume remain idempotent, so the owner's remedy is simply to call again.
2. **Rate-limiting burned an evaluation attempt.** A `CjApiError('rate-limited')` — a real CJ `429`, or the shared limiter itself refusing a slot under concurrency — fell into the generic technical-failure path in `evaluate.ts`, incrementing `attemptCount` toward the dead-letter ceiling. Under load, a perfectly healthy product could exhaust its 5 attempts purely from rate pressure. Fixed: rate-limited failures now take a dedicated branch that defers with `nextRetryAt = now + RATE_LIMIT_DEFER_MS` (15 min) and leaves `attemptCount` untouched, with its own audit action `CANDIDATE_EVALUATION_RATE_LIMIT_DEFERRED`.

## 5. Fresh validation evidence (both rounds applied, immediately before either PR)

- `npm run test:run` — 632 passed, 4 skipped, 0 failed.
- `npm run lint` / `npm run format:check` / `npm run typecheck:clean` / `npm run build` — pass.
- `npm audit --audit-level=high` — pass (0 high/critical; 4 pre-existing moderate advisories in drizzle-kit's dev-only esbuild-kit chain, unrelated to this work).
- `npm run test:e2e` and `npm run verify` — **51 passed, 1 skipped, 0 failed**, achieved only after migration 0009 was applied to the **local development database only** (`postgresql://sals3_app:...@localhost:5432/sals3`, host confirmed before running), under the owner's explicit separate authorization given when husky's own `npm run verify` pre-commit hook blocked on the two known migration-gap e2e failures (`next_refresh_at` missing). Neon, staging, and production were never touched. Both repositories' own pre-commit and pre-push hooks (`npm run verify`, no `--no-verify`) ran and passed for real before either push.

## 6. What is still not done

Per the owner's explicit PR authorization, these three items named in a separate, later prompt (`CLAUDE_FINAL_PRECOMMIT_OFFICIAL_PILOT_MONITORING_PROMPT.txt`) are **not** part of this work and are not claimed as implemented:
1. locking every pilot entrypoint to the Sals3 Official CJ connection (today an empty Start/Resume body targets every workable connection — see [[sals3-session-2026-08-11-part29-cj-discovery-operations-and-provider-global-architecture]]'s pilot deployment safeguard);
2. expanding status reads so terminal/historical unresolved coverage always stays visible (today `GET .../status` reports only the active cycle; a `COVERAGE_UNRESOLVED` cycle can disappear from the response while its rows remain in PostgreSQL);
3. the Product Sourcing CJ catalogue scan-health panel.

Also outstanding: the owner-authorized read-only CJ contract probe (timestamp timezone, boundary inclusivity, price precision, ordering stability) has not run — `CJ_CREATE_TIME_TIMEZONE` (default UTC) and `CJ_DISCOVERY_EPOCH` (default 2016-01-01) remain labelled assumptions. Vercel Queues is public beta; its Hobby-plan queue-operation billing allotment is unpublished. Neon/staging/production remain unmigrated. No deployment, release, or live CJ/Neon/Vercel call has occurred at any point in this work. Local tests prove the reviewed logic, not live provider catalogue completion — this note does not claim all CJ products are discovered or evaluated.

## 7. Provenance note on this vault change

The PR that carries this note (`sals3-ecommerce` #64) also updates `hot.md` and `ADR-010`/`ADR-013` — but only the CJ-discovery hunks. The working tree that produced this PR was dirty with unrelated AU-buyer-destination edits (part27, and hunks inside `hot.md`/ADR-010/ADR-013 itself) from separate, already-in-progress owner work; those hunks were identified by splitting each file's diff and reviewing every hunk individually, then staged out and left untouched/uncommitted. ADR-003, ADR-014, the implementation spec, `index.md`, `parked-ideas-backlog.md`, `sals3-implementation-phases.md`, and `vault-catalog.md` were excluded in full for the same reason. The branch this PR shipped from (`docs/cj-legacy-continuous-discovery`) was cut from `docs/adr-014-admin-portal-governance`'s tip *after* confirming that branch was already merged into `develop` (PR #63) — a zero-risk same-commit branch creation that kept the unrelated dirty files exactly as they were, just relabeled onto a new branch name so this scoped commit would not mix into an already-closed, differently-named PR stream.
