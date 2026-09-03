---
tags:
  - sals3
  - sals3-portal
  - taxonomy
  - cj-dropshipping
  - category-mapping
  - data-quality
  - governance
  - session-note
aliases:
  - Part 126
  - A CJ Leaf's Name Is Not Its Contents, Twice
  - The Bathroom Storage Mouthwash Incident
created: 2026-09-03
updated: 2026-09-03
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
---

# Part 126 — a CJ leaf's name is not its contents, twice

2026-09-02/03, `sals3-portal`
[#19](https://github.com/anythingsupplies/sals3-portal/pull/19)/[#23](https://github.com/anythingsupplies/sals3-portal/pull/23)/[#29](https://github.com/anythingsupplies/sals3-portal/pull/29)/[#33](https://github.com/anythingsupplies/sals3-portal/pull/33),
no DDL in any of the four.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Zero reviewed mappings existed in production (#19)

A 2,000-row sample of the Ready pile spanned 21 distinct CJ supplier leaves,
and **not one** had a reviewed Sals3-category mapping — not even the common
case (Lady Dresses). Without one, resolver-first drafting stops at an
auto-created CJ-mirror category on nearly every candidate, and every quick
publish needs a human to pick a category by hand.

`seed-category-mappings.ts` seeds 19 reviewed CJ-leaf → `CAT-GGL-<id>`
mappings, written in code with the reasoning for each decision beside it.
Deliberately **absent**: generic supplier buckets whose contents visibly mix
several real categories — Sports Accessories, Pet Toy Set, Furniture, Home
Appliance Parts, Event & Party Supplies — left as per-item human picks on
purpose, because one leaf-level mapping would mislabel whichever part of the
mix it does not match.

The seeder walks the real governance flow end to end (propose →
approve-and-activate), so versioning, supersede handling, remap-review
summaries and audit events all fire the same as a human-driven mapping
decision would. External category ids are matched against the discovery
cycle's own category snapshot — never guessed, never a fresh CJ call —
refused outright when absent or ambiguous. Shipped as a
`CRON_SECRET`-bearer break-glass endpoint
(`POST /api/internal/catalog/taxonomy/seed-category-mappings`), the same
pattern as the earlier `correct-attribute-controls` endpoint, run per
environment in order: SIT first, then UAT and Production after promotion.

## The seeder's idempotence check was checking the wrong thing (#23)

Using #19 for real on production found the defect: the seeder treated **any
active mapping at all** as "already done" and skipped the row. But the
mapping already sitting on most supplier categories is not a human decision
— it is the **CJ mirror**, minted automatically the first time a candidate
in that category was ever drafted (`cj-mirror.ts`). A mirror is exactly what
the publish gate refuses and exactly what the reviewed table exists to
replace. So the run reported success while silently skipping every category
the pipeline had already touched: Lady Dresses, Silicone Cases and Stuffed &
Plush Animals all kept handing back fresh mirror categories on production,
minutes after the seeder called them `already_active`.

Fixed by comparing the active mapping's own category **code** against the
seeded target, not merely checking that a mapping exists:

- equal → genuinely `already_active`, no write — the real idempotence rule;
- anything else (a mirror, or a stale earlier human pick) → **superseded**
  through the same governance flow, at the version actually read, which
  correctly raises its own remap-review summary for any product already
  filed under the old code.

## The Bathroom Storage incident (#29)

The owner found a bottle of mouthwash filed under **Storage & Organization**
on the live storefront. Cause: #23's seed table had mapped the CJ leaf
`Bathroom Storage` to `CAT-GGL-636` — a name-only judgment. CJ actually
files personal care in that leaf, so **twelve LIVE products** ended up
mis-shelved: mouthwash, toothpaste, shampoo, body lotion, foot-bath beads, a
tile cleaner, an electric toothbrush, alongside a couple of genuine bath
mats.

**Deleting the bad seed row would have fixed nothing** — the mapping it
produced was already active and would keep resolving exactly as before.
Instead this adds `MIXED_BUCKET_LEAVES`: a list of leaves that actively
**supersede** themselves with an `AMBIGUOUS` mapping, which by database
check constraint names no real category at all. A candidate under an
`AMBIGUOUS` mapping falls back to the supplier mirror the publish gate
refuses — a named refusal and a real per-item category from a person, which
is the correct outcome for a bucket whose own contents disagree with each
other. Mapping the leaf to a parent category instead was considered and
rejected: `Health & Beauty` and `Storage & Organization` are each wrong for
roughly half of `Bathroom Storage`'s real contents.

The PR also lists, by name, every other leaf that was already correctly
**refused** rather than mapped by its name during #19's original review —
so nobody re-investigates them later thinking they were overlooked:

| Leaf | What was actually inside it |
|---|---|
| Sports Accessories | a treadmill, an elliptical, a weighted vest, a bowling ball, a volleyball, a golf clip, an alpenstock, sweatbands |
| Pet Toy Set | toys, a costume, a bandana, wet wipes |
| Home Appliance Parts | a holographic projector, a heat-transfer press, a space heater, a hair dryer, an electric fireplace |
| Tablet Accessories | a gaming mouse, an ARGB fan, a motherboard, a keyboard, a headset, a screen protector |

`Bathroom Storage` had been mapped anyway — the one bucket whose name
sounded specific enough to skip reading its contents, in the same review
pass that correctly refused four others for exactly that reason.

**Not fixed in this PR, tracked as a live follow-up**: the twelve already-
live products still carry the wrong category and are being re-categorised
by hand against their real leaves (mouthwash → Mouthwash, shampoo → Shampoo
& Conditioner, and so on).

## Making the evidence reachable, and the decision appliable (#33)

Two things stood between "map by contents, not by name" being a stated rule
and it actually happening every time. This PR removes both.

**The evidence was not reachable in the environment that matters.**
Production is reachable only through the API — there was no way to *look*
at a leaf's contents before deciding its mapping.
`GET /api/internal/catalog/taxonomy/leaf-census` now serves every screened
(`PASS`) supplier leaf with its candidate count and share of the pile, its
CJ Level 1/Level 2 (resolved from the discovery cycle's own category
snapshot), **twelve of its own product names as evidence**, its current
governance state (`mapped`/`disabled`/`mirror`/`unmapped`), and two fields
that would otherwise have silently broken the whole exercise:
`snapshotName` and `snapshotDuplicates`. The seeder's own `seedOne` matches
a seed row against the **snapshot's** `categoryName`, not the candidate
column — two strings filled independently by two different CJ calls, free
to disagree — so a seed row written from the candidate's own spelling
matches nothing and reads like the leaf left CJ, when it was only a
spelling mismatch. `snapshotDuplicates` counts the seeder's other silent
refusal condition (`ambiguous_in_snapshot`) on the same key it filters on.

Ordered by count, roughly 43% of a 200-item batch still stops at a leaf
with no real mapping — nineteen leaves are mapped by hand, and the census
puts the highest-volume unmapped leaves at the top of the list.

**The decided mapping could not be written down.** The seed endpoint has
existed since #19, and the only way it was ever reached was a signed-in
browser session pointed at each environment in turn — the automation
profile's session cookie does not survive Chrome closing, so a mapping
decision could be made and then simply not applied. A `taxonomy-seed-
category-mappings.yml` GitHub Actions workflow now reaches the same
endpoint the way its sibling break-glass workflows do, with two hardening
details: a refused seed row (`not_in_snapshot`, `ambiguous_in_snapshot`)
**fails the run** even though the endpoint itself answers `200` for it —
those are correct, reviewed refusals, but a dispatch that leaves rows
unapplied must not read as green — and the target environment is a GitHub
Actions `choice` input, not free text, because these workflows send
`CRON_SECRET` in an Authorization header and a free-text host field would be
a way to post that secret to an arbitrary destination.

## What was not done

The twelve mis-shelved live products from the Bathroom Storage incident are
a manual re-categorisation follow-up, not covered by any of these four PRs.
Roughly 43% of candidates still resolve to no real mapping at all — the
census makes that visible and orderable, it does not close it.

## Lessons

- **A supplier category's name is evidence about the supplier's own
  filing habits, not about what is actually inside it.** `Bathroom Storage`
  cost twelve live products; the review pass that mapped it had, in the same
  sitting, correctly refused four other buckets for the identical reason —
  the one that sounded specific was the one that got skipped.
- **Deleting a bad mapping row does not undo the mapping.** Once a
  category resolution has been made active, removing the row that produced
  it changes nothing already resolving through it — the correct fix is to
  supersede it with an explicit new decision through the same governance
  path, never a delete.
- **A workflow dispatch that returns `200` for a correctly-refused row and
  a workflow dispatch that silently leaves rows unapplied must not look the
  same in CI.** A refusal is data; an unfulfilled write is a failure, and
  conflating them is how a fully green run can still leave the actual
  mapping undone.
- **Two independently-collected strings describing "the same" category
  are free to disagree**, and a seed matched against the wrong one of the
  two fails silently in a way that reads as "the category left CJ" rather
  than "two calls spelled it differently."
