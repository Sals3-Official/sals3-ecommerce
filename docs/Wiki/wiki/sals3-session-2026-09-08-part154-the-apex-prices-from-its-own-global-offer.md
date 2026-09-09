---
tags: [session-record, sals3, portal, pricing, global, backfill, cron, read-model]
aliases:
  [
    "Part 154",
    "The apex prices from its own Global offer",
    "The repair that learned to drive itself",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part152-global-becomes-a-real-offer-destination]]"
  - "[[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn]]"
  - "[[sals3-session-2026-09-08-part156-a-saved-margin-is-an-applied-margin]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
---

# Part 154 — The apex prices from its own Global offer, and the repair learns to drive itself

> [!IMPORTANT] This completes the ordering [[sals3-session-2026-09-07-part152-global-becomes-a-real-offer-destination|part 152]] laid down
> Part 152 shipped `XG` **inert** and listed four ordered steps. Steps 2–4 all
> happened on 2026-09-08: the owner set Global's rules in production (205%
> markup, 50% opex), the backfill was made self-advancing and put on Vercel
> Cron, and the read side landed. **The apex no longer borrows another market's
> price.**

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the production
> measurements quoted in them. All five PRs are `anythingsupplies/sals3-portal`,
> merged 2026-09-08. Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#168](https://github.com/anythingsupplies/sals3-portal/pull/168) | The repair self-advances and runs on Vercel Cron — no person driving it |
| [#167](https://github.com/anythingsupplies/sals3-portal/pull/167) | The shared storefront reads its **own** Global offer, preferring rather than filtering |
| [#173](https://github.com/anythingsupplies/sals3-portal/pull/173) | The recount answers at all, and its answer can reach zero |
| [#180](https://github.com/anythingsupplies/sals3-portal/pull/180) | The repair owes **every** market the seller has priced, not just Global |
| [#183](https://github.com/anythingsupplies/sals3-portal/pull/183) | The diagnosis in #180's comment was wrong — corrected rather than left standing |

## 1. The apex was undercutting its own market storefronts

`sals3.com` sends no market, so the read model applied no filter and the card
price was `min(price_amount_minor)` across every market's offer. Once Fiji was
set to 120% and Australia to 200%, **the cheapest offer was Fiji's** — so the
generic domain undercut `sals3.com.au` on the same dress:

| | Shows | Which market |
| --- | --- | --- |
| `sals3.com.fj` | FJ$19.56 | Fiji, 120% ✓ |
| **`sals3.com`** | **US$8.67** | **Fiji's, converted back** ✗ |
| what Global's own rule says | ~US$12.02 | 205% on a ~$3.94 cost |

Measured on a product published 2026-09-08: cost `$1.79`, portal retail `$5.46`
(Global, 205%), both storefronts serving `$3.99` (Fiji, 120%) — **27% under, per
unit.**

## 2. A preference, not a filter — and that is what dissolved the gate

#167 carried a "do not merge" gate **twice, and was wrong both times.** It first
said to wait for `missingMarketOffers: 0`, a number that could never arrive (see
§3). It then said to wait for the backfill to report `truncated: false`.

**The second gate cost real money while it stood.** The card aggregate
**prefers** Global and **falls back** to the bare `min`:

- a product carrying its Global offer is priced correctly;
- a product not yet carrying one behaves exactly as production already did.

So the PR was *never worse than the current state for any product, at any point
during the backfill.* There was nothing to wait for — and holding it extended a
27%-per-unit loss on every newly published product for no reason.

> **The lesson the PR draws on itself:** a fallback-shaped change has no
> ordering constraint against the backfill that fills its preferred branch. A
> filter-shaped one would have. The gate was copied from the shape of
> [[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price|part 145]]'s
> filter without checking whether this change had the same dependency.

## 3. Three ways the repair could not finish

### It had no unattended trigger (#168)

`CRON_SECRET` is write-only, the Actions workflow that held it has not started
since 2026-09-04, and the only other authorized caller is a signed-in seller
session — *a person with a browser, one page at a time.* It was being driven by
hand at roughly two pages a round trip: **after 23 pages it had covered 22% of
the catalogue.**

**The scan now self-shrinks.** It requires a variant with no Global offer, so it
advances with no cursor. It could not before — it selected products that were
*published* rather than products still *missing* an offer, so a cursorless caller
re-read the same first page forever **and answered `ok: true` having repaired
nothing.** That made the repair unreachable by every trigger that cannot hold
state between calls, which by 2026-09-08 was every trigger left.

`market_code` only, never `publish_state`: a row that exists in any state is not
missing, and treating a paused one as absent would send the writer at a
`(variant_id, market_code)` pair the partial unique index already holds.

### The recount exceeded the bind ceiling, and could never reach zero (#173)

Reading the backfill's state was the only way to know whether the repair had
finished. It answered **`500 status-check-failed`** on production. Two defects in
one query:

1. **The bind-parameter ceiling.** It read every live variant then passed every
   id to `inArray` — one bind each. Postgres accepts **65,535**, the same ceiling
   behind the 2026-09-07 outage, and this catalogue is well past it. *It failed
   fast, which is what made it look like anything other than the size of its own
   query.*
2. **It could never reach zero.** The expected grid held every *authorized*
   destination, but `NZ`, `US` and `CA` have no operating expenses, so
   publication and the backfill both skip them **correctly** while the count kept
   them as permanently missing.

Observed on production: `192,862` → `204,554` → `205,037` **while 1,709 offers
were being created.** *A progress number that rises as the work succeeds is worse
than no number* — and it is exactly why #167 gated itself on `truncated: false`
instead, which then held a fix back for hours.

The fix is one aggregate computed in the database, selecting on the **same
`not exists` the scan does**, so the count and the repair cannot disagree about
what "remaining" means.

> Owner decision 2026-09-08: there is **no plan to launch `NZ`, `US` or `CA`.**
> They are not a gap to be closed and do not belong in a count of owed work.

### The narrowing that made it self-advancing lost the named markets (#180)

A lipstick was selling at **Global's 205% on the Fiji storefront** — `$3.05`
where Fiji's 120% says `$2.20` — and at the same price on the Australian one,
where 200% says `$3.00`. **Fiji and Australian buyers were being overcharged by
the exact mechanism that had, hours earlier, stopped Global buyers being
undercharged.**

#168's comment had accepted this under *"what this narrowing gives up"* and
called it a narrow loss. **It was not.** `GET` answered `missingMarketOffers: 0`
while the catalogue was not complete.

The scan now selects a product when any priceable variant holds **fewer offer
rows across its seller's expected markets than there are markets** — the partial
unique index on `(variant_id, market_code)` makes that a count of distinct
markets, so `< n` is exactly "some expected market has no row".

**The expected list is not duplicated in SQL.** `expectedBySeller` resolves it
through the same three gates the repair loop always applied and hands the codes to
`owedPredicate` as a handful of two-letter binds per seller. **One definition,
three readers** — the scan, the recount and the writer. That is the property a
cursorless caller needs in order to terminate: *a scan that selects a market the
loop then refuses is a product on the first page forever.*

## 4. And the diagnosis was wrong (#183)

Comment-only, and the most valuable PR in this note. #180's comment said the
lipstick *"had an XG offer and no FJ one."* **It had an FJ row all along**,
carrying a price from before that morning's Fiji margin change. With #180 live
the widened scan selected nothing, and the Fiji reprice then moved **26,425 of
78,886** live Fiji prices — the lipstick among them.

The predicate stays; it closes a real gap. But the sentence that justified it was
wrong, and *a wrong diagnosis in a code comment misleads the next reader more
than no comment.* The corrected text records the actual lesson:

> **A price matching another market's is not evidence the row is missing. A stale
> row wears the same number. Reprice first.**

The reprice half of that story is [[sals3-session-2026-09-08-part156-a-saved-margin-is-an-applied-margin|part 156]].

## 5. Verification

`npm run verify` PASS on each: lint 0 errors (5 pre-existing warnings in
`scripts/`), format:check clean, typecheck clean, build clean, **4,159 unit tests
passed / 4 skipped (373 files)** at #173. All local — Actions in this org has
been unfunded since 2026-09-04, so a red check is a ~4s billing stall and not a
code signal.

## Lessons

- **A fallback-shaped change has no ordering constraint; a filter-shaped one
  does.** Copying a gate from a superficially similar PR held a money fix for
  hours against a dependency it did not have.
- **A progress number that rises while the work succeeds is worse than none.**
  The count and the repair must share one predicate, or "remaining" is fiction.
- **`inArray` over a live table hits the 65,535 bind ceiling.** Compute the
  aggregate in the database; do not carry the catalogue into memory to count it.
- **A cursorless scan must select on "still missing", not on "eligible".**
  Otherwise it re-reads page one forever and reports success.
- **Read "what this gives up" as a defect report, not a footnote.** #168 wrote
  down exactly the gap that overcharged two markets, and classified it as narrow.
- **A price that matches another market's does not prove a missing row.** A stale
  row wears the same number. Reprice before diagnosing.
- **Correct a wrong comment even when the code stays.** A justification that was
  never true costs the next reader more than silence.
