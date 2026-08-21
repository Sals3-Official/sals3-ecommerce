---
tags: [session-note, sals3-portal, reviews, schema, migration, break-glass]
aliases:
  - Part 68 - Product Reviews Schema
  - The Purge Edge
created: 2026-08-22
updated: 2026-08-22
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[sals3-session-2026-08-21-part63-order-snapshot-durable-media-and-the-insert-that-names-every-column]]"
  - "[[sals3-session-2026-08-22-part67-the-catalogue-column-that-was-doing-nothing]]"
---

# Part 68 — Product reviews: the schema, and the edge it broke

One merged `sals3-portal` PR, [#174](https://github.com/Sals3-Official/sals3-portal/pull/174),
two commits. Tables and DDL only — **nothing reads or writes either table
yet**, and stopping there was the point.

The owner asked for a full review feature across both repositories,
inspired by a Shopee Seller Center screenshot and explicitly *not* a copy
of it, triggering only once a parcel is `DELIVERED`, with a new sub-item
under Products in the Portal. This note covers the first slice: the design
handoff, the schema decisions, and the one defect the schema introduced
into a production script.

## The owner's rule, and where it actually lives

"Dapat mag-trigger lang ang review sa customer pagka delivered na ang
status ng parcel/order." That sentence has a precise home in this codebase
and it is not the order: `fulfillment_groups.parcel_state`. ADR-008 splits
one checkout into per-provider fulfilment groups and CJ has no
partial-shipment status, so a single order can hold a delivered package, a
package still moving, and a disputed one at the same time. The review
control belongs to the **item**, resolved through its own package.

Two consequences settled before any code:

- **`TRACKING_CONFLICT` does not qualify.** ADR-004 §5 gives that state to
  a carrier "delivered" that CJ disputes. The buyer-facing meaning is *we
  do not yet know this arrived*, so it cannot be the gate for "tell us how
  it was". Treating it as delivered would invite a review of a parcel that
  may never have landed.
- **Eligibility is derived, never stored.** No invitation table, no flag on
  the order line, no cron writing rows when a parcel lands. A second table
  holding "eligible" is a second source of truth able to disagree with the
  parcel it describes, and the parcel is the fact. The cost of this choice
  is that a reminder email has nowhere to hang yet; that is a real cost and
  it was accepted.

## Two indexes carry the whole model

`sals3_product_reviews` is unique on `order_line_id`. That single index is
the abuse model: one purchased line, one review, whatever the quantity.
Not per product — a buyer who ordered the same thing twice has two real
things to say. Not per order — an order carries many items. Not per unit —
quantity 2 on one line is still one line.

`sals3_product_review_replies` is unique on `review_id` **where
`status = 'PUBLISHED'`**, with `reply_version` and `supersedes_id` beside
it. A reply is versioned rather than updated in place, because
[#80](https://github.com/Sals3-Official/sals3-portal/pull/80) shipped the
opposite on pricing overrides: an edit was stored as a delete plus a new
record, which reset the version chain the schema promised and audited every
change as a creation, so the history a dispute would be settled from never
recorded that a replacement had happened. A public reply a seller can be
held to gets the same treatment as a price.

## The Drizzle rule has a boundary, and this is which side of it

Part 63 established that **Drizzle names every column of a schema in an
`INSERT`**, so `migrate-order-line-snapshot.ts` deliberately shipped raw
DDL with no schema change at all — adding `listing_snapshot` to
`schema/orders.ts` would have made order acceptance emit the column and
fail every paid checkout against a database that did not have it.

That rule is easy to over-apply. It is specific to **adding a column to a
table an existing writer already touches**. These are new tables: no
existing query names them, no bare `.select()` expands to them, and
exporting them from `schema/index.ts` changes not one statement any current
code emits. So `schema/reviews.ts`, `drizzle/0028_icy_sally_floyd.sql`, and
the ledger row travelled together, where 0026's could not.

The proof is not the reasoning, it is `order-line-columns.test.ts` — the
`toSQL()` assertion part 63 left behind — staying green. The rule that
still binds is the *deployment* one: the DDL reaches production before the
code that reads it, because [#102](https://github.com/Sals3-Official/sals3-portal/pull/102)
merged the other way round and 404'd the entire Product Catalogue.

## The lock is the hazard, not the tables

Creating a table is cheap. Adding its foreign keys is not. `ALTER TABLE ...
ADD CONSTRAINT ... FOREIGN KEY` takes a `SHARE ROW EXCLUSIVE` lock on the
**referenced** table, and three of the six references point at
`sals3_order_lines`, `sals3_orders`, and `products`. On the order tables
that means checkout acceptance queues behind DDL. The child tables are
empty so Postgres has nothing to scan, but a lock it cannot acquire must
fail fast rather than hold the money path.

So each of the 17 statements runs in **its own** transaction under a 5s
`lock_timeout`. Three separate reasons for that shape, all load-bearing:

1. `SET LOCAL` rather than a session `SET`, because this runs on a pooled
   serverless connection and a session-level timeout would leak onto
   whatever unrelated query reuses that connection next.
2. One transaction per statement rather than one for the run, so a timeout
   partway through leaves every earlier statement applied and the retry
   resumes instead of restarting.
3. **The per-statement transaction is what makes the `duplicate_object`
   tolerance work at all.** `CREATE TYPE` and `ALTER TABLE ... ADD
   CONSTRAINT` have no `IF NOT EXISTS` form, so idempotency comes from
   catching `42710`/`42P07`/`42701`. If all 17 shared one transaction, the
   first already-existing type would abort it and poison every statement
   after — the `catch` has to sit *outside* `db.transaction` for the
   tolerance to mean anything. Easy to write the other way and it would
   have passed every test that only ever runs against a fresh database.

## The defect: a script that documents its own invariant, and lost it

The first commit was green through `npm run verify` twice — locally and
through the pre-push hook — and CI passed. It still shipped a defect, in a
file the change never opened.

`scripts/purge-catalogue-products.mts` carries its correctness argument in
a comment: *"Every RESTRICT edge, innermost first. Omitting any one of
these raises a foreign-key violation rather than cascading."* The new
`sals3_product_reviews.product_id → products` reference with `ON DELETE
restrict` is exactly such an edge, and the script did not know about it. It
would have thrown on `delete from products` and rolled the whole purge
back.

Three things make this worth recording rather than just fixing:

- **`npm run verify` cannot catch it.** No test exercises that script, and
  nothing would until someone ran it.
- **It runs against production**, through `vercel env run -e production`.
  The failure would have landed on a real clean-slate run.
- **It was invisible today and only ever gets worse.** Both tables are
  empty and stay empty until the next slice, so the script works right now.
  It breaks the moment the first review exists — which is precisely when
  nobody would be thinking about a schema change from days earlier.

Found by asking the question `verify` does not: *which existing code path
does a new RESTRICT edge make illegal?* A sweep for `delete from` and
`.delete(...)` over `products`, `seller_accounts`, `sals3_orders`, and
`sals3_order_lines` returned exactly one hit. Fixed in the same PR —
replies then reviews, both before `products`, counted into the audit
payload the script already writes. Reviews are deleted rather than
preserved: a review of a product that no longer exists has nothing left to
be a review of, and the order line keeps the frozen record of what was
actually bought (ADR-007).

The generalisable form: **adding a foreign key is a change to every
existing delete path, not only to the new table.** The reverse of part 63's
lesson, which was about `INSERT`.

## Decisions taken along the way

- **`display_name` stores the already-masked string.** "Hezekiah A." is
  what the buyer consented to at submit time, not their full name reduced
  at read time. Two reasons: a read path cannot leak a surname it was never
  given, and the masking rule is applied once where the choice was made
  instead of being re-derived by every future consumer. `null` means
  anonymous, and no display copy is stored for it, so changing the wording
  never becomes a data migration.
- **`buyer_email` is authorisation data.** Lower-cased (with a `CHECK` to
  keep it that way) and matched exactly as `buyer-read.ts` matches it,
  because it decides who may edit a review. Never projected to the
  storefront or to the Seller Center.
- **`seller_account_id` is resolved from the order, not the product.** The
  fulfilment group's supplier connection is who actually sold the item, and
  the eligibility check already holds that row. Equal to
  `products.steward_seller_account_id` today; stored from the order so that
  if listing stewardship ever transfers, that becomes a decision about this
  column rather than a silent reinterpretation of it.
- **`variant_id` carries no foreign key**, matching
  `sals3_order_lines.variant_id`. A seller may retire a variant and that
  must not be blocked by, or destroy, a review of it. `product_id` *does*
  carry one, because the storefront joins it on every product page.
- **A rating gates nothing.** ADR-010 reserves `products.score` and leaves
  it unwritten; nothing in this module writes to `products`. A rating must
  not become a publication input, an evaluation signal, or a ranking key
  without its own owner decision.
- **A seller can answer a review, never hide one.** `HIDDEN_BY_PLATFORM`
  exists for a holder of `review:moderate` — and **`review:reply` and
  `review:moderate` were already in `PORTAL_PERMISSIONS`**, unused, since
  the permission table was written. ADR-014 puts platform moderation in the
  Admin Portal. Nothing new was added to the permission model.
- **Supplier reviews are not these reviews.** No row can originate from a
  supplier and no supplier call produces one. CJ's `listedNum` and
  `/product/productComments` are evidence about CJ's own marketplace
  (ADR-013 §7, ADR-017), and the storefront's `ratingLine` — deprecated
  precisely because it carried them — stays dead.

## What the design handoff settled, and what it refused

Five artboards on a canvas, matching the Portal's real tokens read out of
`src/app/globals.css` in both repositories rather than eyeballed: the
Seller Center screen with the new rail sub-item under Dropship Catalogue,
the reply pop-out, the order page showing all three gate states side by
side, the buyer form, and the PDP band.

Deliberately **not** transcribed from the screenshot, since the owner asked
for inspiration and not a copy:

- No reward/coin panel for soliciting reviews, and no review-request
  sending. Both are marketplace products Sals3 does not have; the space
  carries a plain statement of the delivered-only rule instead.
- Four disconnected stat numbers became one rating band — average, a
  five-bar CSS distribution, and the three figures that imply an action.
- "Good Rating Rate 93%" became "Delivered items reviewed 23% — not a
  target", because the first reads as a score a seller should chase.
- Star colour is `--color-amber-600` `#9a6200`, an existing token at 4.9:1
  on white. Bronze rather than marketplace orange, which is both accessible
  and visibly not somebody else's palette.

One deliberate absence worth naming: **every review on the PDP is a
verified purchase by construction**, so a per-review "verified" badge would
be noise on every row. The provenance is stated once, in the summary block.

## Verification, and what is not proven

`npm run verify` green locally, again through the pre-push hook, and again
on CI (`verify` pass, 7m49s). Build 23/23 pages. 2,397 unit tests passed
(4 skipped), 79 e2e passed (6 skipped). `npm audit`: 6 moderate, 0 high or
critical. `drizzle-kit check` reports the snapshot consistent.

38 of those tests are new. They pin the ledger constants against the real
migration file and its journal entry, statement-count parity with the
file's own breakpoints, `IF NOT EXISTS` on everything Postgres can guard,
`ON DELETE restrict` on all six foreign keys, the `lock_timeout` before
every statement, `SET LOCAL` rather than a session `SET`, a lock timeout
propagating instead of reporting success, and `401` on both verbs when the
secret is missing, wrong, or unset.

**Not proven:** the DDL has never touched a real database. Local Postgres
was deliberately left alone — a local migration hides the production gap,
which is the standing rule after the 2026-08-18 outage — so every claim
about lock behaviour comes from the statements and Postgres's documented
locking, not from an observed run. The `information_schema` reads and the
DDL are exercised against a recording fake. The first real execution will
be the production one, which is what the `GET`-before-and-after and the
workflow's own `tablesExistAfter` assertion exist to make safe.

**Also worth stating: one local `verify` run failed and was not a
failure.** Running `verify` twice back to back aborted the second e2e with
`http://127.0.0.1:3101 is already used` — the first run's Playwright web
server had not released the port. A local collision, not a test result, and
it is the kind of output that reads as a broken suite if reported without
the cause.

## Still open

- **The production DDL run.** `Reviews Migrate Product Reviews`
  (`workflow_dispatch`), needing repository secret `CRON_SECRET` and
  variable `PORTAL_BASE_URL`. Prove the route deployed first: an
  unauthenticated `GET` answering `401` rather than `404` is the cheap
  proof, per part 63's rule.
- Everything above the schema: the `modules/reviews/` domain, the
  eligibility resolver, the two server actions, the `/reviews` screen and
  its rail sub-item, the storefront submission and read endpoints, the PDP
  band, and star ratings on cards.
- **`aggregateRating` in Product JSON-LD is a separate decision.**
  `ProductSchema.tsx` currently documents its absence with "Sals3 has no
  buyer reviews" — a comment that becomes false the moment the next slice
  ships and must be edited, not left standing. Emitting it is a real
  ADR-016 unlock, and it was scoped out here because Google's current
  review-snippet policy was **not** read in this session. Read it before
  emitting anything.
- Review photos. The R2 pipeline exists and is proven, but a buyer-facing
  write is an abuse surface that needs `review:moderate` wired first.
