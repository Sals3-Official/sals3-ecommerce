---
tags:
  - lessons-learned
  - postgres
  - data-quality
  - taxonomy
  - sals3
aliases:
  - "array_agg(DISTINCT) biases the sample"
  - A biased sample reads exactly like evidence
created: 2026-09-14
updated: 2026-09-14
status: current-state
authority: consolidated-lessons
owner_approved: false
related:
  - "[[sals3-skills]]"
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet]]"
  - "[[sals3-session-2026-09-04-part130-a-categorys-own-photo-and-a-browser-that-stopped-spending-points-to-run-a-test]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
---

# `array_agg(DISTINCT …)` biases the sample

> [!WARNING] Draft — written to close a dangling reference, not yet reviewed
> [[pending-register]] has carried *"ten lesson notes are referenced and were
> never written"* since 2026-09-09, and this was one of them:
> [[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet|part 129]]
> cites `[[array-agg-distinct-biases-the-sample]]` as the **first** instance of a
> failure it was seeing for the second time. This note is **assembled from part
> 129's own account of the second instance**, which is documented in full.
> `owner_approved: false`.

> [!IMPORTANT] What this note cannot tell you
> **The first instance is not described anywhere in this vault.** Part 129 says
> *"the same shape of failure as [[array-agg-distinct-biases-the-sample]], now
> with a second confirmed instance in this codebase"* — so an earlier occurrence
> was known to its author and was never written down. Nothing here reconstructs
> it, because reconstructing it would be inventing it. If you know what it was,
> add it and set `owner_approved: true`.

## The mechanism

`array_agg(DISTINCT name)` **sorts**. Sorting is part of how Postgres implements
`DISTINCT` inside an aggregate — it is not a promise the query made, and it is
not visible in the query's shape.

So slicing the first *n* elements off that array does not take a sample. It
takes the *n* alphabetically smallest values, every time, in every group.

## The instance that is documented

Part 129 §1, 2026-09-04, the supplier-leaf census behind
[[ADR-002-sals3-taxonomy-and-cj-category-mapping|ADR-002]]'s category mapping.

Every leaf in the first production census came back described by names starting
with digits — `1 Bracelet…`, `100 Kinds Of…`, `2026 New…`. That is the sort
order, presented as a description of the data.

It surfaced on **`Blazers`**: 8,527 candidates whose twelve "samples" contained
**zero blazers** — a wool sweater, a corset, a belt, a starry-night-print belt.

The cost of believing it ran both ways, which is what made it dangerous rather
than merely wrong:

- read at face value, the leaf looks like a **mixed bucket to disable** — and
  disabling it wrongly blocks 8,527 candidates;
- mapping it anyway **files corsets as blazers**.

**No honest decision was available from that sample in either direction.**

## Why nothing caught it

**Eleven existing unit tests passed the broken version.** The defect lived
entirely in what Postgres does with `DISTINCT` inside an aggregate — no type
check and no mock can see that, because neither runs the aggregate.

What proved it was a **40-row fixture against real Postgres**: 20 digit-first
and 20 letter-first names.

| | letter-first names returned in a 20-row sample |
| --- | --- |
| `array_agg(distinct name)` | **0 of 20** |
| the fixed ordering | **10 of 20** — exactly the fixture's 50/50 split |

Fixing the census moved mapped coverage from **18.7% to 43.2%** across the same
432,654 screened candidates in 473 supplier leaves, without mapping anything new
— the earlier number had been computed from leaves nobody could read.

## The lesson

**A biased sample reads exactly like evidence.** It arrives in the shape of an
answer, with no error, no warning, and nothing about it that looks wrong until
you know the domain well enough to notice that twelve blazers contain no blazer.

1. **An aggregate that sorts is not a sample.** `DISTINCT` inside `array_agg`,
   `GROUP BY` ordering, and any `LIMIT` without an explicit `ORDER BY random()`
   or equivalent all return *a* subset — never *a representative* one.
2. **Test a data-shape defect against the real engine.** Unit tests and type
   checks are blind here by construction. A small fixture with a known
   distribution turns an invisible bias into an arithmetic claim you can assert.
3. **When a sample makes a category look absurd, suspect the sample first.**
   "Near miss versus absurd" is part 129's own heuristic, and it is better than
   a percentage threshold: real mixed buckets are *near misses*, while a
   sampling bug produces results that are *absurd*.
4. **A number derived from a biased sample stays wrong after the sample is
   fixed** — until it is recomputed. The 18.7% was never a coverage figure; it
   was the alphabet.

**Where applied:** the supplier-leaf census in `sals3-portal`; full account in
[[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet|part 129]] §1.
A related but **different** aggregate defect — ordering inside
`array_agg(… order by published_at)` — is
[[sals3-session-2026-09-04-part130-a-categorys-own-photo-and-a-browser-that-stopped-spending-points-to-run-a-test|part 130]] §2,
the same day; do not merge the two, they fail for different reasons.
