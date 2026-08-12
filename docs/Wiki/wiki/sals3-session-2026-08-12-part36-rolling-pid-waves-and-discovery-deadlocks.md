---
tags: [sals3, sals3-portal, session-note, cj-dropshipping, discovery, catalog, production-incident, intake-policy]
aliases:
  - Rolling PID Waves
  - Curated Lane Intake Priority
  - Freshness Sweep Revival
  - Historical Pipeline Freeze
created: 2026-08-12
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[sals3-session-2026-08-10-part26-portal-au-market-hardcode-remediation]]"
  - "[[hot]]"
---

# Rolling PID waves, and five discovery deadlocks found running them in production

> [!IMPORTANT] Cross-reference resolved 2026-08-13
> [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §1b now
> carries the struck-through correction this callout used to owe, plus a
> pointer back to this note. Applied via `sals3-ecommerce`
> [PR #74](https://github.com/Sals3-Official/sals3-ecommerce/pull/74). The
> concurrent vault task that held the file uncommitted when this note was
> first written had still not committed its own copy as of this update — see
> the bottom of this note for how that was handled without touching it.

Six `sals3-portal` commits, 2026-08-12, all co-authored by Claude Opus 5, all
against the live production database. `AJ NOCOLAI GARRIGUES` merged each as its
own PR (#47–#52). The first is a policy change the owner made while watching
discovery run; the other five are production incidents the change exposed,
found and fixed the same day — including two (§4a, §4b) that broke within
minutes of the fix meant to resolve the one before it.

## 1. The lifetime cap becomes a rolling wave (PR #47)

**Owner decision, 2026-08-12.** [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]
§1b's `CATALOG_NEW_DISCOVERY_PID_LIMIT` (default 5,000) was a **lifetime**
ceiling per supplier connection — once spent, discovery could never admit
another new PID without an owner-raised limit. That is now replaced with
`CATALOG_NEW_DISCOVERY_WAVE_SIZE` (default **600**): discovery admits up to 600
new unique PIDs, then must wait for every queued/evaluating/retryable row in
that wave to settle before the next wave opens. Not a lifetime cap, not an HTTP
request count — a wave size, so the catalogue can eventually exceed the old
5,000-PID ceiling entirely, 600 at a time.

Migration `0016_rolling_pid_waves.sql` backfills existing capacity rows:
whatever `admitted_count` a connection already had becomes its new
`limit_value` (so no connection's history is silently reinterpreted as
under-cap), and connections with zero admitted stay at the 600 default.

Also in this PR: `scripts/purge-dev-user-cj-connection.mts`, a one-off
production tool that releases the `dev-user` bootstrap seller's permanently
bound CJ account (the append-only `supplier_account_bindings` row otherwise
refuses every real seller who tries to connect that same CJ account, forever).
It refuses to run against `localhost` — the exact inverse of this session's own
`remote-write-guard.ts`, and for the same reason: a script meant only for
production must fail closed if it silently loaded `.env.local` instead of the
production credentials `vercel env run -e production` was supposed to inject.

## 2. Deadlock A — a mid-hour Resume could not revive the freshness sweep (PR #48)

**Production, 2026-08-12: screening ran at ~110 decisions/minute until 11:44,
a pause landed, and Resume at 11:47 could not re-seed hour bucket 496259.**
Evaluation stayed at zero for the rest of that hour while the intake gate kept
admitting — 1,536 `BACKLOG_DRAIN_PENDING` records piled up with nothing being
decided, and nothing anywhere was `FAILED`. That combination is exactly how a
dead chain hides: the outbox was empty and every status looked healthy.

Root cause: `handleCycleStart` seeds the freshness sweep on an
**hour-resolution idempotency key**, correct for a producer that fires every
tick (a finer key there would fork a new concurrent chain each tick). But
`work_outbox.idempotency_key` is unique and never pruned, so once that hour's
key was spent, a same-hour Resume's attempt to re-seed the identical key was
silently dropped by `insertOutboxIntents`. The freshness sweep is the **only**
producer that drains `QUEUED` rows — the backlog drain cannot, because
`requeueForManualRecheck` only moves `TEMPORARILY_INELIGIBLE`/
`EVALUATION_FAILED` — so losing it stopped all evaluation, not just refresh.

Fix: `startOrResumeConnection` now enqueues the freshness sweep alongside
cycle-start, on a suffix unique to that control action — the treatment
`cycleStartIntent` always had, which is why cycle-start already survived a
Resume and the sweep did not. `randomUUID`, not `Date.now()`, for the suffix:
two control calls in the same millisecond would otherwise build the same key
and the second revival would itself be dropped — caught by a regression test
asserting two Resumes produce distinct keys. The periodic hourly seed keeps its
coarse key; reviving a killed chain is a control action's job, not a periodic
one's. `freshnessSweepIntent` now exists so the sweep's continuation, hourly
seed, and control revival build the key from one format instead of three
independent copies.

## 3. Deadlock B — the historical backlog refilled the gate faster than evaluation could clear it (PR #49)

**Production, 2026-08-12: `admitted_count` sat at 0 all day; the newest
candidate was a day old.** Two individually correct mechanisms deadlocked each
other: the intake gate refuses a new `product/list` call while any evaluation
work is active, and the freshness sweep's policy-version tier returns rows
carrying an obsolete policy version to `QUEUED` — which **is** active work. With
82,679 rows still stamped `buyer-destination-country-v1-disabled`, each
50-row batch refilled the gate faster than evaluation drained it: the backlog
climbed 73 → 113 → 288 → 324 while the tick was supposedly running, not
draining.

The churn also proved worthless: those 82,679 rows all carry
`intended_market_codes = []`, so `checkValidMarket` returns `NO_VALID_MARKET`
under any enabled destination — confirmed directly against production, where
**zero** of the empty-market-code rows passed once re-decided under the AU+PH
policy. Every one of those re-evaluations was pure waste before this fix.

Fix: `discovery_backlog_gates.activation_at` — already the durable,
per-connection line meaning "everything before this is the historical
pipeline" — becomes a hard freeze boundary. `requeuePolicyVersionMismatches`
and `requeueDueRefreshes` gained an optional `createdAfter` bound, and the
sweep passes the gate's `activationAt`; `countActiveEvaluationWork` gained the
same bound so a wave waits only on the candidates *that wave* admitted, never
on frozen historical rows. Both requeue tiers needed the bound — 77,799 rows
already carry a future `next_refresh_at`, so leaving the policy tier unbound
alone would have let the freeze silently expire and re-block the next wave
anyway.

Nothing is deleted and no decision is restamped: frozen rows keep the policy
version they were actually judged under and stay visible in Blocked/Rejected.
`countActionableBacklog` — the one-time drain's own definition of history — was
deliberately left alone, and `listStrandedEvaluations` stays unbounded so a
genuinely stuck pre-freeze row can still recover. The freeze reverses without a
deploy: the existing owner-triggered
`POST /api/internal/catalog/evaluations/recheck-policy-version` passes no
bound, which is how the frozen backlog gets deliberately re-opened in bounded
batches once `intended_market_codes` is backfilled for those rows.

## 4. Arbitration — curated lanes were starved by the coverage scanner (PR #50)

**Owner intake priority, 2026-08-12, for filling each 600-PID wave:**
`CJ_TRENDING` → `CJ_MOST_LISTED` → `CJ_NEW_ARRIVALS` → the coverage partition
scanner. All three curated queries already existed and already used the same
legacy `/product/list` endpoint; what was missing was arbitration between them
and the scanner. **Measured in production: 609 `DISCOVERY_PARTITION` messages
per 20 minutes against one curated run per lane per day** — because
`CURATED_SWEEP_DELAY_SECONDS` is 86,400 and the seed key was a **day** bucket,
and outbox keys are consumed permanently, so every later same-day sweep
silently deduplicated itself away. The scanner won every wave by sheer rate,
not by priority.

Fix: arbitration lives in `assessIntakeGate` — the one pre-flight both
producers already called before any supplier request. Each caller now passes
an `intent` and is refused with `HIGHER_PRIORITY_INTAKE_PENDING`, naming the
exact lane holding the floor, while anything ranked above that lane may still
contribute to the current wave. The scanner yields to every curated lane;
`CJ_TRENDING` is never refused for priority, so the order cannot deadlock, and
`CURATED_MAX_PAGES` is what eventually forces a lane to report exhaustion and
release the floor.

Eligibility became **wave-scoped**: new `discovery_curated_lanes.
exhausted_at_wave_limit` records the wave edge at which a lane last reported it
had nothing left to contribute, folded into the same compare-and-set as
`advanceCuratedLane`'s own finish (so a worker that lost its lease cannot mark
a lane exhausted). A lane exhausted in one wave is eligible again next wave —
new products appear between waves — and a lane with no row yet is eligible by
default, so it always gets a first turn. The curated seed key itself became
`wave:{limitValue}`, replacing the day bucket, so a lane runs to completion
once per wave instead of once per calendar day. Both refusal paths write their
reason to `discovery_failures` naming the lane holding the floor, so a parked
partition reads as a deliberate yield rather than a silent mystery.

**Accepted cost, per the owner's decision:** coverage-partition progress pauses
while curated lanes run, so the catalogue cannot be claimed complete during an
active wave. Migration `0017_wet_arclight.sql` adds one nullable integer column
(`discovery_curated_lanes.exhausted_at_wave_limit`) — **owner-run, not yet
applied**, per this repository's standing migration discipline.

> [!WARNING] PR #50 broke within minutes of deploying — two same-day follow-up fixes (PRs #51–#52)
> Both are direct continuations of this incident chain, not new work.

### 4a. The wave-scoped seed key could not survive a dead lane worker (PR #51)

**Production, 2026-08-12, minutes after #50 deployed:** `CJ_TRENDING` sat
`RUNNING` with 0 pages fetched and an unexpired lease, its only
`curated:...:CJ_TRENDING:wave:600` row already `DISPATCHED`, no `PENDING` rows
anywhere. `CJ_MOST_LISTED`, `CJ_NEW_ARRIVALS`, and the partition scanner all
reported `HIGHER_PRIORITY_INTAKE_PENDING`. Nothing could advance: the wave edge
only moves when the wave fills, and filling it needed the exact lane stuck
holding the floor.

Root cause: §4's `wave:{limitValue}` seed key is spendable exactly once per
wave, because outbox idempotency keys are consumed permanently. A worker that
died holding a lane's lease left **nothing** able to re-enqueue that lane for
the rest of the wave — and because the lane still held the intake floor, every
producer behind it stalled with it. This is the identical key-consumption trap
§2 (PR #48) already fixed once; §2's own README note already stated the rule
this key broke: *a periodic key can continue a chain but never revive one.*
The regression test added in #50 asserted the key contained the wave edge
without asking how a lane recovers once that key is spent — so it passed while
the design was already broken.

Fix: the seed key now also carries the lane's `stateVersion`
(`wave:{limitValue}:v{stateVersion}`), which increments on every lease, pause,
and advance. A lane that has done anything at all yields a fresh key on the
next cycle-start sweep; an untouched lane still de-duplicates as one logical
seed. `listEligibleCuratedLanes` now returns the version alongside each lane so
only eligible lanes are seeded, with ranking still coming from `CURATED_LANES`
alone. The stuck production lane recovered on its own once this deployed — the
next sweep built a key its already-spent `wave:600` row could not swallow.

### 4b. The wave ceiling's own gating statement failed on the first genuinely new PID (PR #52)

**Production, 2026-08-12 16:04:33 UTC, dormant since the original lean-intake
commit (`6aa59c6`):** `tryConsumeNewPidCapacity` — the single conditional
`UPDATE` the entire 600-PID wave ceiling rests on, and the first statement any
genuinely new PID reaches — interpolated a raw `Date` (`${now}`) inside its raw
`sql` `CASE` for `cap_reached_at`. A plain Drizzle column assignment serializes
through the column's type mapping, but a value inside a raw `sql` template
reaches `postgres.js` as an untyped bind, which throws
`ERR_INVALID_ARG_TYPE` on a raw `Date`.

The bug stayed invisible for a full day because the coverage-partition scanner
spends all its time re-observing already-known PIDs, which consume no new
capacity and never touch this statement. It first ran live only once the
curated `CJ_TRENDING` lane (§4a) surfaced an actually-new product — at which
point the whole ingest transaction rolled back, the queue redelivered forever,
and the wave sat frozen at `admitted_count = 0` while `CJ_TRENDING` kept
holding the intake floor and everything behind it kept yielding. Every
fake-executor unit test passed throughout, because a mock never serializes a
bind the way a real driver does.

Fix: bind `now.toISOString()` instead of the raw `Date`. The new regression
test walks the actual `set` payload and asserts no raw `Date` is nested inside
a `sql` chunk — it fails against the old line — while separately pinning that
plain column assignments (`lastAdmittedAt: now`) legitimately stay `Date`
values, so the guard cannot overreach into rejecting correct code.

### What §4a and §4b add to the pattern below

Both are the same lesson as §2 and §3, recurring: a fix that looks complete
against fakes/mocks and passes review can still be structurally unable to
survive the one condition production will eventually hit — a worker dying
mid-lease, or the first row that isn't already-known. Every part of this
rolling-wave rollout that has failed so far has failed on its **first live
exposure to a case the test suite's fakes could not represent** (a real
idempotency-key consumption, a real driver serializing a real bind). That is
now four for four.

## What ties these four together

The wave-size change (§1) is a policy decision. The other three are what
happens when a system tuned for "spend a fixed lifetime budget, then stop" is
retuned to "cycle through bounded waves indefinitely" — every implicit
assumption about *what counts as settled between cycles* had to be found and
made explicit: a killed background chain has to actually revive (§2), history
has to stop competing with the current wave for the same gate (§3), and
multiple producers filling one wave need an explicit floor instead of racing on
raw throughput (§4). All three were found by reading live production
telemetry, not by code review — the commit messages record the exact counters
(1,536 pending, 82,679 stale rows, 609-to-1 message ratio) that exposed each
one.

## Verification claimed in the commit messages

- PR #48: regression test asserting two same-millisecond Resumes produce
  distinct idempotency keys.
- PR #49: tests on the `createdAfter` bound for both requeue tiers and for
  `countActiveEvaluationWork`, asserting frozen rows are excluded and
  post-freeze candidates are not.
- PR #50: tests on wave-scoped lane eligibility and the priority refusal
  ordering.
- PR #51: tests asserting the same wave+version de-duplicates, a moved
  version produces a fresh key, and an exhausted lane is not seeded.
- PR #52: a regression test walking the actual `set` payload for a raw `Date`
  nested in a `sql` chunk, paired with a test pinning that plain column
  assignments legitimately stay `Date` values.

This note does not independently re-run those suites; it records what the
commits claim. Treat commit-message verification claims with the same caution
this vault applies to any other unverified statement until re-checked against
the actual test run.

## Addendum, 2026-08-13: a sixth deadlock, found overnight (PR #59)

Not part of the "same day" five above — this surfaced the *next* day, from
watching the wave rollout run overnight, and is a distinct root cause from
§4/§4a/§4b even though it lands in the same subsystem.

**Observed overnight, 2026-08-12 into 2026-08-13: `CJ_TRENDING` re-walked its
entire result set at every one of five wave edges (600 → 1,170 → 1,690 → 2,229
→ 2,734) to contribute zero new products after wave 1**, stalling each wave
transition for minutes while the coverage-partition scanner — ranked below it
— sat yielding the whole time.

Root cause: §4's eligibility check compared a lane's stored
`exhausted_at_wave_limit` against the *current* wave edge, so a lane that had
already exhausted itself for good re-qualified as eligible at every new edge
and had to walk its whole set again just to reconfirm it had nothing left.
The stored value was being read as "exhausted as of the wave I last checked",
when the owner's actual model — confirmed on request — was "exhausted,
period": a curated lane's provider pages either genuinely run out, or it hits
its lifetime page budget (`CURATED_MAX_PAGES`, 25 pages per lane by design —
beyond that boundary is the coverage scanner's job, not a curated lane's).
`CJ_NEW_ARRIVALS` is narrower still: one fixed 14-day window, once, ever.

**Owner decision, 2026-08-13: strict one-way lane progression.** Trending
until it can give no more, then Most listed, then New arrivals, then the
partition scanner, forever — no lane re-opens on its own. Fix is read-side
only: `listEligibleCuratedLanes` now treats any non-null
`exhausted_at_wave_limit` as permanently done, full stop, and its now-unused
`waveLimit` comparison input was dropped. The write side (the exhaustion CAS,
`assessIntakeGate`'s arbitration, cycle-start seeding, the versioned revival
key from §4a) is untouched — a finished lane simply stops being reseeded or
blocking anyone, rather than the underlying machinery changing. Re-opening a
lane someday is a documented manual `UPDATE ... SET
exhausted_at_wave_limit = NULL`, not a code path — there is no re-arm
mechanism.

No migration: production's marks already fit the one-way model without a
backfill (`TRENDING=2734`, `MOST_LISTED=2734`, both done forever;
`NEW_ARRIVALS=null`, cursor at page 7, resumes and finishes; the scanner takes
over from there). `npm run verify` green: 1,251 unit tests passed (4
skipped), 76 E2E passed (2 skipped) — the flipped regression test pins marks
at three *different* old wave edges, all counting as done, to prove the
current-edge comparison is actually gone and not just renamed.

This is the same lesson §2/§3/§4a/§4b already taught, recurring a fifth time:
"exhausted" and "exhausted as of when I last looked" are different claims, and
conflating them is exactly the shape of bug this whole rollout keeps finding.
`sals3-portal` [PR #59](https://github.com/Sals3-Official/sals3-portal/pull/59),
merged.

## Cross-reference owed, resolved

[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §1b previously
documented the **lifetime 5,000-PID cap** as the active owner intake policy
with no correction applied. It now carries a struck-through correction
recording that the owner replaced it with the 600-PID rolling wave described
here, plus a pointer to this note — applied via `sals3-ecommerce`
[PR #74](https://github.com/Sals3-Official/sals3-ecommerce/pull/74), the same
way [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]'s own
parallel "Cross-references still owed" situation was resolved: a fresh branch
off `develop`, touching only the files this specific correction needed,
leaving the concurrent vault task's own uncommitted files untouched.
