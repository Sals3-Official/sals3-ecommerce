---
tags: [session-record, sals3, portal, incident, performance, postgres]
aliases:
  [
    "Part 141",
    "The day the catalogue stopped being expressible",
    "The 65,535 bind ceiling outage",
  ]
created: 2026-09-07
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-08-part142-the-list-reads-stored-answers]]"
  - "[[sals3-session-2026-09-04-part135-a-retry-that-could-never-retry-and-the-points-it-cost]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
---

# Part 141 — The day the catalogue stopped being expressible

> [!NOTE] Provenance
> Written after the fact from each PR's own record, the Vercel runtime logs
> read during the incident, and the production measurements taken after every
> merge. All PRs are `anythingsupplies/sals3-portal`, merged to `develop` and
> promoted through `pre-prod` to `main` the same day, each promotion verified
> by the branch tip's Vercel commit status (promote PRs not listed).

| PR                                                              | What it did                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [#81](https://github.com/anythingsupplies/sals3-portal/pull/81)  | Scope every seller read by subquery, not by a bound list of ids        |
| [#84](https://github.com/anythingsupplies/sals3-portal/pull/84)  | Escape the NUL census-key separator so grep can read `read-model.ts`   |
| [#88](https://github.com/anythingsupplies/sals3-portal/pull/88)  | Stop reading two jsonb columns the screen never opens                  |
| [#93](https://github.com/anythingsupplies/sals3-portal/pull/93)  | Stop sending the editor's fields to the list (`detail: 'LIST'`)        |
| [#99](https://github.com/anythingsupplies/sals3-portal/pull/99)  | Carry the specs answer, not the 34,754 control rows behind it          |
| [#102](https://github.com/anythingsupplies/sals3-portal/pull/102) | Stop sending variant rows to a table nobody opened                     |
| [#105](https://github.com/anythingsupplies/sals3-portal/pull/105) | Read the expanded row's variants through a Server Action (repairs #102) |
| [#108](https://github.com/anythingsupplies/sals3-portal/pull/108) | Make the Paused tab answer one number, and say why                     |

## 1. The outage

From about 12:30 on 2026-09-07, every seller-facing production read answered
500: `/listings`, the product editor snapshot, and the internal catalogue API
the automation uses. **Nothing had been deployed for two hours.** The trigger
was data volume — a 1,000-item sourcing run had just published — not code.

Two observations made it diagnosable. First, the storefront APIs stayed at
200 throughout, which ruled out the database, Neon and the deployment in one
look: only the seller reads were gone. Second, the `Failed query` log entry
was truncated mid-parameter-list at `$34125` — Vercel cuts a log message at
262,144 characters, and the UI cuts it far earlier — so the parameter count
had to be read with JavaScript against the log page's DOM, and even then it
was a lower bound.

## 2. The first root: a statement that cannot be said

`listCoreRows` read the seller's product ids and handed them back to Postgres
as a literal list in every child query — variants, references, revisions,
media, options, offers, bindings, candidates. One bound parameter per id.
**A single Postgres statement carries at most 65,535 parameters**: the count
is a 16-bit field in the wire protocol's `Bind` message — a hard ceiling, not
a tunable. Past it, the statement is not slow; it is inexpressible.

#81 replaced the id lists with subqueries. Every statement now binds the
seller account and nothing that scales — three parameters for the offers
scope whatever the catalogue holds — and `catalogueScope()` is the one named
place the scoping lives. Its test asserts the SQL *shape* (no `$1, $2, $3`
run; `exists` present), never a row count. The same PR fixed the second half:
`findProductEditorFixtureForSeller` had been loading the **entire** catalogue
to answer a question about one product (~870 MB, ~8s per call, once per item
published), which is what made the ceiling reachable at all. `productId` now
narrows the SQL instead of filtering the answer.

## 3. The second root: 90% of the ceiling with the site working

With the site back up, the render was measured: a successful `/listings` at
2,909 products used **1,846 MB of the 2,048 MB** Vercel function (Function
CPU `standard`, 1 vCPU / 2 GB). The page shows 25 rows, but its tab counts,
quick filters and search need a fact about **every** product, and every fact
is derived — status from the publication state plus every offer, availability
and freshness from the variants, media status from the media rows. Deriving
at read time meant loading every variant, offer, binding and media row the
seller owns on every page view. At the sourcing cadence of 1,000 items per
run, the ceiling sat at roughly 4,800 products — two runs away.

The owner declined Vercel's paid 4 GB tier deliberately: it prices the
symptom, moves the cliff to ~9,600, and answers a read-shape problem with a
bigger machine.

## 4. The measured cuts, and what measuring corrected

Every attempt was measured on production after it deployed — full `GET
/listings` render, Vercel's per-invocation Fluid figure:

| Deployment                                     | Memory   | Duration |
| ---------------------------------------------- | -------- | -------- |
| after the parameter fix (#81)                  | 1,846 MB | 14.0s    |
| two unread jsonb columns dropped (#88)         | 1,830 MB | 15.3s    |
| editor fields dropped from the list (#93)      | 1,629 MB | 13.2s    |
| the specs answer instead of the controls (#99) | 1,467 MB | 12.5s    |
| variant rows held back (#102)                  | 1,250 MB | 10.2s    |
| Server Action repair (#105)                    | 1,232 MB | 10.3s    |

Three corrections the measurements forced:

- **#88 was a guess and it was wrong.** Two unread jsonb columns sounded
  conclusive; they moved 16 MB of 1,846. It stayed merged for a different
  reason — it made a non-deterministic revision fallback deterministic.
- **#93 was measured first**: `measure_catalogue.py` (automation repo) sized
  every field of the 68.6 MB payload. The six editor-only fields it removed
  were 30% of the payload and bought 11% of the memory — **payload share is
  not memory share**.
- **#102 shipped broken and its own tests stayed green.** The expanded row's
  variant fetch called an internal API from page script — 401 by design (the
  CSRF header) — and the mocked fetch in tests proved the call was made, not
  that it was accepted. #105 moved it to a Server Action, and
  `client-server-boundary.test.ts` now fails on the exact line that shipped.

## 5. The Paused tab answered six different numbers (#108)

During the incident the Paused tab read 390, 344, 113, 0, 275, 96 across
refreshes — which read like corruption and was neither: two un-`ORDER BY`'d
queries fed `rows[0]`, so the offer that decided a product's status and the
revision that decided its price were the planner's coin toss. #108 gave both
a deterministic order (published-first, then market code). A wrong-but-stable
answer would have been found in review; a *random* answer read as data.

## 6. What was not done here

The remaining 60% of the ceiling still grew with the catalogue — `variants`
(45% of the payload) cannot leave the response while search, filtering and
pagination run in the browser. That is [[sals3-session-2026-09-08-part142-the-list-reads-stored-answers|part 142]],
the permanent fix. #84 is listed for completeness: a census-key NUL separator
written literally into source had made `read-model.ts` unreadable to grep and
several tools; it became an escape sequence in a spawned side-session.

## Lessons

- **A read that binds one parameter per row works for weeks, then fails
  permanently with no deploy.** The 65,535 ceiling is protocol, not config.
  Scope by subquery; assert the SQL shape in a test.
- **Check the two halves separately before suspecting infrastructure.** The
  storefront staying at 200 eliminated the database, the host and the deploy
  in one observation.
- **Predict from a measurement, then measure again.** The confident jsonb
  guess moved under 1%; the measured cut moved 11%; and payload share is not
  memory share.
- **A mocked transport proves a call is made, never that it is accepted.**
  The client reaches the server through Server Actions; a page-script fetch
  of an internal API is 401 by design and every local check stays green.
- **An unordered query feeding `rows[0]` is a coin toss that reads as data.**
  It made one tab answer six numbers and changed a row's price between
  refreshes.
