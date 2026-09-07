---
tags: [session-record, sals3, portal, performance, read-model, ddl]
aliases:
  [
    "Part 142",
    "The list reads stored answers",
    "product_list_facts and the flat catalogue read",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part141-the-day-the-catalogue-stopped-being-expressible]]"
  - "[[sals3-session-2026-09-04-part140-the-automation-repository]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
---

# Part 142 — The list reads stored answers

> [!NOTE] Provenance
> Written after the fact from each PR's own record, the break-glass endpoint
> responses captured while running them, and two production measurements on
> the final deployment. All PRs are `anythingsupplies/sals3-portal`; the
> automation change is commit `7f402a7` in
> `anythingsupplies/sals3-portal-automation` (that repository takes direct
> commits — see [[sals3-session-2026-09-04-part140-the-automation-repository|part 140]]).
> Promote PRs not listed; every promotion verified by the branch tip's Vercel
> commit status.

| PR                                                                | What it did                                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [#126](https://github.com/anythingsupplies/sals3-portal/pull/126)  | The `product_list_facts` table — DDL first and alone, via break-glass    |
| [#132](https://github.com/anythingsupplies/sals3-portal/pull/132)  | The writer, the publish/pause/resume hooks, the bounded backfill and the drift-reporting reconciler |
| [#138](https://github.com/anythingsupplies/sals3-portal/pull/138)  | Round-two columns: the category answer, with the CJ fallback applied     |
| [#142](https://github.com/anythingsupplies/sals3-portal/pull/142)  | The reader — `/listings` renders from the stored facts                   |
| [#149](https://github.com/anythingsupplies/sals3-portal/pull/149)  | `detail=summary` on the internal catalogue API — the automation's read    |

## 1. The idea, and why it is not a second implementation

[[sals3-session-2026-09-07-part141-the-day-the-catalogue-stopped-being-expressible|Part 141]]
ended at 1,232 MB with the remaining cost still growing with the catalogue,
because every fact the list needs is derived at read time. The permanent fix:
**store the answers.** `product_list_facts` holds one row per product — the
tab status, attention reasons, availability, freshness, media status,
connection health, price, pause reason, newline-joined search keys, category
path and code, provenance — computed by the **same single TypeScript
implementations as always** (`listingStatus`, `deriveProductAvailability`,
`worstEvidenceFreshness`, `requiredSpecsFilled`, the fixture build), run for
one product and written down. Nothing re-derives anything in SQL. Storing an
answer is not duplicating a rule; two implementations of one rule is the
defect that shipped twice on 2026-09-07 morning (#73/#77) and again as #108.

## 2. Safety was the ordering

Three PRs, strictly ordered, each safe if the next never lands:

1. **DDL first and alone (#126).** A break-glass endpoint
   (`migrate-list-facts`, CRON_SECRET, idempotent `CREATE TABLE IF NOT
   EXISTS`, `SET LOCAL lock_timeout='5s'`, verified by re-reading
   `information_schema` after the run, not by a green response) created the
   table on SIT, UAT and production **before any code named it**. A new table
   in the schema breaks nothing when it arrives ahead of its writer; a new
   column on `products` breaks every read the moment the schema names it —
   the 2026-08-18 incident. Running it also established that **SIT, UAT and
   production are three separate databases**: each answered
   `tableExistedBefore: false`.
2. **Writer second (#132).** `factsFromFixture` copies answers off the
   fixture; publish, unpublish and resume recompute after commit at the
   domain level (so the automation's API path is covered); draft creation was
   hooked in #142's groundwork because a draft with no facts row is invisible
   in the list — worse than staleness. The backfill is bounded (50 per run);
   the reconciler recomputes the oldest rows, repairs drift and **reports the
   drifted count**, which is how a missed write path gets found rather than
   staying missed. Backfilled to `missing: 0` everywhere: SIT 144/144, UAT
   123/123, production 2,939/2,939 across 59 bounded runs, baseline
   `drifted: 0`.
3. **Reader last (#142).** `/listings` became one indexed query
   (`product_list_facts` inner-join `products`), returning
   `CatalogueListSummary` — a `Pick` of the full fixture, so every mock
   fixture and preview path satisfies it by construction, and retyping the
   list components to the summary let `tsc` find the two consumers a manual
   field inventory had missed.

#138 sat between writer and reader: the list shows a category path with the
CJ fallback already applied (owner decision 2026-08-14 — an unmapped product
shows the supplier's own category, never "Unmapped category"), and that
fallback is computed in the fixture build, so the stored answer had to carry
it. Two `ADD COLUMN IF NOT EXISTS` by break-glass, writer bumped to version
2, and the reconciler's version rule refilled every v1 row — version
staleness IS missing, so no second backfill mechanism exists.

The source rows are never touched. Losing the whole facts table costs one
backfill run and nothing else.

## 3. The result, measured and functionally verified

Two full `GET /listings` renders on the production deployment, same method as
every part-141 measurement: **535 MB / 1.50s and 544 MB / 1.85s**. End to
end: **1,846 MB → ~540 MB (−71%), 14s → ~1.7s**, 90% of the 2,048 MB ceiling
down to 26% — and unlike every earlier row of the table, this one no longer
scales with the catalogue. A summary row is a few hundred bytes; the read
stays flat into six figures of products. No paid tier.

Functional verification on production: exact tab counts (All 2939 / Draft 33
/ Live 2906), category labels all filled after the v2 refill
(`staleVersion: 0`), row expansion works, name search works, and field-scoped
Seller-SKU search returned exactly one product — the newline-joined
`variant_skus` index behaving as designed (newline as separator because a
typed term cannot contain one, so a needle can never match across two SKUs).

## 4. The last door into the same warehouse (#149)

The internal catalogue API — the automation's whole-catalogue read — still
built the FULL fixture to answer callers that read a handful of fields per
row: the same cost shape, the same ~4,800-product cliff. `?detail=summary`
now serves the stored-facts summary. Three guards, all against silence:

- The default stays FULL, so no existing caller's parser changes shape
  underneath it; an **unknown `detail` is a 400**, never silently FULL.
- The response **echoes which shape it served**, because an older deployment
  ignores unknown query parameters and answers FULL without a word.
- The automation client asserts the echo and raises `summary_not_served`
  rather than letting a memory-priced call masquerade as the cheap one.

`sourceCandidateId` rode into the summary via a grouped LEFT JOIN on
`provider_product_references` (deterministic `min()` over a text cast — the
part-141 `rows[0]` lesson applied in the same week it was learned) because
the sourcing pipeline maps candidateId → productId from the catalogue delta
after a bulk draft. Automation commit `7f402a7` flips `catalogue()` to
summary by default; `rescue_drafts` reads `categoryPath` (the CJ fallback
makes it the supplier path for exactly the mirror rows it examines);
`measure_catalogue` keeps `detail="full"` on purpose — weighing the expensive
shape is its job. Verified live: `run_status.py` and `rescue_drafts.py
--dry-run` against production, 2,939 rows, DRAFT 33 / LIVE 2906, zero rows
missing `sourceCandidateId`.

## 5. What was not done

- `withdraw-market-offers` is deliberately unhooked from the facts writer — a
  bounded break-glass operation; run one `reconcile` after using it.
- The 33 DRAFT products (about 330 CJ points already spent) are ready to
  publish — every one now carries a real taxonomy leaf — and are held for the
  owner's word, as is the next 1,000-item sourcing run.
- The per-product editor snapshot keeps the full fixture on purpose: it
  answers for one product, and a leaner bespoke query would be a second
  implementation.

## Lessons

- **Store the answer, keep one implementation.** A derived fact that every
  page view recomputes is a cost that scales with the data; write it down at
  write time and let a reconciler both repair and *report* drift, so a missed
  write path surfaces instead of rotting.
- **DDL first, alone, and verified by re-reading the schema** — merged code
  must never be the first thing to discover a table is missing. The gentler
  failure mode (an upsert into a missing table) is not a reason to skip the
  discipline; relying on the gentle case is how the harsh one ships.
- **Derive the narrow type from the wide one.** `CatalogueListSummary` as a
  `Pick` of the fixture meant fixtures satisfied it by construction and the
  compiler found the consumers the manual inventory missed.
- **A silent fallback on a query parameter is a cost bug.** Refuse unknown
  values, echo what was served, and make the client assert the echo — an old
  deployment answering the expensive shape without a word is otherwise
  indistinguishable from success.
