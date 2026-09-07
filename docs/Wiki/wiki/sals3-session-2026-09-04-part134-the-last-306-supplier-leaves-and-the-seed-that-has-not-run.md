---
tags: [sals3, session, taxonomy, cj-category-mapping, sals3-portal, data-quality, governance]
aliases:
  - Part 134
  - The Last 306 Supplier Leaves
  - The Seed That Has Not Run
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet]]"
  - "[[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice]]"
  - "[[sals3-session-2026-09-04-part135-a-retry-that-could-never-retry-and-the-points-it-cost]]"
  - "[[hot]]"
---

# Part 134 — the last 306 supplier leaves, and the seed that has not run

> [!NOTE] Provenance
> Written 2026-09-07 after the fact from each pull request's own merged record.
> **§4 is different**: the production seed run, its result object and the absence
> of any later run were read directly from the GitHub Actions API on 2026-09-07,
> not taken from a PR body. Where this note says a number reached production, a
> run log says so.

| PR | Title | Merged |
|---|---|---|
| [#49](https://github.com/anythingsupplies/sals3-portal/pull/49) | feat(taxonomy): map the third tier — 47 more leaves, 7 more mixed buckets | 2026-09-03T20:55:14Z |
| [#59](https://github.com/anythingsupplies/sals3-portal/pull/59) | feat(taxonomy): decide the last 259 supplier leaves, mapping 230 and disabling 29 | 2026-09-04T19:49:05Z |

Two PRs, one file each — `src/modules/catalog/taxonomy/seed-category-mappings.ts`,
`+387` then `+1807`. No DDL, no CJ call, no schema change.

This finishes what [[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet|part 129]]
started. Part 129 fixed the census's sampling bug and took reviewed coverage from
18.7% to 69.0% across two mapping passes. These two passes decide **every leaf
that was left**, and the review is closed.

## 1. The four tiers, and where the pile ended up

| pass | PR | leaves | candidates | coverage |
|---|---|---|---|---|
| first tier | #38 | 22 | 106,068 | 18.7% → 43.2% |
| second tier | #44 | 63 | 111,208 | 43.3% → 69.0% |
| **third tier** | **#49** | **47** | **40,076** | **69.0% → 78.2%** |
| **fourth tier** | **#59** | **259** | **41,619** | closes the review |

The fourth tier splits **230 mapped / 29 disabled as mixed buckets**, plus **6
that cannot be seeded at all** — no unique snapshot name to match on — holding
**32 candidates** between them. The committed table now carries **379 mappings
and 50 mixed buckets**.

Note what the tiers say about the shape of the pile: the third tier is *fewer*
leaves than the second and buys a fifth as much coverage, and the fourth tier is
259 leaves for about the same candidate count as the third. The head of the
distribution went early. What was left at the end was a long tail of small
leaves, each still needing its own decision.

## 2. The rule, unchanged across all four tiers

Twenty fair samples of a leaf's own product names, and then:

> **Map when the exceptions are near misses of the same kind. Refuse when they
> are absurd.**

What the samples kept proving is the finding [[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice|part 126]]
paid for once already: **a CJ leaf's name is close to worthless as evidence.**

Third tier, three leaves named for something they do not hold:

- **`Automobiles > Exterior Parts`** holds no parts at all — rust remover, glass
  polish, a headlight restorer, a paint pen, coating spray. → Vehicle
  Maintenance, Care & Decor.
- **`Men's Clothing > Fedoras`** is knitted hats and caps. → Hats.
- **`Men's Clothing > Man Prescription Glasses`** is entirely sunglasses. →
  Sunglasses.

Fourth tier, more of the same and worse:

- **`Sports & Outdoors > Cycling > Bicycle Frames`** — not one frame. Saddles,
  pedals, a child seat, a wicker basket. → Bicycle Parts.
- **`Kitchen, Dining & Bar > Barware`** — ceramic noodle bowls, seasoning dishes,
  a baking pan, a charcoal barbecue. → Kitchen & Dining.
- **`Cases & Covers > Cases For iPhone 8 & 8 Plus`** — cases for every model
  except that one. → Mobile Phone Cases.

So most rows map to **the node that is honest for the whole leaf**, not the one
its name promises.

## 3. Two kinds of refusal, and neither is a gap

### Mapping to a parent on purpose

Sals3 Taxonomy v1 splits what CJ merged, and for some leaves **no node below is
right for all of it**. Four recorded reasons:

- pet clothing and bedding — v1 has Cat Apparel *and* Dog Apparel, Cat Beds *and*
  Dog Beds, and the CJ leaf is written for both → `Pet Supplies`
- watches — v1 has Watches and Watch Accessories, the leaves hold straps and
  watches together → `Jewelry`
- speakers and headphones — two v1 leaves under Audio, one CJ leaf → `Audio`
- `Essential Oil` — aromatherapy oils, hair oils, facial serums and perfumes,
  which is skin care, hair care, cosmetics and fragrance at once →
  `Personal Care`

### Disabling as a mixed bucket

Fifteen leaves were disabled by the end of the third tier, holding about
**29,000 candidates**; twenty-nine more in the fourth, holding about **3,600**.
They refuse *because* their contents disagree:

- **`Tools Storage`** — a stationery case, a hair-curler bag, a drumstick case,
  an antique box, a golf bag. Not one thing that stores a tool.
- **`Fabric`** — a bathroom mat, a Mexican flag, a thermos cup, a tapestry.
- **`Smart Home Appliances`** — a security camera, a baby milk shaker, a 150db
  siren, a robot vacuum.
- **`Tools > Power Tools`** — a drill, a jack hammer and a circular saw beside a
  dental sander, a wall sconce, a foot massager and a sewer dredger. Eight of
  twenty from other departments.
- **`Tablet & Laptop Accessories > Laptop Batteries`** — four paper notebooks and
  a power adapter. Not one battery.
- **`Fine Jewelry > Various Gemstones`** — a CZ necklace and a turquoise ring,
  plus a toilet cleaning block and two umbrellas.
- **`Weddings & Events > Flower Girl Dresses`** — a dehumidifier, a 20000RPM
  polishing grinder, tea canisters, Christmas stockings.
- **`Skin Care > Face Masks`** — not one skincare mask: a printed scarf, two
  motorcycle balaclavas, a horror party headpiece, a lace wig.

> [!IMPORTANT] The disabled count must not be driven to zero
> #49 states it plainly: *"That number should not be driven to zero — mapping
> them is the mouthwash-under-storage mistake at scale."* A `MIXED_BUCKET_LEAVES`
> entry is a **decision that was made**, not a leaf that was skipped. Anyone
> reading 78.2% as "21.8% still to do" has misread the ledger; a large part of
> the remainder is refusals that are working correctly.

## 4. What actually reached production — and what did not

This is the half a PR body cannot tell you, and the half that matters.

**The third tier is live.** `Taxonomy Seed Category Mappings (write)` run
[33808904358](https://github.com/anythingsupplies/sals3-portal/actions/runs/33808904358)
ran at **2026-09-03T21:37Z** against `https://sals3-portal-prod.vercel.app`,
from `main` at `96e4a0a`, and returned:

```json
{ "ok": true, "seeded": 44, "superseded": 3, "disabled": 2, "alreadyActive": 102 }
```

with 19 further leaves reported `already_disabled`. That is 42 minutes after #49
merged to `develop`, and downstream of its promotion to `main`.

**The fourth tier is not.** #59 merged at 2026-09-04T19:49Z and **no seed run
has happened since 21:37 the previous day**. Its own PR body says so and says
why:

> Merging this does not apply it. Seeding production needs
> `taxonomy-seed-category-mappings.yml` dispatched with `environment: production`
> — and that workflow cannot run while Actions is billing-blocked. **That
> dispatch is still owed**, and until it runs live coverage does not move.

Confirmed on 2026-09-07: every workflow run in that repository since
2026-09-04T21:04 has ended `completed/failure`, consistent with the
Actions-billing block already recorded in this vault. **So the honest statement
of live coverage today is the third tier's, not the fourth's** — the 379-mapping
table exists in code and in `main`, and production is one dispatch behind it.

> [!WARNING] A merged mapping table is not an applied mapping table
> This is the same distinction as *applying DDL and recording that you applied
> it are two separate successes*, one layer up: **committing governance data and
> seeding governance data are two separate successes.** Quote 78.2% as the
> reviewed figure. Do not quote it as the live one until a run says so.

## 5. What the pre-write checks caught

Both PRs run checks before writing a row, and both caught something real.

**Three rows carried a leaf whose candidate-column name is stale** (#49):
`Man Trench` stored as `Basic Jacket`, `Parkas` as `Home Office Storage`,
`Garden Tools` as `Cycling Jerseys`. Every row is written from `snapshotName` —
what the seeder actually matches on — so hand-typing what a review *printed*
would have produced three wrong rows that looked right.

**`Pet Bags` needed a `cjL2Contains` guard**: two snapshot entries share its
Level 1 and its name. Without the disambiguating fragment the seeder refuses the
row as `ambiguous_in_snapshot` rather than guessing — a refusal, correctly, over
a coin flip.

## 6. One recorded limit of the v1 seed file

The v1 seed renders **five level-six `Lip Makeup` leaves with identical paths**.
So `Lipstick` maps to **Makeup** — the deepest code that can be named with
certainty rather than a guess between five indistinguishable rows.

Worth keeping because it is a defect in the *target* taxonomy surfacing as a
shallower mapping, not a weak review. Anyone auditing why lipstick is filed one
level up should read this rather than re-deciding it.

## What was not done

- **The fourth tier was never seeded to production.** One
  `taxonomy-seed-category-mappings.yml` dispatch with `environment: production`
  is owed, and is blocked on Actions billing.
- **Six leaves are not seedable at all** (32 candidates) — no unique snapshot
  name. Nothing was built to reach them.
- **The two production runs that disabled a previously-mapped leaf left products
  behind.** The 21:37 run's own output says it for `Baby Care`:
  *"products already filed under the old code need a category re-check"*. No
  sweep re-checks them; part 126's fourteen re-categorised products were done by
  hand.
- No CI ran on either PR. #59 records verification as local only — `lint`,
  `format:check`, `typecheck`, 20 taxonomy files / 207 tests, 128 catalog files /
  1,391 tests.

## Lessons

- **A merged review table and a live review table are different facts, and only
  a dispatch log tells them apart.** The gap here is 259 leaves wide and has been
  open since 2026-09-04.
- **Refusals are output, not backlog.** 50 mixed buckets is the review working.
  A coverage percentage that treats every unmapped leaf as unfinished work will
  push somebody into mapping `Face Masks` to skincare.
- **Write the row from the field the matcher matches on.** Three rows would have
  been wrong because a review printed a display name and the seeder keys on
  `snapshotName`. The check that caught it compares the two rather than trusting
  either.
- **Refuse the ambiguous rather than resolving it.** `ambiguous_in_snapshot` and
  `MIXED_BUCKET_LEAVES` are the same instinct at two scales — a guess that looks
  like an answer is the expensive failure here, because it ends up printed on a
  live listing.
