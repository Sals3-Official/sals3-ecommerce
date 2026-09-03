---
tags: [sals3, session, taxonomy, cj-category-mapping, sals3-portal, data-quality]
aliases:
  - Part 129
  - Coverage Jumps From 19 To 69 Percent
  - The Census Stopped Being The Alphabet
created: 2026-09-04
updated: 2026-09-04
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice]]"
  - "[[hot]]"
---

# Part 129 — coverage jumps from 18.7% to 69.0%, once the census stopped being the alphabet

> [!NOTE] Provenance
> Written 2026-09-04, after the fact, from `anythingsupplies/sals3-portal`
> PR #36, #38, #39 and #44's own merged record (bodies, commit messages,
> merge timestamps). No new testing was performed to produce this note.

| PR | Title | Merged |
|---|---|---|
| [#36](https://github.com/anythingsupplies/sals3-portal/pull/36) | fix(taxonomy): the census sample was the alphabet, not the bucket | 2026-09-03T17:06:03Z |
| [#38](https://github.com/anythingsupplies/sals3-portal/pull/38) | feat(taxonomy): map the twenty-two biggest supplier leaves, disable four proved mixed | 2026-09-03T17:35:52Z |
| [#39](https://github.com/anythingsupplies/sals3-portal/pull/39) | docs(taxonomy): record the two leaves reviewed and deliberately left undecided | 2026-09-03T17:56:22Z |
| [#44](https://github.com/anythingsupplies/sals3-portal/pull/44) | feat(taxonomy): map the second tier of supplier leaves, and fix the census fragmenting them | 2026-09-04T19:20:01Z |

No DDL in any of these four. This continues the mapping work
[[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice|part 126]]
started, on `anythingsupplies` numbering — the same day the org migration
made that the correct numbering to cite (see
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]).

## 1. The sample that read like evidence and was the alphabet (#36)

`array_agg(DISTINCT name)` **sorts** as part of how Postgres implements
`DISTINCT` inside an aggregate. Slicing the first twelve names off that array
therefore returned the twelve alphabetically smallest names in a leaf, never
a sample of anything. Every leaf in the first production census came back
described by names starting with digits — `1 Bracelet…`, `100 Kinds Of…`,
`2026 New…`.

It surfaced on `Blazers` — 8,527 candidates, whose twelve "samples" held
**zero blazers** (a wool sweater, a corset, a belt, a starry-night-print
belt…). Read at face value, the leaf looks like a mixed bucket to disable;
a biased sample cannot actually answer whether it is one, and both wrong
answers are expensive — disabling wrongly blocks 8,527 candidates, mapping
wrongly files corsets as blazers. No decision could honestly be made from
the census as it stood.

Fixed by ordering on `md5(candidate_evaluations.id)` instead of `random()` —
a hash of the row's own id, so the sample is stable and a decision made
against one census stays checkable against the next. Sample size raised
12 → 20.

**Proved against real Postgres, not by reading the code**: `tsc` and all
eleven existing unit tests passed the broken version, because the defect
lived entirely in what Postgres does with `DISTINCT` inside an aggregate — no
type check or mock can see that. A 40-row fixture (20 digit-first, 20
letter-first names) showed `array_agg(distinct name)` returning **0 of 20**
letter-first names in a sample, against **10 of 20** for the fixed ordering —
exactly the fixture's 50/50 split.

Production numbers this census produces, unchanged by the fix itself: 432,654
screened candidates across 473 supplier leaves; 351,599 (81.3%) sit behind a
leaf with no reviewed mapping.

## 2. Twenty-two leaves mapped, four refused, from the fixed census (#38)

Ranked biggest-leaf-first off the corrected census, 22 leaves were mapped,
carrying 106,068 candidates — mapped coverage **18.7% → 43.2%**. Every row
was decided from twenty of the leaf's own product names, never its name; a
number worth not confusing with the 18.7%-of-pile figure is that roughly 57%
of a 200-item batch publishes directly, because a batch draws in feed order
and feed order favours the big mapped leaves already.

Four leaves were read and **refused** for exactly the reason #36 fixed:

- `Blazers` (8,527) — women's tops (sixteen of twenty names), not blazers.
- `Suits & Blazer` (6,586) — men's jackets and knitwear mixed, roughly half
  and half.
- `Fashion Backpacks` (4,386) — spans two departments (Luggage & Bags vs.
  Apparel Handbags) with no single correct code.
- `Storage Bottles & Jars` (3,525) — named for storage, holds vases,
  flowerpots, a horse statue, a piggy bank.

Two v1 leaf nodes (`Apparel & Accessories > Shoes`, `Clothing > Shirts &
Tops`) were confirmed to have no finer child in v1 before being used —
checked, not assumed, since v1 has no separate Sandals/Slippers/Sweaters
node. A category-code shape guard was tightened at the same time: the
previous check accepted `CAT-GGL-1911` as readily as the real
`CAT-GGL-191` — not a refusal, a silent permanent misfile — and is now
checked against the actual v1 seed file, proved by injecting that exact typo
and watching it fail, then reverting it.

Two leaves — `Skirts` (7,970, three-quarters skirts/one-quarter dresses) and
`Home Storage > Furniture` (4,675, four-fifths furniture with absurd
exceptions: a noodle press, a car antenna cover) — were read and
**deliberately left undecided** rather than forced either way.

## 3. Writing down "reviewed, undecided" as its own fact (#39)

The `Skirts`/`Furniture` non-decision from #38 lived only in a commit
message — and *absent from every list* is indistinguishable from *nobody has
looked yet*, which matters most for a leaf literally named `Skirts`, where
the temptation is to map it to Skirts anyway. `REVIEWED_UNDECIDED_LEAVES` now
records both, with their candidate counts attached so a future decision to
accept the near-miss has its price written down, and a test forbids either
leaf from also appearing in `MIXED_BUCKET_LEAVES` or as a reviewed mapping.
The list writes nothing to the database and is never passed to the seeder.

The same PR also restored SIT deployability: `867f38f` on `develop` had been
blocked by Vercel because `gh` was authenticated with two accounts and the
**active** one was `louieboi09`, attributing the squash commit to
`louienellgonzales@gmail.com` — not a Vercel-recognized identity. Fixed by
switching the active account to `anythingsupplies` before this commit. See
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]] §1
for why this is now a standing checklist item, not a one-off fix.

## 4. Second tier: 63 more leaves, and the defect that had been shrinking the census (#44)

63 more reviewed mappings and 4 more disables, carrying 111,208 candidates —
mapped coverage **43.3% → 69.0%**. The rule made explicit this pass: **map
when the sample's exceptions are near misses of the same kind; refuse when
they are absurd.** The two leaves held back in #39 prove the rule works both
directions — `Skirts` (near-miss dresses) is now mapped; `Home Storage >
Furniture` (absurd exceptions) is now disabled. Both sat at roughly the same
percentage; only the *kind* of exception differed, and that is the test that
actually matches what the owner reacted to when a mouthwash-holding leaf
turned out to be named Bathroom Storage.

A second defect surfaced by this same review: the census grouped by
`(provider category id, candidate name)` rather than by id alone, so a leaf
**fragmented** into multiple rows whenever some of its candidates carried a
stale `provider_category_name` — `Baby Clothing Sets` came back as three
separate rows under one id. Measured on production: **38 of 473 rows were
fragments**, meaning every affected leaf's count read slightly low and the
leaf list read slightly long. Fixed by grouping on the id alone, with
`nameVariants` now served so a stale column is visible instead of silently
wrong — the same reasoning behind always trusting `snapshotName` over
`cjName`, since `Home Office Storage` in the candidate column reads as
`Curtains`, `Car Stickers`, and `Eyeshadow` depending on the row.

## What was not done

- No DDL, in any of the four PRs.
- The remaining ~31% of the 432,654-candidate pile is still unmapped;
  nothing here claims full coverage.
- No change to `MIXED_BUCKET_LEAVES` disable semantics — deleting or
  superseding a bad mapping is [[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice|part 126]]'s
  fix, unchanged here.

## Lessons

- **A biased sample reads exactly like evidence.** `array_agg(DISTINCT …)`
  silently sorting inside an aggregate produced a census that looked
  authoritative and was systematically wrong in one direction — the same
  shape of failure as [[array-agg-distinct-biases-the-sample]], now with a
  second confirmed instance in this codebase.
- **Type checks and unit tests cannot see a defect that lives entirely in
  what the database does with a query.** Eleven passing unit tests and a
  clean `tsc` both shipped the broken sample; only a real-Postgres fixture
  proved it.
- **"Near miss vs. absurd" is a better test than a percentage threshold** for
  deciding whether a bucket's contents agree with its label — two leaves at
  the same rough percentage were correctly decided in opposite directions by
  asking what kind of exception each one held.
