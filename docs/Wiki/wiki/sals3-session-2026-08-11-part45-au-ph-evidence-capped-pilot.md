---
tags: [sals3, sals3-portal, session-note, catalog, market-policy, cj-dropshipping, cost-control]
aliases:
  - AU PH Pilot
  - Pilot Allowance Cap
created: 2026-08-11
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[sals3-session-2026-08-11-part27-au-buyer-destination-approval]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[hot]]"
---

# Opening AU+PH for real evaluation, capped twice against a 43-day points bill

`sals3-portal` [PR #32](https://github.com/Sals3-Official/sals3-portal/pull/32),
`aj-garrigues` (AJ), merged 2026-08-11. No prior vault entry — the earlier
[[sals3-session-2026-08-11-part27-au-buyer-destination-approval]] documents
the owner's *policy* decision to approve AU as a buyer destination; this PR
is the separate, later, code-side work that actually let candidates be
re-decided under it, with real money at stake if done carelessly.

## The exposure this PR was written to avoid

Production held 87,966 candidates with **zero** `Ready`, because
`checkValidMarket` — the first screening rule any candidate hits — was
hard-coded to `{ countryCodes: [], effective: 'DISABLED' }`. Simply flipping
the buyer-destination allowlist open to `['AU', 'PH']` (per the owner's
2026-08-11 instruction) with no other change would have let all ~86,606
already-stored candidates re-enter evaluation and issue a real CJ evidence
fetch — roughly 1.73 million CJ points, about **43 days** of the account's
fully saturated background allowance, spent in one uncontrolled burst.

## The two bounds, deliberately different in kind

**Primary bound — data, not code.** `checkValidMarket` refuses any candidate
whose own `intended_market_codes` column is empty, independently of the
allowlist itself. Every one of the ~88k rows ingested while the policy was
disabled stored `'{}'`. Backfilling that column for a deliberately chosen
cohort, and leaving everything else at `'{}'`, is an atomic, race-free,
migration-free cap that every execution path already honors — and a single
`UPDATE` reverses it completely. At merge time, 87,926 candidates remained
at `'{}'` and stayed blocked for free; only 40 legacy rows already carrying
`{PH}` became eligible (at most 800 points) — the real cohort backfill was
left as its own, separate, deliberate step.

**Backstop bound — code.** A new `discovery/pilot-allowance-repository.ts`,
enforced in `candidates/evaluate.ts` immediately before the CJ adapter is
even built. Counts rows where `evidence_summary IS NOT NULL` (written only by
a successful evidence fetch, cleared by nothing) and refuses past
`CATALOG_PILOT_BASELINE_COUNT + CATALOG_PILOT_EVIDENCE_CAP` — set in
production to `19 + 1950`. Placed specifically in `evaluate.ts` rather than
the queue handler for two reasons stated in the PR: every *free* exit path
(a screening block, a missing connection, a paused connection) returns above
this gate, so a decision that costs nothing can never consume a paid slot,
true by construction rather than convention; and `run-tick.ts` — the
authenticated break-glass tick route — calls `evaluateCandidate` directly, so
a gate placed only in the ordinary queue handler would have left that route
uncapped.

A refusal here drops the work outright (`last_error_code = 'pilot_cap_reached'`,
retry count untouched, no retry scheduled) rather than parking it for later,
on purpose: the points budget itself refills at UTC midnight, so parking a
budget-refused item makes sense — but a *total* cap never refills, so
parking one here would just redeliver it into the delivery cap and
dead-letter it as a failure that never actually happened.

## An unrelated defect fixed along the way

`run-tick.ts` had been calling `evaluateCandidate` with no options at all,
which bypassed `createGovernedFetch` entirely — that route was spending real
CJ points outside the shared 1-request-per-second limiter, and never
persisting the `pointsInfo` its own responses carried, leaving
`supplier_request_budgets` stale for every other queue worker consulting it
concurrently.

## Admission endpoint

`POST /api/internal/catalog/discovery/pilot/admit` requeues a bounded,
explicitly-scoped set of never-before-paid candidates and publishes their
evaluation messages. It deliberately does not consult discovery's own run
state, because the pilot is meant to run with discovery **paused** — nothing
new is being ingested, and pausing discovery would otherwise also silence
the freshness sweep that normally produces this kind of work.

## Deploy notes, as stated by the PR

Discovery was paused before merge. `CATALOG_PILOT_BASELINE_COUNT=19` and
`CATALOG_PILOT_EVIDENCE_CAP=1950` were already set in production. No
migration — existing columns only.

## Verification

`npm run verify` green: 653 unit tests, 51 E2E. New coverage pins the
load-bearing guarantees directly: a screening-blocked candidate never
consults the allowance at all; an unworkable connection never consults it;
a cap refusal leaves `attempt_count` unchanged; the break-glass tick receives
a real `fetchImpl` rather than none.

## Why this matters for the incidents that followed

This PR is the reason `NO_VALID_MARKET`/`buyer-destination-country-v1-disabled`
rows existed at all by the time
[[sals3-session-2026-08-12-part43-discovery-recovery-migration-gate-and-frozen-decisions]]
and
[[sals3-session-2026-08-12-part36-rolling-pid-waves-and-discovery-deadlocks]]
had to deal with reopening and re-processing them at scale — those notes
pick up directly from the state this one leaves behind.
