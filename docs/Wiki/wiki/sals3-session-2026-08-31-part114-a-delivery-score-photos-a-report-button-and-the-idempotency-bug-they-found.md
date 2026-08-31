---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - reviews
  - migrations
  - session-note
aliases:
  - Part 114
  - A Delivery Score, Photos, A Report Button, And The Idempotency Bug They Found
created: 2026-08-31
updated: 2026-08-31
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[drizzle-wraps-pg-error-codes]]"
---

# Part 114 — a delivery score, photos, a report button, and the idempotency bug they found

2026-08-31, `sals3-portal`
[#281](https://github.com/Sals3-Official/sals3-portal/pull/281)/[#282](https://github.com/Sals3-Official/sals3-portal/pull/282)/[#283](https://github.com/Sals3-Official/sals3-portal/pull/283)/[#284](https://github.com/Sals3-Official/sals3-portal/pull/284)/[#285](https://github.com/Sals3-Official/sals3-portal/pull/285)
and `sals3-ecommerce`
[#212](https://github.com/Sals3-Official/sals3-ecommerce/pull/212)/[#213](https://github.com/Sals3-Official/sals3-ecommerce/pull/213),
migration `0035_icy_risque`.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The gap the summary and the list disagreed about (#212, first)

Jay's first review comment: the PDP summary said "No reviews yet" directly
above a review somebody had written. Not bad data — a timing gap. The
product payload carries the review aggregate and the page caches it for 60s
(part 109); the review list itself is read live. A review posted inside that
60s window reaches the list before the summary that counts it, so the two
numbers came from different moments. When they disagree now, the score is
**withheld** rather than printed as zero — an absent aggregate beside a
present review is a number not yet known, not a verdict of nought stars.
Four regression tests, each shown to fail with the guard removed before
being trusted.

## The DDL, alone, ahead of anything that reads it (portal #281)

The first of three PRs for Jay's remaining comments (delivery score, report,
photos) — no behavior, just the objects: `sals3_product_reviews.delivery_rating`
(nullable `smallint`), `sals3_product_review_flags`, `sals3_product_review_photos`.

`delivery_rating` is a column on a table an existing writer already inserts
into. Drizzle names every column of a schema in an `INSERT`, so adding
`deliveryRating` to the schema before the column exists would fail every
buyer review against a database that doesn't have it yet — the exact
mechanism that had already 404'd the Product Catalogue twice before (parts
79, 90). The two new tables would have been safe to declare early on their
own, but a migration whose halves can be applied independently is a
migration somebody applies half of — so all three traveled together as raw
DDL with no schema column, no `drizzle/` file, no ledger row, behind the
strictest object's rule. The reading code arrived with the next PR.

Decisions worth keeping: **`delivery_rating` is nullable and an absent score
is never a zero** — a buyer may score the product and skip the delivery
question, and folding a `NULL` into a nought would invent a courier failure
out of silence. **A report is a request for a look, never an automatic
hide** — `sals3_product_review_flags_reporter_key` caps one report per
signed-in buyer per review, so the count a moderator sees is a count of
people, not of clicks; without it, four accounts belonging to one competitor
erase a rating. **The decision lives on the flag, not only on the review** —
a `..._resolution_stamped` check refuses a resolved flag with no date and an
open one carrying one, so the two halves of a moderation call cannot drift
apart. **Photos are a table, not `jsonb`** — position needs a unique index
to make order a fact, and a moderator must be able to reach one photo
without rewriting the row holding the rest; four per review, enforced in
both a `CHECK` and the writer.

Applied through **Reviews Migrate Review Extras** (`workflow_dispatch`,
`CRON_SECRET`), each statement in its own transaction with a 5s
`lock_timeout` so a lock it cannot get aborts rather than queuing the
product page behind DDL.

## The behavior: delivery scored apart, a queue nobody can misuse (portal #282)

Delivery is now a second score with its own denominator —
`count(delivery_rating)`, not `count(*)`, so a product carrying forty
reviews and six delivery scores reports six's average as the delivery
figure, and answers `null`, never `0.0`, when nobody has answered. The point
of the split: a buyer who waited three weeks for a good product used to rate
the product one star, and the listing carried a courier's failure forever.
Apart, a low delivery score beside a high product score points a seller at
their shipping tier instead of their listing.

`flagReview` never touches `productReviews.status`, and no report count
triggers anything automatically — the moderation queue lives at
`/reviews/reported` behind `review:moderate`, a permission that already
existed and that **no seller role holds**. ADR-014 puts platform moderation
in the Admin Portal, which is sign-in-and-shell only today — a queue placed
there would be a queue nobody could open, so it stays in this repository
until that changes; the permission is what enforces ADR-014's substance (a
seller must never hide criticism of their own listing) regardless of which
repository the page lives in. The queue is deliberately not tenant-scoped
(a moderator works across sellers) and ordered oldest-first, so volume
cannot jump ahead. `hide` writes the status and closes the reports in one
transaction; `keep` closes the reports and changes nothing else, because a
decision that leaves no trace is indistinguishable from an unread queue.

Photos: `POST /reviews` returns an id, then `POST /reviews/[id]/photos`
carries one file each — not folded into the submission body, because the
platform caps a serverless request body at 4.5MB and four photos at this
repository's 5MB-per-file ceiling is several times that limit on its own.
Review-first ordering means a failure partway through leaves a real review
carrying two of its four photos rather than a staged upload nobody can find
or a failed submission that already spent storage. Photos go through
`prepareUploadedImage` — the same magic-byte check, dimension ceiling and
WebP re-encode every seller upload uses, earning more scrutiny here than for
a seller, since what lands in the bucket is server-produced rather than a
file an anonymous member of the public named directly.

## The idempotency bug the second production run exposed (portal #283, #284)

The **second** production run of the review-extras migration answered 500,
found while re-running it to record the `0035` ledger row (the DDL had
shipped alone in #281, so nothing pointed at a migration file when it ran).

Drizzle wraps every driver error in a `DrizzleQueryError` and hangs the
original off `.cause`, so `error.code` on the thrown object is always
`undefined`. The first run passed because nothing threw — every object was
new. The second raised `duplicate_object` on both `CREATE TYPE`s and all
three `ADD CONSTRAINT`s (Postgres has no `IF NOT EXISTS` for either), the
naive check matched none of them, and every one was rethrown. Confirmed
against a real database rather than assumed: `name: DrizzleQueryError`,
`.code: undefined`, `.cause.code: 42710`.

`lib/db/constraint-errors.ts` had already documented this exact trap and
walked the cause chain — its own comment says the walk "is not defensive
padding; it is the only reason this works." Nothing in the review modules
used it, which meant the same naive check was also deciding whether a
double-submitted review answers "you have already reviewed this item" or a
500 — live since reviews shipped, in `repository.ts`.

`postgresErrorCode` and `isUniqueViolation` now live beside
`uniqueViolationConstraint`, sharing its bounded, cycle-safe walk. Four call
sites read from it: the migration's own duplicate-object tolerance, and the
unique-violation branches in `repository.ts`, `flag-review.ts` and
`attach-review-photo.ts`. The migration's test suite gained a case built
from the wrapped shape production actually throws — reverting
`isAlreadyExistsError` fails all six new cases.

**Not fixed, and named as owed:** `migrate-product-reviews.ts` and
`migrate-attribute-controls.ts` carried the identical naive check and the
identical untested "safe to run twice" claim. Neither had ever been re-run
against a migrated database, so neither had ever demonstrated the claim.
#284 fixes both — same `postgresErrorCode` walk, and each module's existing
"already exists" test rebuilt from the wrapped shape rather than the bare
one that let the defect through review twice. Pinned by reverting the fix:
all six new cases fail. Two negative cases (a wrapped `55P03` lock timeout,
a wrapped `40P01` deadlock) confirm the walk widens what's tolerated and not
what's swallowed. **Still owed after merge:** dispatch `Reviews Migrate
Product Reviews` and `Taxonomy Migrate Attribute Controls` a second time
against production and confirm each reports statements skipped — an
idempotency claim exercised only once is not one.

## The reply that needed a second reload (portal #285)

Owner report, screenshot of `/reviews`: replied to a review, the dialog
closed, the row still said "No reply yet" until a manual page reload.
`router.refresh()` asks Next to re-fetch server data with no promise of
*when* that finishes, and the seller's own screen looked back at exactly the
moment it hadn't yet — `replyToReviewAction` already confirms the write and
hands back the version it wrote, so there was no reason to wait on a second
round trip to say the same thing. `ReviewList` now keeps a local reply
overlay set the instant the action returns `ok: true`, reconciled by
version once a fresh `reviews` prop carries a reply at that version or
later. Same **"compare during render, adjust"** shape `ProductCatalogueWorkspace`
already used in this repository for the identical class of bug (see part
105's `useState(initialProducts)` lesson) — not a new pattern.

`ModerationDecisionButtons`, built earlier the same session for the queue in
#282, had an even plainer version of the same gap: no `router.refresh()` at
all, entirely dependent on `revalidatePath`. Same root cause, same fix — a
new `ReportedReviewsList` wrapper hides a review the instant its own
decision succeeds. Both regressions were proved by reverting the fix and
watching the new tests fail against the old code before committing.

## The storefront side (ecommerce #213)

The portal API and its DDL were already on production when this landed.
Delivery scoring, absent-not-zero, and the summary's own denominator
(`from 6 of 20 who answered`) all mirror the portal side. The subtle bit:
`z.coerce.number()` turns `''` into `0`, so `reviewItemSchema` drops the
empty case **before** coercion — afterward the two are indistinguishable,
and a zero reaching the portal would fail its `CHECK` and cost the whole
review. Radios cannot be un-chosen, so both forms carry a Clear control
beside the delivery stars; without one, a mis-tap becomes a permanent score
against a courier.

Photos ride the same one-per-request pattern as the portal, with a photo
failure reported honestly: "Your review is posted, but a photo did not
attach" — saying nothing would leave the buyer looking for pictures that
never arrived, and calling it a failed review would invite a second attempt
the portal refuses (one review per purchased line). Photos and the report
control are single-review-page only; the delivery score is on both surfaces.

Reporting is a ghost link that opens to five closed reasons, no free text —
an unmoderated string on a public object reachable by anyone signed in would
be its own risk — and requires sign-in, since an anonymous report costs
nothing to repeat and the portal's one-report-per-person index needs an
identity to key on. The receipt reads "Reported. Someone will look at this,"
never "removed."

Two things worth a second look, named in the PR itself: `vitest.config.mts`
now aliases `server-only`, because the real package resolves to its browser
entry under `jsdom` — every product-page test had been failing on that guard
rather than on the component being tested, once the report action started
reading the buyer session through `lib/auth/dal`. And the flag reasons live
in `lib/reviews/flag-reasons.ts` rather than the service module, because the
report control is a client component and importing the storefront service
layer for five strings would drag the HTTP boundary and its API token into
the browser bundle.

## Verification

Portal #281: 3557 unit / 326 files, 65 e2e. #282: 3587 / 329, 65 e2e. #283:
3599 / 329, 65 e2e. #284: full `npm run verify` green in an isolated
worktree — lint, format, typecheck, build, unit, 65 e2e. #285: 3607 / 331,
65 e2e. Ecommerce #212: 1120 unit / 110 files, 63 e2e. #213: 1150 / 111, 63
e2e.

## What was not done

The idempotency fix does not extend to every break-glass migration in the
codebase — only the two named. `target_margin_rate`'s own idempotency claim
and any other migration script sharing the naive `error.code` read are
unaudited. The reporting flow has no rate limit beyond the one-report-per-
person unique index.

## Lessons

- **Drizzle hides the real Postgres error code, and every naive `error.code`
  check is dead code until it's fixed.** `error.code` is always `undefined`
  on the object Drizzle throws; the SQLSTATE lives on `.cause`. This cost a
  production 500 the first time it was found (part 55) and a second one
  here, in two more modules nobody had re-run twice before this session.
- **An idempotency claim exercised once is not an idempotency claim.** Two
  break-glass migrations documented themselves as safe to re-run and had
  never been re-run; both failed their very first re-run, on their very
  first statement.
- **A test built from a bare, hand-assembled error shape does not test the
  real failure mode.** Every "already exists" test before this session
  built `Object.assign(new Error(), { code })` — a shape the driver never
  actually produces — which is precisely how the defect passed review twice.
- **The same "compare during render, adjust" gap can ship twice in one
  session under two different names.** A review reply and a moderation
  decision had the identical missing-reconciliation bug, built by the same
  author in the same sitting, because neither component compared its
  incoming prop against local state before rendering.
