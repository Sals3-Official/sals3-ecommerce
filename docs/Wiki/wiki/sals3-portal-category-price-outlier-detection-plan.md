---
tags:
  [
    sals3,
    sals3-portal,
    catalog,
    candidate-evaluation,
    pricing,
    plan,
    not-implemented,
  ]
aliases:
  [
    Category Price Outlier Detection Plan,
    The Ballpen Problem,
    Category-Relative Price Check,
  ]
created: 2026-08-13
updated: 2026-08-13
status: planned-not-implemented
authority: implementation-plan
owner_approved: partial
implementation_status: reverted-pending-safety-fixes
related:
  - '[[hot]]'
  - '[[agent-operating-contract]]'
  - '[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]'
  - '[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]'
  - '[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]'
  - '[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]'
  - '[[cj-candidate-to-sals3-product-draft-implementation-spec]]'
---

# Category price outlier detection — plan (not yet implemented)

> [!WARNING] Reverted, not shipped
> A full implementation was built, verified, and then **fully reverted** on
> 2026-08-13 (`git restore` to HEAD, local dev DB index dropped) after a
> late-session risk review found two unresolved safety gaps — see
> "Why this was reverted" below. Nothing described here exists in the
> codebase right now. This note exists so the design and the lessons are not
> lost before the next implementation attempt.

## Problem

Live production data on `/products/pipeline?tab=blocked` showed **93,297 of
124,650 candidates (~75%) blocked**, overwhelmingly by `INVALID_PRICE` — the
flat `[CATALOG_MIN_PRICE_USD_CENTS, CATALOG_MAX_PRICE_USD_CENTS]` band
(`$1.00–$500.00` default) in `rules/screening.ts`'s `checkPriceBoundsCheap`.

Verified via live CJ API calls that this band is structurally wrong for two
distinct reasons at once:

- Genuinely legitimate cheap dropshipping accessories (thread, caps, hats,
  badges) routinely wholesale on CJ for **$0.50–$0.99**, under the $1 floor.
- Genuinely legitimate premium items (a real leather coat, verified at
  **$638.06**) sit above the $500 ceiling.

**The owner's real concern is neither of those** — it is the opposite failure
mode: **"yung mga gagong listing... nag-iinflate ng sobra sobra sa presyo.
example ball pen 1000usd agad."** A flat price band cannot distinguish a
genuinely-premium item in a genuinely-expensive category from a
listing-error/scam price in a genuinely-cheap category, because $1,000 is
unremarkable in one category and grotesque in another.

**Evidence this is the right lever, not a flat band**: four independent CJ
category searches ("ball pen", "phone case", "keychain", "sticker") showed
real same-category prices cluster tightly — medians $1.34–$5.13, real
same-category maxes under ~$30 in every case. The only "outliers" that
appeared in each sample turned out to be a *different, mismatched category*
picked up by loose keyword search (a $484 "Dog Playpen" surfacing under a
"ball pen" search, a $220 Mahjong set surfacing under "phone case") — never
genuine same-category price inflation. This is why the fix must be
**category-relative**, not a wider/narrower flat number.

## Owner decisions already made (2026-08-13, Bogs) — these stand

1. **Severity: ATTENTION only, never BLOCK.** A detected outlier routes to
   **Needs Attention** for human review, never to Blocked/Rejected. Owner's
   own words: *"punta nalang sa needs attention itong mga to. sayang sa
   listing eh."* This also matches
   [[ADR-010-catalog-decision-governance-and-shadow-enforcement]]'s
   requirement that a new automated enforcement rule earn shadow-mode
   measurement before it may reject outright.
2. **Aggregation scope: cross-tenant / platform-wide, not per-seller.** The
   "typical price for this category" reference must be computed across
   **every** seller's candidates in that category, not scoped to one
   seller's own connection. Reasoning: a single seller's own sample per
   category is too often too small to trust. This is a deliberate, narrow
   exception to the normal [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]/[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]
   per-connection tenant boundary — justified because it reads only an
   aggregate price statistic, never another seller's actual candidate rows
   (the same nature of information CJ's own public catalog already exposes).

## Planned design

- New reason code `PRICE_OUTLIER_FOR_CATEGORY` in `rules/contracts.ts`'s
  `REASON_CODES` — **not** added to `PERMANENT_REASON_CODES` (irrelevant
  anyway since this rule only ever emits `ATTENTION`, never `BLOCK`).
- New env-configurable thresholds in `rules/policy.ts`, same
  `envInt(name, fallback)` pattern as the existing price bounds:
  - `CATALOG_CATEGORY_PRICE_OUTLIER_MIN_SAMPLE_SIZE` (proposed default `20`)
    — below this many other priced candidates in the category, the check
    stays silent rather than compare against a number computed from noise.
  - `CATALOG_CATEGORY_PRICE_OUTLIER_MULTIPLIER` (proposed default `15`) —
    flag when a candidate's price exceeds this multiple of the category's
    observed median. **Both numbers are placeholder guesses, not calibrated
    — confirm with the owner before locking them in, same as every other
    value in `policy.ts`.**
- New cross-tenant query `resolveCategoryPriceReference(executor,
  providerCategoryId, excludeCandidateId)` in `candidates/repository.ts`:
  `COUNT(*)` + `percentile_cont(0.5)` median over
  `candidate_evaluations JOIN supplier_candidates ON candidateId`, filtered
  to the target `provider_category_id`, **excluding the candidate being
  evaluated itself** (see bug below), returning `null` below the minimum
  sample size.
- New rule `checkCategoryPriceOutlier(feed, categoryPriceReference)` in
  `rules/screening.ts`, wired into `runScreening` as a 3rd parameter
  (default `null` so existing callers/tests don't need churn).
- New schema index: `supplier_candidates(provider_category_id)` **alone**
  (no `supplierConnectionId` leading column, unlike the existing
  `supplier_candidates_connection_category_idx`) — needed because this
  query is deliberately cross-tenant. This is the one migration required.
- Wiring in `evaluate.ts`: resolve the reference by
  `candidate.providerCategoryId` (the real, indexed column — **not**
  `feedSnapshot.categoryId`, which is optional/display-only), excluding
  `candidate.id`, before calling `runScreening`.

## Bugs found during the first implementation attempt (fixed, then reverted anyway)

1. **Self-inclusion.** The first draft of `resolveCategoryPriceReference` did
   not exclude the candidate being evaluated from its own reference query —
   a candidate's own price was folded into the "typical price" it was then
   compared against. Median is robust to one outlier so this rarely changed
   the outcome, but it directly contradicted the intended design ("compare
   against every *other* candidate") and was a real, confirmed bug. Fixed by
   adding the `excludeCandidateId` parameter.
2. **Misleading doc comment, not a behavior bug.** The first draft's comment
   claimed the reference only counts "already-decided" candidates; the
   actual query never filtered by evaluation status at all (a `QUEUED` or
   even `EVALUATION_FAILED` row's captured feed price counts too). On
   reflection this behavior is *correct* — `feed_snapshot.priceUsdCents` is
   captured at ingestion, before any decision exists, so a not-yet-decided
   row's price is exactly as real as a decided one's — but the comment must
   say so accurately rather than falsely narrower. **Known, accepted
   limitation carried forward**: a category whose sample is dominated by
   corrupt/garbage prices (not just a minority) would still skew the
   median — not solved by this design, and filtering to the existing flat
   `MIN`/`MAX_PRICE_USD_CENTS` band would defeat the entire point of a
   category-relative check for genuinely expensive categories, so that
   "fix" was deliberately rejected.

## Why this was reverted — the two gaps that must close before this ships

Both were found only during a live-safety gut-check late in the session
(prompted by the owner, correctly, worrying about breaking an **ongoing,
actively-processing production pipeline**) — after full lint/typecheck/
format/unit/build/e2e/audit had already gone green, which is the trap: none
of those checks would have caught either gap.

1. **No error boundary — CRITICAL, must fix first.** `evaluate.ts` has zero
   `try`/`catch` anywhere. The queue consumer
   (`src/app/api/queues/catalog-discovery/route.ts`, via `@vercel/queue`'s
   `handleCallback`) documents explicitly: *"a thrown error triggers
   redelivery with backoff."* If `resolveCategoryPriceReference` throws for
   **any** reason (DB hiccup, connection-pool exhaustion, an unexpected data
   shape) on any candidate, that candidate's entire evaluation fails and
   gets redelivered/retried at the queue-infrastructure level — separate
   from, and invisible to, the portal's own `EVALUATION_FAILED`/attempt-count/
   Exception Queue accounting, until the dispatcher's poison-message parking
   eventually catches it. A **non-critical, ATTENTION-only enhancement must
   never be able to block, delay, or fail the core PASS/BLOCK decision**.
   Required fix: wrap the `resolveCategoryPriceReference` call in `evaluate.ts`
   in a `try`/`catch` that degrades to `null` (no reference, rule stays
   silent) on **any** failure, logged but never rethrown — matching this
   exact codebase's own established pattern elsewhere (`cj-auth.ts`'s
   webhook-secret write: *"Best effort: a failure here must not fail the
   token refresh itself"*).
2. **Untested at realistic production scale.** The query was only verified
   against ~21 seeded rows (enough to prove correctness, not performance).
   `percentile_cont` requires a full sort of every matching row — no index
   shortcut for the percentile itself, only for the initial category filter.
   Real CJ categories already ingested in production could plausibly hold
   thousands to tens of thousands of candidates sharing one
   `providerCategoryId` (124,650 total candidates observed live, spread
   across an unknown but likely large number of distinct fine-grained
   categories). **Before shipping, load-test this query against a
   realistic large-category row count (start at 20,000–50,000 seeded rows)
   with `EXPLAIN ANALYZE`**, and confirm it comfortably fits inside both the
   discovery queue route's `maxDuration = 300` and the break-glass
   evaluate-tick route's `maxDuration = 60`, without degrading shared DB
   load under concurrent evaluation throughput. If the load test shows real
   risk, consider a query-level statement timeout or a precomputed/cached
   reference table (refreshed on a bounded schedule) instead of a live
   per-candidate aggregate — deferred design decision, not resolved here.

Given both gaps, the full change was reverted (`git restore` to HEAD across
every touched file; the local dev DB's added index dropped) rather than
shipped with either open. **Do not re-implement this by copy-pasting the
old diff without closing both gaps first** — the error-boundary fix
especially must be part of the design from the start, not bolted on after.

## Testing approach learned (for next time)

- Pure rule-level logic (`checkCategoryPriceOutlier`) is a straightforward
  unit test, same shape as every other rule in `screening.test.ts`.
- Wiring-level tests need the mock in `evaluate.test.ts`'s
  `vi.mock('./repository', ...)` block extended with
  `resolveCategoryPriceReference: vi.fn()`, defaulted to resolve `null` in
  `beforeEach` so existing tests are unaffected.
- The actual SQL correctness (the JOIN, the JSONB `->>` extraction and
  numeric cast, `percentile_cont`, the self-exclusion filter) **cannot** be
  verified by mocked unit tests. Two options, both used during the reverted
  attempt:
  - A one-off manual verification script run once against the local dev
    Postgres, then deleted — quick, but leaves no permanent regression
    coverage.
  - A permanent e2e Playwright test (`e2e/catalog-shortlist.spec.ts`
    already has a "database state after a real tick" precedent using raw
    `postgres` queries) — but this repo's e2e suite has **no established
    convention for importing `@/` app modules into Playwright** (no
    `tsconfig-paths` register configured for the Playwright runner), so
    such a test necessarily **duplicates the SQL by hand** rather than
    literally calling the shipped TypeScript function. Real, accepted
    testing gap: it guards the SQL *pattern*, not literally the committed
    `resolveCategoryPriceReference` code path. Worth deciding up front next
    time whether to invest in wiring path-alias support into Playwright
    instead, if this class of DB-query correctness testing recurs.
- Testing genuine cross-tenant aggregation requires a **second real seller
  account**, not just a second connection: `supplier_connections` has a
  unique constraint on `(seller_account_id, provider_id)`, so a second
  connection under the *same* seller for the same CJ provider is rejected.
  A throwaway `seller_accounts` row (just `identity_id` + `business_model`)
  plus a throwaway `supplier_connections` row under it is the minimum
  needed, both cleaned up after the test.

## Next-implementation checklist

- [ ] Design the error boundary (try/catch → `null` on any failure) as part
      of the initial implementation, not an afterthought.
- [ ] Load-test the aggregate query at realistic scale (20k–50k rows) with
      `EXPLAIN ANALYZE` *before* wiring into `evaluate.ts`. Decide whether a
      live per-candidate query is still the right call, or whether a
      precomputed/cached reference table is needed instead.
- [ ] Confirm the exact `MULTIPLIER` (15x proposed) and `MIN_SAMPLE_SIZE`
      (20 proposed) with the owner — placeholders, not calibrated.
- [ ] Re-implement: reason code, policy constants, query function (with
      self-exclusion from day one), rule function, schema index + migration,
      `evaluate.ts` wiring (with the error boundary).
- [ ] Full verify suite (lint, typecheck, format, unit tests, build, e2e,
      `npm audit --audit-level=high`) — necessary but was already proven
      **not sufficient** last time; the two critical gaps above passed every
      one of these checks.
- [ ] Consider whether existing historical `PASS` candidates should be
      reachable by this new rule at all, or only newly-ingested ones —
      `requeuePolicyVersionMismatches` is the existing mechanism for
      re-evaluating old rows under a new policy version; decide whether to
      use it or explicitly leave history alone.
- [ ] Update `README.md` and `.env.example` (drafted once already during the
      reverted attempt — the prose is gone, but the "where it goes" is
      described above).

## Operational caveat noticed during cleanup (unrelated to this feature, but relevant)

While dropping the local dev DB index during revert, the migration ledger
(`drizzle.__drizzle_migrations`) showed **two** entries past migration 0018
(ids 19 and 20), though only one migration (`db:migrate`) was run this
session. This suggests another session/process may be using the **same
shared local dev database** concurrently. Worth confirming who/what before
the next `db:generate`/`db:migrate` here, to avoid migration-numbering
collisions — see [[sals3-portal-canonical-product-catalog-backend]]'s own
"Migration-numbering collision" section for what that looked like the last
time it happened.
