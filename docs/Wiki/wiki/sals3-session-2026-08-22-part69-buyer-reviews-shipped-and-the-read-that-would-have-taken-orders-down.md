---
tags:
  - session-note
  - sals3-portal
  - sals3-ecommerce
  - reviews
  - verification
  - due-diligence
aliases:
  - Part 69 - Buyer Reviews Shipped
  - The Read That Would Have Taken Orders Down
created: 2026-08-22
updated: 2026-08-22
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[sals3-session-2026-08-22-part68-product-reviews-schema-and-the-purge-edge]]"
  - "[[sals3-session-2026-08-21-part63-order-snapshot-durable-media-and-the-insert-that-names-every-column]]"
---

# Part 69 — Buyer reviews shipped, and the read that would have taken order history down

Two merged PRs, one per repository: `sals3-portal`
[#176](https://github.com/Sals3-Official/sals3-portal/pull/176) (`8aac826`) and
`sals3-ecommerce` [#150](https://github.com/Sals3-Official/sals3-ecommerce/pull/150)
(`9fa4f09`). Part 68 built the tables; this is everything above them.

**The tables still do not exist in production.** `Reviews Migrate Product
Reviews` has not been run. Nothing in either repository has rendered a real
review row, and both deploys are safe in that state — which is the subject of
half this note.

## What a seller and a buyer now have

Seller Center gains **Product Reviews** under Dropship Catalogue, gated on
`review:reply`. Rating band (average, five-bar distribution, three actionable
numbers), star toggle chips, reply-state segmented control, SQL search, and a
reply pop-out. Filters, paging and search live in the URL.

Storefront gains stars on cards, a **Ratings and reviews** section on the PDP, a
**Write a review** link on each delivered order line of the order *detail* page,
and the form at `/orders/[orderNumber]/review/[lineId]`.

## The owner's rule, and the four states it produces

"Dapat mag-trigger lang ang review sa customer pagka delivered na ang status ng
parcel/order." Resolved as `fulfillment_groups.parcel_state = 'DELIVERED'` for
**the item's own package** — ADR-008 splits one checkout per provider and CJ has
no partial-shipment status, so one order can hold a delivered package beside one
still moving.

`TRACKING_CONFLICT` is excluded. ADR-004 §5 gives that state to a carrier
"delivered" the supplier disputes, so its buyer-facing meaning is *we do not yet
know this arrived*.

The control therefore has **four** states, not a button and a disabled button:
the link; the buyer's own rating once written; "you can review this after it is
delivered"; and "reviews for this item are closed". A control that is present
but dead tells nobody why, and a not-yet-delivered parcel and a closed window
are not the same news.

`parcelDelivered` is passed to that component **only to choose the wording** for
the absent case. It never grants the link — a delivered parcel whose line is not
`reviewable` still gets none. That is precisely what makes the closed-window
state safe to distinguish from the moving-parcel one, and it is pinned by a test
that asserts the link never appears on the strength of the parcel alone.

## Two mid-build corrections worth keeping

### The wire carries a choice, not a name

The first cut sent `attribution: {kind: 'named', displayName: 'Hezekiah A.'}`.
That is a way to publish **any** name against **any** purchase, and no amount of
validation repairs it: the value is still caller-supplied.

So the wire now carries `named` or `anonymous` and nothing else, and the portal
derives the published string from the order's **own checkout ship-to name**,
masked. `resolveReviewableLine` joins `checkout_intents` for it, which costs
nothing because the join was already there for the parcel state.

The alternative that was rejected: widening `BuyerSession` to carry a display
name. It returns a uid and an email on purpose — its own comment says returning
less "keeps the surface honest" — and trading a documented security boundary for
a form label is a bad trade. `lib/orders/buyer-name.ts` exists on the storefront
only to *preview* what the buyer's choice will look like, and says so in its own
doc: the portal's value is authoritative, so a drift is a cosmetic bug on one
form rather than a wrong name on a published review.

### `ratingLine` stopped being a non-claim

`ratingLine` shipped as the string `"No reviews yet"` because the consumer's Zod
schema demands a non-empty string and there was nothing true to put in it. Now
there is. Leaving it fixed would have shipped `rating.average: 4.6` beside
`ratingLine: "No reviews yet"` **in one payload**, and either half could be
quoted as current — the same self-contradiction part 61 recorded in this very
cache. It is now derived from `rating`. Cache keys bumped: feed `v2`→`v3`,
product `v4`→`v5`.

## The defect that mattered, found only because the merge was checked

Everything below was green — `npm run verify` twice locally, twice through the
pre-push hook, and CI on both repositories — before the pre-merge pass found it.

**`buyer-read.ts` queried `sals3_product_reviews` on every buyer order read,
unguarded.** In production `sals3_orders` and `sals3_order_lines` exist and
`sals3_product_reviews` does not, so `42P01` would have 503'd
`GET /api/storefront/orders` and `/orders/{orderNumber}`: **order history down
for every buyer who has ever paid.** The PR #102 failure shape, moved onto the
money path.

Three things about how it hid:

1. **The local database has none of those tables.** Not the review tables and
   not the order tables — it is an empty development database. So no local run
   could have exercised the query at all, and the suite's silence was silence
   about nothing. Confirmed by probing `information_schema` rather than
   assuming.
2. **The DDL reaches production through a `workflow_dispatch`, not a deploy.**
   That is deliberate (`scripts/guard-remote-db.mts` refuses any non-local
   target), and it means there is always a real window in which the code exists
   and its tables do not. Any new read has to survive that window or the
   ordering rule has to be enforced by something stronger than a PR body.
3. **`verify` had nothing to say.** No lint rule, no type, no test. The only
   thing that would have caught it is the question the suite never asks: *what
   does this new query make fragile that was not fragile before?*

The fix is one narrow catch at that one call site. An order page is a receipt: a
buyer who has paid is entitled to read what they bought, what it cost and where
it is, and none of that depends on whether they can also leave a star. The
controls disappear; the order does not. `buyer-read.reviews.test.ts` pins it
against a missing relation, a timeout and a drifted column list, and asserts the
amounts, tracking and ship-to all survive.

**`readOrUnavailable` was deliberately not used and deliberately not widened.**
It treats only connection-class SQLSTATEs as unavailable and rethrows the rest —
`42P01` is not in that set, and adding it would make a portal-wide helper
swallow `undefined_table` everywhere, hiding exactly the schema drift the PR #102
incident was about. The catch belongs at the one call site that has decided it
can live without the answer, not in the shared helper.

Same reasoning, opposite conclusion, one file away: `/reviews` is a brand-new nav
item, and before the DDL runs it would have met a seller with an error page. It
now checks for its own tables and renders copy that **names the workflow**. A
missing table is not dressed up as an outage — the lesson of PR #102 is that a
migration gap has to be legible as a migration gap.

## Existing tests caught three more, and every one of them was right

| Test | What it refused |
| --- | --- |
| `orders-surface.test.tsx` | `ink-faint` as a text colour (3.2:1, admitted only for a search placeholder), and a raw hex where a token exists. Both violated. The rating colour became `--color-rating`; status lines became `ink-subtle`. |
| `OrderCard.test.tsx` | The order *list card* printing "review" or "rating" at all. That is a decision, not an oversight: the card is a payment-and-fulfilment statement a buyer scans, and it already links to the detail page. The control is gated behind `showReviewControl`. |
| `page.test.tsx` (PDP) | A section rendering for data the portal did not send. The reviews section returns `null` with no reviews instead of the empty state the design mockup had. |
| `read-model.published-scope.test.ts` | Reading recorded `WHERE` clauses by index — issuing the rating query *before* the detail loaders shifted them. The lookup now rides the existing `Promise.all`, which that test's own comment documents as safe, and which removes a serial round trip. |

The PDP one is worth dwelling on: the design canvas had an empty state, and the
repository has a standing rule against sections about absences. The rule won. On
a catalogue where almost nothing has reviews yet, a heading reading "Ratings and
reviews" above a sentence saying there are none would be noise on nearly every
page — and the description, specification and variant sections all already follow
the same rule.

**One defect nothing existing would have caught, and it was mine alone.**
`fetchProductReviews` claimed *in its own doc comment* to answer `[]` rather than
throw, and did not: `requestStorefrontJson` throws on a non-2xx it was not told
to treat as not-found, and on a malformed envelope. A portal `503` would have
taken out the whole product page — the exact trade that function exists to
avoid. The comment described the intent and the code did the opposite, which is
worse than no comment.

## One existing test adjusted rather than satisfied

The PDP's product-read counter matched any URL *under* the product path, so it
counted the nested `/products/<slug>/reviews` read as a second **product** read.
It now compares the pathname exactly, which is what its own doc says it measures
("a future edit that fetches the product twice"). The assertion is unchanged and
still fails on a real double-read. Recorded because "I changed a failing test" is
the sentence that should always attract scrutiny — the distinction is whether the
test was measuring the thing it claims to measure.

## Design decisions, with their trade-offs

- **No rollup table.** The aggregate is a `GROUP BY`. It cannot drift from the
  list beneath it, and a `HIDDEN_BY_PLATFORM` review leaves the list and stops
  counting in the same breath. Revisit at roughly 50k reviews or a feed p95
  regression. The cost accepted: one grouped query per page of cards.
- **The rating read is fail-safe; the order read now is too.** A card without
  stars is a card; a catalogue answering 503 is a shop nobody can buy from.
  Stated in code as *not* a substitute for running the migration first — the
  point is that the blast radius of a decorative aggregate should be the
  aggregate.
- **`display_name` stores the already-masked string** the buyer consented to, so
  no read path can leak a surname it was never given. The full name is
  unrecoverable from the table, which is the correct direction for the mistake
  to run in.
- **`buyer_email` is authorisation data.** Verified during the pre-merge pass
  that it appears in **no** `SELECT` list anywhere — written, and compared inside
  a `WHERE`, never projected.
- **A rating gates nothing.** ADR-010 reserves `products.score`; nothing here
  writes to `products`.
- **A seller answers once, editable, versioned** with `supersedes_id` behind the
  partial unique index and compare-and-set on the version their screen rendered.
  PR #80 shipped the opposite on pricing overrides and lost the replacement
  history.
- **A seller cannot hide or delete a review.** `HIDDEN_BY_PLATFORM` is for
  `review:moderate` and ADR-014 puts moderation in the Admin Portal. The reply
  dialog says so rather than leaving sellers to discover it.
- **`review:reply` and `review:moderate` already existed** in
  `PORTAL_PERMISSIONS`, unused since that table was written. Nothing was added to
  the permission model.

## What was deliberately not copied from the screenshot

The owner asked for inspiration from a Shopee Seller Center screen and explicitly
not a copy — "wag mo masyado kokopyahin para di halatang cinopy natin."

- No reward/coin panel for soliciting reviews, and no review-request sending.
  Both are marketplace products Sals3 does not have; the space carries a plain
  statement of the delivered-only rule instead.
- Four disconnected headline numbers became one rating band. An average alone
  cannot tell "mostly five stars with two angry outliers" from "everything is a
  three", and those need different work.
- "Good Rating Rate 93%" became "Delivered items reviewed — not a target". The
  first reads as a score to chase, which ADR-010 keeps ratings out of; the second
  is coverage rather than quality and cannot be gamed by pressuring buyers.
- Star colour is `--color-rating` `#9a6200` — an existing portal token at 4.9:1
  on white. Bronze rather than marketplace orange: accessible, and visibly not
  somebody else's palette.
- **No per-review "verified purchase" badge.** Every review is a verified
  purchase by construction, so a badge on every row is noise. The guarantee is
  stated once in the summary, where a buyer deciding whether to trust the number
  is actually looking.

## Verification

| | portal | storefront |
| --- | --- | --- |
| unit | 2,526 passed, 4 skipped | 807 passed |
| e2e | 79 passed, 6 skipped | 37 passed, 1 skipped |
| build | 23/23 pages | 21/21 pages |
| audit | 6 moderate, 0 high | 8 moderate, 0 high |

Lint, format and typecheck green in both; CI green on both PRs before merge
(`verify` 7m50s and 3m8s).

**Flagged, not mine:** pushing to `sals3-ecommerce` printed "GitHub found 1
vulnerability on the default branch (1 high)", while `npm audit
--audit-level=high` reports only 8 moderate. The two disagree and the Dependabot
alert predates this work — worth opening, and it is not a finding of this
session.

## Still open

- **The production DDL run.** `Reviews Migrate Product Reviews`
  (`workflow_dispatch`), needing `CRON_SECRET` and `PORTAL_BASE_URL`. Prove the
  route deployed first with an unauthenticated `GET` answering `401` rather than
  `404`, then check the response says `tablesExistAfter` true for **both**
  tables. A green run is not the evidence.
- **Nothing has run against a real row.** Every test is a fixture or a recording
  fake. The eligibility SQL, the submit path, the reply compare-and-set and the
  aggregate have never met live data.
- **`aggregateRating` in Product JSON-LD.** `ProductSchema.tsx`'s comment saying
  "Sals3 has no buyer reviews" was true until this change; it now records the
  narrower reason for the omission — emitting a review snippet is governed by
  Google's own policy for review snippets, that policy was **not** read in this
  session, and a breach risks a manual action against the whole domain rather
  than one page. A real ADR-016 unlock waiting on that reading.
- **Review photos.** The R2 pipeline exists and is proven, but a buyer-facing
  write is an abuse surface that needs `review:moderate` wired first.
- **A review-reminder email** has nowhere to hang, which is the accepted cost of
  deriving eligibility instead of storing it.
- **The `Related products` heading** still renders Plus Jakarta Sans 20px/700
  where the design and every sibling use Outfit 600 — unchanged from part 66, and
  still scoped out.
