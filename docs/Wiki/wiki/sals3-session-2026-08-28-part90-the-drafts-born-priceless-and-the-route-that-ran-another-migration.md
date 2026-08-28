---
tags:
  - sals3
  - sals3-portal
  - catalog
  - pricing
  - drafts
  - audit
  - session-note
aliases:
  - Part 90
  - The Drafts Born Priceless
  - The Route That Ran Another Migration
created: 2026-08-29
updated: 2026-08-29
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-28-part89-the-order-cj-kept-and-the-order-that-lost-its-owner]]"
  - "[[sals3-session-2026-08-28-part91-a-third-market-its-towns-and-the-first-free-shipping-line]]"
---

# Part 90 — the drafts born priceless, and the route that ran another migration

Three `sals3-portal` catalog fixes merged on the morning of 2026-08-28.

- [#214](https://github.com/Sals3-Official/sals3-portal/pull/214) — one answer to
  where a seller may offer, so a draft is never born priceless.
- [#216](https://github.com/Sals3-Official/sals3-portal/pull/216) — the backfill
  route was running the media-position migration.
- [#215](https://github.com/Sals3-Official/sals3-portal/pull/215) — let a seller
  discard a forked draft.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. Merge times are
> GitHub's. The 25 offer-less drafts and the 335 hand-priced offers are counts
> each PR reported from production, not re-measured here.

## 1. One question, two implementations that disagreed

25 drafts had **zero `product_offers` rows**. `updateSellerRetailPrices` is
UPDATE-only, so Save Draft matched nothing, `save-draft.ts` threw
`PricePersistenceError`, and the whole transaction rolled back — **taking the
product name, the specifications and the description down with the price.** Each
of those drafts had cost CJ points to source.

The cause was one question answered in two places:

| | |
|---|---|
| `create-draft.ts` | required an **`ACTIVE` seller market profile** before creating any offer, so `for (const destination of destinations)` ran **zero** times |
| `publish.ts` | did `profile?.destinationCountryCode ?? destinations[0]` — fell back to the platform capability list and created offers regardless |

So a draft could be born offer-less and then **publish perfectly well**, while
nothing in between could price it. The screen that creates a market profile was
removed on 2026-08-20 by owner decision (ADR-014 puts market governance in the
Admin Portal), so **every seller has been in that state since** — this was
happening to every new draft, not a historical accident.

`modules/market-config/offer-destinations.ts` is now the one resolver both paths
call. Two behaviours in it are deliberate and test-pinned:

- **The fallback is one destination, not the whole authorized list** — exactly
  what `publish.ts` already picks. A draft creating six offers per variant where
  publish only ever uses one is five rows per variant that nothing reads, and a
  create/publish pair that disagree about what the product is.
- **A stale profile refuses; no profile falls back.** A seller with an `ACTIVE`
  profile for a destination the platform has since withdrawn *has chosen* where
  they sell, and substituting another market would publish their product
  somewhere they never asked for.

> Collapsing those two states into "no usable profile" is the obvious way to
> write the function, and it would have **silently turned a refusal into a
> publication**. That is why there are two `if`s and not one.

**Deliberately not done: restoring the profile-creation screen.** It is the
actual hole, and rebuilding it reverses an owner decision and contradicts
ADR-014. Making the two readers agree is the repair available without
overturning anything.

The 25 already-created drafts are out of reach of a write-path fix, so
`backfill-draft-offers.ts` and `Products Backfill Draft Offers`
(`POST /api/internal/catalog/products/backfill-draft-offers`) write the missing
rows in the same `UNRESOLVED` / `PRICING_NOT_ATTEMPTED` shape `create-draft`
writes — **through the same resolver**, so the backfill cannot invent a third
answer to the question that caused all of this. No DDL, no CJ call, bounded at
500 variants per run, idempotent, and its `remaining` is counted **after** the
writes from the database rather than from the intent.

Also carried: all three `invalid_input` sites in `product-draft-actions.ts` were
discarding `parsed.error`, so a malformed request was a dead end — a generic
sentence to the seller and no record on the server. They log zod's `path` and
`code` now, never `message` and never the received value, which is the untrusted
payload. And a comment on `market-rules/page.tsx` claiming `publishProduct`
"still refuses `NO_ACTIVE_MARKET_PROFILE`" was **wrong when it was written**;
`publish.ts:429` was read before either the comment or the handover was trusted.

## 2. The endpoint answered 200 and repaired nothing

#214 shipped, was dispatched against production, and **ran the wrong operation.**

`backfill-draft-offers/route.ts` had been written by copying
`migrate-media-position/route.ts` and still imported that module. The endpoint
authorized correctly, answered `200`, applied an idempotent DDL no-op, and the
workflow reported success:

```
--- offerless draft variants before ---
{"ok":true,"columnExists":true}
--- running the backfill ---
{"ok":true,"columnExistedBefore":true,"ddl":{"statementsRun":1},
 "migrationRecord":{"inserted":false},"columnExistsAfter":true}
```

That is the media-position response, from an endpoint named
`backfill-draft-offers`. **No damage** — the operation it ran was
`ADD COLUMN IF NOT EXISTS` against a column that already exists. The 25 drafts
were simply still broken.

**How it got through.** The import replacement was scripted with a plain
`String.replace`, which **matches nothing and says nothing** when the pattern is
wrong — and the pattern was wrong because prettier had reformatted the source
file's import between it being written and being copied from. Every other edit
in that change used a helper that asserts the match count first; this one did
not, and that is the whole story. Nothing else could have caught it: there is no
test per route, and the copy was correct in every respect a compiler or linter
can see. `npm run verify` was green, twice.

The guard is `internal-routes-call-their-own-module.test.ts`: every route under
`src/app/api/internal/` must import the module its own folder is named after.
Deliberately a **wiring** assertion and not a behavioural one — a rule that tried
to be both would need editing every time a route legitimately grew. It found one
legitimate pre-existing exception (`backfill-media-copies` importing
`backfill-supplier-media-copies`), recorded in `SHARES_A_MODULE` with its reason
rather than renamed to satisfy a test, and it asserts it found more than five
routes so an empty walk cannot pass silently. Proven to catch this exact bug by
re-pointing the route at the wrong module and watching it fail.

## 3. A forked draft could not be taken back

Editing a published product forks a `DRAFT` revision and points
`products.current_revision_id` at it. **Nothing retired that fork.** An edit a
seller thought better of stayed the current revision, and the next **Publish
Update** — pressed later for something unrelated — shipped it. The only escape
was retyping the published wording from memory. Recorded as open in part 74;
reachable on every product, because every published product is Live and any
description or name save forks a draft. Buyers were never exposed —
`published_revision_id` is untouched by a fork.

`Discard draft` now sits in the existing "Saved, but not live yet" notice, backed
by `discard-draft-revision.ts`.

**The abandoned draft is frozen, never deleted.**
`product_revisions_frozen_when_settled` admits `SUPERSEDED` only for a row
carrying `content_snapshot` and `frozen_at`, and a `DRAFT` has neither — so the
discard copies the draft's own `content_document` across and freezes it. That
keeps the bytes, so the audit event (`catalog_product_revision.discarded`)
answers *what* was discarded rather than only that something was; **deleting the
row would satisfy the constraint by destroying the evidence.** It also releases
`product_revisions_open_draft_key`, so the next edit can fork again.

Gated on `product:edit`, not `product:publish` — a seller permitted to make an
edit must be permitted to take it back, and the discard changes nothing live.

| Refusal condition | Reason |
|---|---|
| settled / missing / not this product's revision | `version_conflict` |
| version mismatch, re-asserted in the `WHERE` | `version_conflict` |
| not the product's current revision | `version_conflict` |
| lost fork race | `version_conflict` |
| never published | `no_published_revision` |

The last is its own reason on purpose: there the open draft is the *only* copy
and nothing on the seller's screen is stale, so telling them to refresh would be
a lie.

The action returns the restored revision's id **and** version, because the editor
holds both in `useState` — which reads its argument only on mount, so a
`router.refresh()` alone would leave it naming the revision just retired and
refuse every later save. That is the stale-`useState` defect PR #105 already
fixed once on this screen, and it recurs in part 93.

## Lessons

- **A scripted `String.replace` that matches nothing says nothing.** Assert the
  match count, or a "completed" edit is indistinguishable from no edit at all.
  Already recorded from the offer-less draft repair; this is its second cost in
  one day.
- **One question with two implementations will disagree, and the disagreement
  will be silent.** Both #214 and the funding-buffer work in part 94 are the same
  shape: a fact with two homes.
- **Freezing beats deleting when a constraint stands in the way.** Satisfying
  `product_revisions_frozen_when_settled` by removing the row would have thrown
  away the only record of what a seller discarded.
