---
tags: [sals3, session, sals3-portal, publication, postgres, taxonomy, cj-points, automation]
aliases:
  - Part 135
  - A Retry That Could Never Retry
  - The Points It Cost
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[sals3-session-2026-09-04-part134-the-last-306-supplier-leaves-and-the-seed-that-has-not-run]]"
  - "[[sals3-session-2026-09-04-part140-the-automation-repository]]"
  - "[[hot]]"
---

# Part 135 — a retry that could never retry, a caution that fired on the whole catalogue, and 1,220 points spent on candidates the gate refuses

> [!NOTE] Provenance
> Written 2026-09-07 after the fact from each pull request's own merged record.
> The production symptoms described here — two drafts answering 500, the runtime
> log parameters, the 122-of-146 stranded-draft count — are each PR's own
> observation at the time, not re-verified from this session.

| PR | Title | Merged |
|---|---|---|
| [#48](https://github.com/anythingsupplies/sals3-portal/pull/48) | fix(publish): the slug retry could never retry — the first collision aborted the transaction | 2026-09-03T20:49:50Z |
| [#52](https://github.com/anythingsupplies/sals3-portal/pull/52) | fix(editor): the category caution should mean "still CJ's", not "no seller confirmed it" | 2026-09-04T18:41:57Z |
| [#63](https://github.com/anythingsupplies/sals3-portal/pull/63) | feat(candidates): tell a caller what a draft will be filed under, before it pays | 2026-09-04T20:30:28Z |

No DDL. No CJ call added by any of them.

Three unrelated-looking changes with one cause behind them: for the first time,
something was drafting and publishing **at volume**, against a taxonomy that had
just been mapped. Each of the three is a latent defect that only a high-rate
caller could reach — a collision that needed duplicates, a warning that needed
hundreds of correctly-filed products, and a spend that needed enough runs to
notice a pattern in. See [[sals3-session-2026-09-04-part140-the-automation-repository|part 140]]
for the caller.

## 1. A retry loop that only ever ran once

`publishWithSlug` walks a ladder of candidate slugs, catching the unique
violation on `products_public_slug_key` to try the next one. It runs **inside**
`publishProduct`'s transaction.

In Postgres a statement that raises **aborts the enclosing block**. Everything
after it answers `25P02 current transaction is aborted` until the block ends. So:

1. base slug collides → `23505` on `products_public_slug_key`
2. the `catch` correctly recognises it and moves to the next candidate
3. **but the transaction is now aborted**
4. the second attempt raises `25P02`, not `23505`
5. `uniqueViolationConstraint(error) !== 'products_public_slug_key'` → rethrown →
   **500**

The loop could only ever succeed on its **first** candidate. Which is to say it
never retried anything, for as long as it has existed.

### Found from production, and the tell was a parameter

Two drafts answered 500 on every publish attempt from 2026-09-03. The runtime
log carried the query and its parameters, and the parameters gave it away:

```
params: phone-case-sliding-card-drop-resistant-protective-cover-2, PUBLISHED, …
```

**The `-2` proves the first retry did fire.** The failure was not "the retry
never ran", it was "the retry ran into a connection that could no longer answer".
Both stuck drafts turned out to be duplicates of a product already live under the
base slug — `Phone Case Sliding Card` and `Garlic maser` — which is exactly the
shape a bulk drafting run produces and a human curator does not. Every other
product published normally, because its base slug was free.

### The fix, and the fake that had been hiding it

Each attempt now runs in its own **nested `transaction`**, which drizzle issues
as `SAVEPOINT` / `ROLLBACK TO SAVEPOINT`, so a failed candidate unwinds only
itself and the outer transaction stays usable.

Why no test caught it: the publish fake **threw where it was told to and then
carried on**, so the broken loop passed it perfectly — and there was no
slug-collision test at all. The fake now models the one property of Postgres
that matters here: *a raise aborts its block, and a nested transaction is a
SAVEPOINT that contains the abort.* Two cases use it — base slug taken falls
through to `-2` with both attempts visible in order; every candidate taken gives
a named refusal and never a 500. The second case takes its candidate list from
`candidateSlugsFromTitle` rather than spelling it out, so it keeps exhausting the
ladder if `MAX_NUMBERED_ATTEMPTS` changes.

**The guard was proved able to fail**: removing the savepoint makes the first
test fail with the aborted-block error, which is the production failure exactly.
694 product-module tests pass.

> [!IMPORTANT] This is the third time this rule has cost something
> A `catch` inside an open Postgres transaction is dead code past its first
> firing. Part 68 recorded it for a break-glass migration
> (`CREATE TYPE` / `ADD CONSTRAINT` tolerance needs a transaction **per
> statement**); part 132's `resumeProduct` was written so every refusal lands
> **before** the first write for the same reason. Here it reached production as
> a 500. **If a `catch` inside a transaction is meant to let the work continue,
> the attempt needs its own savepoint — there is no other shape that works.**

## 2. A caution that meant one thing and tested another

The Product Editor's category tooltip has always read **"Still defaulted from
CJ's own category"**. The condition behind it asked something else entirely:
whether a **seller had personally picked** the category — true only when no
`categoryMappingId` sat behind it.

So every product the ADR-014 resolver categorised **correctly** was flagged. That
was survivable while almost nothing was mapped. After part 134 it was not:
mapping coverage went 18.7% → 78.2%, and the red caution followed it onto
hundreds of correctly-filed **LIVE** products.

Reported on a published phone case sitting correctly under `Mobile Phone Cases`,
with `0 Blockers` and `Published`, still showing red. **The message was right all
along; the condition did not match it.**

### The rule now

> The caution belongs to a category that is still CJ's own.

`sals3CategoryDeclaredBySeller` → **`sals3CategoryIsRealTaxonomy`**, computed as
`isSals3TaxonomyCode(categoryCode)` — **the same test the publish gate uses**,
which is why a mirror answers `SALS3_CATEGORY_REQUIRED`. Editor and server now
agree on one rule instead of two, so the caution **predicts a real refusal**
instead of nagging about one that will not happen.

Renamed rather than redefined in place, deliberately: a field called
`DeclaredBySeller` that means "is a real v1 code" is a lie waiting for the next
reader.

### Why the two obvious signals cannot answer this

- **`categoryMappingConfidence`** — the CJ mirror resolves `EXACT`/`ACCEPTABLE`
  too, so confidence says nothing about provenance.
- **the presence of `categoryMappingId`** — both a mirror **and** a reviewed
  crosswalk leave one.

**Only the code prefix distinguishes them.** The guard case is a real v1 code
*with* a mapping row behind it (`CAT-GGL-2353` + `mapping-row-7`), which must
not be flagged.

One incidental finding worth keeping: the new `aria-label` **deliberately avoids
the word *category***, because the picker's own button matches `/category/i` and
a second button carrying that word broke the suite's `openPicker` helper — caught
by the tests, not by reading. 409 editor and projection tests pass.

## 3. Paying about 10 CJ points to learn the gate will refuse it

A draft costs roughly **10 CJ points the moment it is created** —
`captureEvidenceBeforeDraft` runs *before* any category decision is attempted.

The Ready list already refused to let a caller guess whether a candidate had been
drafted, and `alreadyInCatalogue`'s own comment says why:

> a client deciding this from a rendered status label is one Portal redesign away
> from paying for every replay

It said nothing about the **category**. So every run paid for candidates whose
supplier leaf resolves to a CJ mirror, and only then learned the publish gate
refuses them.

### What it had cost, and why it does not drain on its own

Measured at the time (the PR body dates this 2026-09-05, Australian time, against
a 2026-09-04T20:30Z merge): **122 of 146 stranded drafts, roughly 1,220 points.**
All four of their supplier leaves sit in `MIXED_BUCKET_LEAVES` — disabled because
the bucket genuinely holds goods from different departments:

| leaf | screened candidates |
| --- | --- |
| Sports & Outdoors > Sports Accessories | 5,975 |
| Home, Garden & Furniture > Bathroom Storage | 4,197 |
| Home Improvement > Home Appliance Parts | 1,047 |
| Computer & Office > Tablet Accessories | 648 |
| | **11,867** |

**No future mapping rescues any of it** — these are decided refusals, not pending
work (see part 134 §3). Without a guard, every run keeps paying at the same rate
against the same 11,867 candidates.

### The change

`ReadyCandidateRow` now carries **`sals3CategoryCode`** — the v1 code a draft
would actually be filed under, or `null` when the answer would be a
`CJ-<external id>` mirror. `findResolvableSals3CategoryCodes` reads it from the
active mapping in **one query per page**, keyed by **supplier category rather
than by candidate** (a page of 100 rows routinely shares a handful of leaves),
and calls no supplier. The response also carries `categoryUnmapped`, for the same
reason it already carries two counts: a caller sizing a run needs the number
before it spends.

> [!WARNING] "Has an active mapping" is true for precisely the rows to skip
> An **UNMAPPED leaf still has an `ACTIVE` mapping row** — `cj-mirror.ts` writes
> one, pointing at a mirror category it inserts into the same `sals3_categories`
> table. So filtering on status selects the wrong set, in the expensive
> direction. The filter is `isSals3TaxonomyCode`, the same predicate
> `publish.ts` applies — **one predicate, now three consumers**: the publish
> gate, §2's editor caution, and this read. A test pins that a mirror is absent
> though both rows are `ACTIVE`.

Found while writing it: the first cut guarded the id list with `!== null`, and a
row that simply has no `providerCategoryId` key is `undefined`, so an `undefined`
went into the query's `inArray`. A test caught it; the guard is a type test now,
and an empty string is dropped too, because the resolver trims and answers
`PROVIDER_CATEGORY_MISSING` for it.

The consuming half is `sals3-portal-automation` at `491e185`: `find_draftable`
skips a candidate whose `sals3CategoryCode` is null, and the run line reports how
many points were **not** spent. Deliberately **not** a local copy of
`MIXED_BUCKET_LEAVES` — a duplicate of governance state drifts silently, which is
the whole reason the field is served rather than published as a list.

## What was not done

- **The 122 stranded drafts were not cleaned up** by any of these PRs. The guard
  stops new spend; it does not reclaim what was already paid or delete the rows.
- **The ~1,220 points are not recoverable.** There is no refund path and none was
  looked for.
- **No test asserts the caution across a real published row** — §2's guard is a
  projection test with a hand-built code and mapping id, not a live product.
- **CI ran on none of these.** #63 records verification as local only (lint,
  `format:check`, typecheck, 129 catalog + candidate files / 1,397 passed / 2
  skipped) because the org's Actions billing has been failing every job in ~4s
  since 2026-09-04.

## Lessons

- **A `catch` inside an open Postgres transaction is dead code past its first
  firing.** Recognising the error correctly changes nothing; the connection has
  already stopped answering. Give each attempt a savepoint, or move the check in
  front of the write.
- **A test fake that models "throws" but not "poisons" will pass a broken retry
  perfectly.** The fake was not wrong about what it simulated — it simply had no
  opinion about the one property the code depended on. Ask what the real system
  does *after* the failure, not just at it.
- **A parameter in a production log can be a proof.** The `-2` suffix settled
  which of two hypotheses was true before any code was read: the retry fired and
  failed, rather than never firing.
- **A warning that is technically true and universally shown is noise, and
  coverage growth is what converts one into the other.** The caution's copy was
  right for a year and became wrong the day the resolver started succeeding.
- **When a UI predicts a server refusal, it must compute it with the server's own
  predicate.** Two implementations of one question is the repeat defect of this
  codebase; here it was fixed by giving `isSals3TaxonomyCode` its third caller
  rather than its second copy.
- **Serve governance state, never let a client re-derive it.** The automation
  could have hard-coded `MIXED_BUCKET_LEAVES`. It reads the resolved code
  instead, so the day a leaf is re-decided the caller follows without a release.
