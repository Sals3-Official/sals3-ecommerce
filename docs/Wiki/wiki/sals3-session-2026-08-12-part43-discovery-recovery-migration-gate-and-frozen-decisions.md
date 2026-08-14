---
tags: [sals3, sals3-portal, session-note, discovery, catalog, production-incident]
aliases:
  - Migration Gate Outage
  - Silent Chain Deaths
  - Recheck Policy Version
created: 2026-08-12
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-10-part41-supplier-connection-transaction-and-binding-integrity]]"
  - "[[sals3-session-2026-08-12-part36-rolling-pid-waves-and-discovery-deadlocks]]"
  - "[[hot]]"
---

# Recovering discovery: the second migration-gate outage, two silent chain deaths, and reopening frozen decisions

Two `sals3-portal` PRs, both `aj-garrigues` (AJ), merged 2026-08-11/12. Both
predate — and directly set up — the rolling-PID-wave incident chain already
documented in
[[sals3-session-2026-08-12-part36-rolling-pid-waves-and-discovery-deadlocks]].
Neither had its own vault entry until now.

## PR #43 — schema drift took production down for a full day, plus two silently-dying queue chains

**The outage.** Five migrations (`0011`–`0015`, merged overnight across PRs
#37–#41) deployed to production at 08:18, against a database still on
`0010`. Live runtime log: `column supplier_candidates.stock_review_state does not exist`,
`code: 42703`, on every single `/products` request, plus every
`DISCOVERY_PARTITION` delivery throwing against the missing `0014`
intake-gate tables until the delivery cap parked it. **This was the second
occurrence of the exact same failure mode** —
[[sals3-session-2026-08-10-part41-supplier-connection-transaction-and-binding-integrity]]'s
own PR #26 documents the first, on 2026-08-10, also an unapplied migration
(`0008`). Nothing in `.github/` runs `db:migrate` on deploy, and this PR does
not add that automation — the actual fix was running `npm run db:migrate`
against production directly; this PR is the hardening layered on top, plus a
README correction.

**Two self-chaining queue chains were dying silently.** `work_outbox.idempotency_key`
is uniquely indexed and no code path ever deletes an outbox row, so a key is
consumable exactly once for the lifetime of the database — a lesson this
same codebase would rediscover twice more four days later (see part36 §2 and
§4a). Here, twice at once:

- **Freshness sweep** — keyed on `sweepBucket + 1` at one-hour resolution,
  but a full batch re-sweeps in 60 seconds, inside the *same* bucket. The
  successor reused the in-flight message's own key, the unique constraint
  silently dropped it, and the chain stopped after one extra batch — then
  the hourly chain skipped that bucket too, because the key was already
  spent. A backlog drained at roughly one batch per hour instead of one per
  minute.
- **Curated lanes** — keyed on `page:${nextPage}` with no run identity,
  while lane completion resets `nextPage` back to 1. Every sweep after the
  first enqueued an already-used key, so a lane stalled after its very first
  invocation instead of walking on to its page cap.

Both failed invisibly: the outbox row read `DISPATCHED`, nothing anywhere
was `FAILED`, and the discovery status endpoint looked healthy throughout.
The freshness-sweep death also explained a symptom that had looked like a
config bug — `NO_VALID_MARKET` rows still showing the disabled-market policy
string, even though AU+PH (PR #32) was configured correctly; those rows had
simply been decided roughly 14 hours *before* AU+PH was enabled, and the
sweep that should have requeued them under the new policy was the one that
had silently died.

**Also fixed in the same PR:** a zero-`total` `pointsInfo` report from
`GET /product/productComments` — an endpoint outside the real points system
— had been persisted as a genuine zero-quota reading, so one completed
evaluation could refuse all further background work until the next UTC
reset. And a Playwright `.or()` locator matching two elements broke strict
mode across all 10 specs in `cj-products.spec.ts`, all red before this fix.

**Verification:** 1,098 unit tests passed (4 skipped), 60 E2E passed (2
skipped, up from 50 passed/10 failed before the locator fix). The two new
freshness tests were confirmed to fail against the previous key logic before
the fix landed. Migration `0011`–`0015` was rehearsed locally from a
database in production's exact drifted state (`0010`, 30 tables →
`0015`, 55 tables) and applied cleanly.

**Deploy order specified by the PR:** run `db:migrate` against production
first (production was already broken without it); merge/deploy; then
`POST .../discovery/resume` — discovery had been paused at 12:18 that day,
and the "heal on first page load" trigger that used to restart it
automatically had itself been removed on 2026-08-12, so the chain would not
restart on its own.

**Explicitly not addressed:** the `AUDIT` discovery lane remains inert,
documented as scaffolding rather than real behavior — it has no writer, no
state transitions, and starting it before it has a real lifecycle would
re-enqueue already-proven partitions forever and spend CJ points on repeat
work.

## PR #45 — reopening frozen decisions without resuming discovery (merged 2026-08-12)

**Why this was needed.** PR #32's policy-version change
(`buyer-destination-country-v1-disabled` → `v2-au-ph`) was supposed to
re-open every decision made under the old disabled-market policy. In
production, 87,320 rows were still stamped with the old policy string,
81,662 of them `TEMPORARILY_INELIGIBLE`/`NO_VALID_MARKET`. The only
mechanism that requeues them, `requeuePolicyVersionMismatches`, lives inside
the `RECONCILE_PRODUCT` sweep — which returns early unless the discovery run
state is `RUNNING`. So re-deciding rows that were already stored required
*resuming* discovery, which also restarts partitions and curated lanes and
spends real CJ points — the wrong trade when the actual intent was just
"re-decide what's already stored." No other existing path could reach them
either: the break-glass retry tick needs a non-null `next_retry_at` these
rows didn't have; "Recheck now" sets `QUEUED` but enqueues no message, so it
waits for something that isn't running.

**What shipped:** `POST /api/internal/catalog/evaluations/recheck-policy-version`,
bounded per call (`limit`, default 500, capped 2000), safe to re-run.
Requeues matching rows with admission `POLICY_VERSION_CHANGED`, publishes
their evaluation messages, and reports `requeued` plus `remaining` per
connection. **Why running it while discovery stays paused is sound:** a
re-evaluation here spends nothing — it screens from the already-stored feed
snapshot plus the resolved policy and holds no supplier adapter, asserted by
its own audit payload's `supplierEvidenceFetched: false`. `handleEvaluateCandidate`
has no run-state gate, so the queue can drain these with broad discovery
still stopped.

**A defensive detail worth keeping in mind:** each invocation keys its
intents on a per-call token specifically because a reused outbox key is
silently dropped — "the same trap fixed in #43," in the PR's own words — and
a duplicate message here is a safe no-op, while a *missing* one is not
recoverable.

**Verification:** 1,110 unit tests passed (6 new), 60 E2E passed. Route
tests cover 401 on a missing/wrong secret, the bounded default, an explicit
limit/connection, 400 on malformed input, 503 on a failed publish (reported
as a real failure, not a partial success), and 500 without leaking internal
detail. **Not yet run against production at merge time** — the PR states the
owner runs it when ready.

**Known defects documented but deliberately not fixed here:** the evaluation
handler still runs a points-budget gate sized for an evidence fetch that no
longer happens under this lean-intake model, so a low observed points
balance can refuse work that would actually cost nothing; and single-row
"Recheck now" still does not complete for the same reason described above —
207 `NO_VALID_MARKET` rows were sitting in `QUEUED` for exactly that reason
at the time of writing.

## Why this matters for part36's own story

Both PRs establish the exact failure pattern part36 would rediscover twice
more, four days later, in the rolling-PID-wave rollout: *a periodic or
coarse idempotency key can continue an already-running chain, but can never
revive one that already died* — because `work_outbox.idempotency_key` is
permanent. Part36 cites this rule as already known when its own §2 fix
lands; this note is where it was actually established.

`sals3-portal` [PR #43](https://github.com/Sals3-Official/sals3-portal/pull/43),
[PR #45](https://github.com/Sals3-Official/sals3-portal/pull/45), both merged.
