---
tags:
  - sals3
  - sals3-portal
  - pricing
  - catalog
  - break-glass
  - session-note
aliases:
  - Part 98
  - The Drafts That Could Never Be Priced
  - Four Things The Owner Hit In One Sitting
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[sals3-session-2026-08-28-part90-the-drafts-born-priceless-and-the-route-that-ran-another-migration]]"
  - "[[sals3-session-2026-08-30-part97-a-reprice-that-can-finish-and-a-sweep-nobody-clicks]]"
  - "[[sals3-session-2026-08-29-part96-the-store-default-stopped-asking-for-a-markup-nobody-used]]"
---

# Part 98 — the drafts that could never be priced

2026-08-30. A sourced product could not be priced by anything, and the screen a
seller looks at showed a price the whole time — which is why it took a month to
surface. Two pull requests: one closes the hole for every product mapped from
here on, and one prices the ones already behind it.

| PR | |
|---|---|
| [#254](https://github.com/Sals3-Official/sals3-portal/pull/254) | four things the owner hit in one sitting |
| [#256](https://github.com/Sals3-Official/sals3-portal/pull/256) | price the drafts nothing could price before |

No DDL in either.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record, plus the
> `Products Backfill Draft Pricing` GitHub Actions run log (`33273004649`) read
> directly.

## 1. A resolver call hardcoded to decline

`create-draft.ts` calls `resolveProductPricing` with `categoryCode: null`,
`UNMAPPED`, and `supplierCost: null`. **That is hardcoded to decline, and it was
right when it was written**: a freshly sourced CJ product genuinely has no Sals3
category, so there is nothing to price against.

It stopped being right the moment somebody mapped a category — and nothing
priced the offers afterwards. `resolveProductPricing` had **four callers, and
the one that maps a category was not among them.**

The consequences chain cleanly:

1. The offer row keeps `PRICING_UNRESOLVED`.
2. The Product Catalogue renders **"Not available"**.
3. The publish gate refuses, **for a reason that had already been fixed** — the
   category was decided; nobody told the price.

> [!WARNING] What hid it for so long
> **The Product Editor showed a price the entire time.** That number is
> `pricing-guidance.ts`, computed live for display. The offer row is a
> *different fact*, and the offer row is the one the catalogue and the publish
> gate read. A screen showing a correct computed value beside a stale stored one
> is indistinguishable from a screen showing a correct stored one.

## 2. Deciding a category prices the draft

`priceDraftOffers` now runs after a category decision, against **the offer's own
destination** and **the observed supplier cost**.

- **Unpublished offers only.** A published price is what a buyer is being
  charged, and moving that is `planReprice`'s job behind a preview somebody
  approved (see [[sals3-session-2026-08-30-part97-a-reprice-that-can-finish-and-a-sweep-nobody-clicks|part 97]]).
- **A refusal is recorded rather than swallowed**, so the catalogue can say
  *which* refusal it is instead of one undifferentiated "Not available".
- **Failing is not fatal.** A category was decided; reporting that edit as
  failed would invite a retry that rewrites what already landed.

## 3. The products already behind it

#254 fixes every product mapped from then on and **none of the ones mapped
before it**. #256 is for those.

**Verified on the owner's account 2026-08-30, before building anything**:
re-saving one product's *existing* category — changing nothing at all — moved it
from **"Not available" to $20.70**, and the catalogue's unresolved count went
**5 to 4**. The backfill does that without the clicking.

Decisions worth reviewing:

- **Unpublished, unresolved offers only.** A draft that already carries a price
  was priced by something, possibly a person, and `product_offers` keeps no
  history — overwriting either a published price or an existing draft price
  would be a **permanent, invisible loss**.
- **The position advances past a product the rules still refuse.** A refused
  product keeps its `UNRESOLVED` state and stays in the filter, so a position
  that only moved on success would re-read it forever and never reach anything
  behind it. *Reverting that line fails a test.*
- **One product per write, not one transaction for the backlog.** Each is
  committed on its own, which is what makes a call that dies lose nothing.
- **The writer is injected**, so a whole run can be driven in tests without a
  database.

`POST /api/internal/products/backfill-draft-pricing`, `CRON_SECRET`-gated,
dispatched through the `Products Backfill Draft Pricing` workflow.

**The production run**, 2026-08-29 20:15:30Z, run `33273004649`:

```
call 1: products 4 · priced 58 · still refused 0 · done=true
offers priced: 58
```

Four products, **58 offers priced, none still refused**. That matches the
unresolved count of 4 left after the manual re-save that diagnosed the bug — the
backlog was small, and it is now empty.

## 4. All categories, without a sentinel on the wire

The reprice dialog gains an **"All categories"** choice — still one destination
per run, still paged, still shown before it is applied.

It sends **`null` on the wire, never the `'ALL'` sentinel the `<select>`
carries.** A sentinel reaching the engine would resolve no category and
therefore price **nothing**, while reporting success — the failure shape #248
already had to guard against when it refused a path in place of a code.

The label is `Category` now, matching every other screen.

## 5. The CSV import looked like it needed a reload

It did not. **Measured against the owner's own 1,492-row file**: the write
finished in **seconds**, and the table caught up **11–21 seconds later**, with
the toast and the dialog close landing in between. So the seller saw a success
message over a stale table and reasonably concluded nothing had happened.

`router.refresh()` **returns nothing and settles on its own schedule.** The
dialog now waits on a transition of its own, and the button reads
`Updating the table…` across the gap.

> [!WARNING] This fix has no test, and the test file says so
> `refresh` is a **synchronous mock**, so the fixed and the broken orderings are
> indistinguishable in the suite — reverting the fix leaves it green. It was
> verified by measurement against production instead. The same shape as the
> stubbed-executor lesson: *a mock reproduces the interface, not the timing.*

## 6. The reserve line stopped shouting

The fourth item, recorded in full in
[[sals3-session-2026-08-29-part96-the-store-default-stopped-asking-for-a-markup-nobody-used|part 96]]:
the explainer's sentence *"Your markup is above your reserve, so the reserve did
not change this price"* was true on every row of this account, so it was a
permanent paragraph under a sum that changes. The number stays; the sentence
appears only when the reserve actually set the price.

## What is still open

- **`create-draft.ts` still calls the resolver in a shape that declines.** The
  call was not removed — it is still the honest answer for a product with no
  category. What changed is that something now asks again once there *is* one.
- **`pricing-guidance.ts` and the offer row remain two different facts.** The
  editor still shows a live computed price; the catalogue and the publish gate
  still read the stored one. Nothing yet reconciles them on screen or warns when
  they disagree.

## Lessons

- **A call that was correct when written can become the bug without changing.**
  `resolveProductPricing(null, 'UNMAPPED', null)` was the right call for a
  product with no category, and stayed the *only* call after the category
  arrived.
- **Count the callers of a resolver, then ask which state transitions are not
  among them.** Four callers, and the one that changes the input the resolver
  needs was missing.
- **A live computed value on screen hides a stale stored one.** The editor's
  price was right; the offer row was not; only the offer row is read by anything
  that matters.
- **A backfill must advance past what it cannot fix.** A position that only
  moves on success re-reads the first failure forever.
- **A synchronous mock cannot express a race.** The CSV refresh fix is real,
  measured, and permanently untestable in this suite — and saying so in the test
  file is the only thing that stops it being silently reverted.
- **A UI sentinel must not reach the engine.** `'ALL'` in a `<select>` is a
  label; `null` on the wire is a decision. Sending the label prices nothing and
  reports success.
