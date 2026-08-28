---
tags:
  - sals3
  - sals3-portal
  - pricing
  - market-rules
  - adr-015
  - session-note
aliases:
  - Part 92
  - One Rule In Two Units
  - Markup Over Cost
  - The First Repricing Path
created: 2026-08-29
updated: 2026-08-29
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-27-part77-a-margin-per-destination-and-two-hours-of-refused-saves]]"
  - "[[sals3-session-2026-08-27-part78-the-floor-that-became-a-percentage]]"
  - "[[sals3-session-2026-08-28-part93-the-editor-stopped-stamping-every-price-as-the-sellers]]"
  - "[[sals3-session-2026-08-28-part94-the-storefront-buffers-on-the-sellers-own-rate]]"
---

# Part 92 — one rule in two units, and the first repricing path

2026-08-28. The owner typed `300` into the bulk pricing sheet and read `75%` on
the Category margins table. **Both were right** — a 300% markup is a 75% margin —
and neither screen said which unit it was in, so it read as the import having
been ignored. Closing that gap took five `sals3-portal` pull requests across the
day, and it carried the platform's first way to move a price that is already
live.

- [#218](https://github.com/Sals3-Official/sals3-portal/pull/218) — the bulk
  sheet speaks markup, and a margin can reach a live price.
- `sals3-ecommerce` [#186](https://github.com/Sals3-Official/sals3-ecommerce/pull/186)
  — ADR-015 gains two amendments recording both decisions.
- [#233](https://github.com/Sals3-Official/sals3-portal/pull/233) — Market rules
  states markup, the unit the sheet writes.
- [#240](https://github.com/Sals3-Official/sals3-portal/pull/240) — one unit on
  every pricing surface, and the button beside it.
- [#242](https://github.com/Sals3-Official/sals3-portal/pull/242) — the store
  default preview reads the unit the field takes.
- [#244](https://github.com/Sals3-Official/sals3-portal/pull/244) — one unit on
  the store default dialog, not two.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. Owner quotes and
> the production figures (`$4.86` COGS, 69 offers at `$15.27`, 1241 refusals) are
> as those records reported them.

## 1. Why widening the rule would have been the wrong fix

The owner filled the sheet with `300` and `0` and got **1241 refusals**: the rule
was `above 0 and below 100`. Widening it as asked would have broken pricing
rather than opened it.

Every price comes from ADR-003 §4's `price = cost / (1 - margin)`, where the
margin is a share of the **selling price**. At a margin of 1 the denominator
vanishes, so 500 as a margin is arithmetic with no answer. And
`pricing_category_policies.target_margin_rate` **carries no CHECK of its own** —
so `3.000000` would have been *stored*, the import would have reported success,
and the resolver would then have answered `INVALID_MARGIN_RATE` for every product
in those categories. **A silently unpriced catalogue.**

So the column now means what the owner meant:

- `markup_percent`, measured against **cost**, accepted `0` to `500`. `300` = sell
  at four times cost.
- Converted to the stored margin rate by `margin = markup / (100 + markup)`, in
  the same BigInt fixed-point math as every other rate. `300` stores as
  `0.750000`.
- **No DDL, no migration.** Every existing row means exactly what it always
  meant; only the file a person edits changed unit.
- A file still carrying `margin_percent` is **refused, not reinterpreted** — the
  same `35` means two different prices under the two names, so reading an old
  export would quietly reprice every category it names.
- A target margin of exactly `0` is now valid end to end and means "sell at
  cost". The contribution floor keeps the strict `0 < rate < 1` bound, which is
  why the one `marginRateSchema` is now **two**. Do not merge them back.

## 2. A margin rule could not reach a price that was already live

A price was resolved once, at publication, and frozen. `saveCategoryPolicyAction`
revalidated `/market-rules` and touched no offer, so **a margin saved afterwards
changed nothing a buyer saw** until somebody republished each product by hand.
There was no repricing path anywhere in `src/`.

`modules/pricing/reprice.ts` plans a run and writes it. It **computes no price
itself** — every number comes from `resolveProductPricing`, given the offer's own
destination and the product's own category. `RepriceControls` previews first and
writes second.

| Guard | What it prevents |
|---|---|
| A price a person typed (`SELLER_RETAIL_PRICE`) is skipped, and the resolver is not even asked | a bulk action silently replacing a deliberate decision with a computed one |
| The client never sends a price — preview returns a digest, apply recomputes server-side and refuses `stale_preview` | writing numbers nobody approved, and a crafted payload choosing its own price |
| Every update carries the offer `version` it was planned from | a concurrent republish interleaving with a half-applied run |
| Requires `pricing_policy:manage` **and** `product:publish` | holding the margin rules being mistaken for the authority to change what buyers are charged today |

An offer the resolver refuses **keeps its price** and is named with the
resolver's own reason rather than failing the run. That is a deliberate departure
from the plan document: the blocker there is pre-existing data, and all-or-nothing
would let one unmapped product freeze the whole catalogue's pricing.

**Deliberately not built: firing a reprice automatically when a rule is saved.**
It removes the look-before-you-write gate that is the entire safety property, and
doing it properly needs a job queue and a table — DDL, and therefore a manual
production migration.

`STOREFRONT_CATALOG_TAG` moved to its own leaf module in the same PR, so an
action that only expires the cache no longer drags `server-only` and the read
model into its import graph. Part 94's `fx-buffer-tag.ts` exists for the same
reason.

## 3. The screens move to the sheet's unit

Three of the four places a rate appears already spoke markup, so the Market rules
tables and dialogs are the ones that moved.

| Surface | Before | After |
| --- | --- | --- |
| Import sheet (`markup_percent`) | markup | markup |
| Product Editor `From … markup` | markup | markup |
| Editor working tooltip | markup | markup |
| **Category margins table** | margin | **markup** |
| **Category margin dialog** | margin | **markup** |
| **Store default table + dialog** | margin | **markup** |
| Policy history (margin entries) | margin | **markup** |

**Storage is untouched throughout.** `targetMarginRate` stays a margin rate on the
row and in the resolver; only what a person reads and types converts, at the
display boundary and in the two dialogs, through the same
`markupPercentToMarginRateScaled` the CSV importer already uses. A rate typed in
the dialog and one imported from the sheet land on the identical stored value.

**The funding buffer is deliberately left alone.** `adjustmentRate` is a genuine
signed percentage, not a margin, and converting it would be the same category
error in reverse. `PolicyHistoryButton` converts only the margin entries and
branches on exactly that.

### The number that was off by a whole multiple

`300` was entered believing it meant 3× cost. **It is 4×.**

| Want | Markup | Margin | Price at $4.86 COGS |
| --- | --- | --- | --- |
| 2× | 100% | 50% | $9.87 |
| **3×** | **200%** | 66.67% | $14.80 |
| 4× | 300% | 75% | $19.73 |

The catalogue is currently on 4×, which is why the reprice preview wanted to move
**69 offers from `$15.27` to `$45.80`**. That is a data fix in the sheet, not a
code one, and it was deliberately not made as part of any of these PRs.

## 4. The words, the tooltip, and the button

#233 converted the **values** and left the **words**. Descriptions, warning
banners and confirmation dialogs still said *margin* over figures that had become
*markup* — the same mismatch, in prose. `Category margins` became
`Category markups`, and the same substitution ran through five more strings
including three banners.

The working tooltip lost its derivation paragraph:

```
before   ÷ 0.75 (25% margin)     + "A 25% margin is the same as 33.33% markup…"
after    × 1.33 (33.33% markup)
```

That paragraph existed **only because the screens disagreed**. Once they no
longer did, it was noise shown to somebody who had entered `200` and was being
told `66.67`.

The reprice button moved to the **Category markups** header at the owner's ask,
with its own `Apply rules to live prices` section removed so there is one control
rather than two. #226 had moved it *away* for a reason that has not changed —
`planReprice` takes a **seller**, not a category, and reads the store default,
these markups, product and variant overrides **and** the funding buffer.

> [!WARNING] The information icon is what keeps that placement honest
> It names the full reach, says a published price does not move until you
> reprice, and says hand-typed prices are left alone unless you ask for them.
> **Do not ship the button in that header without it.**

## 5. The store default dialog, twice

#233 renamed the dialog's field to **markup over cost** and left
`StoreDefaultPreview` reading it as a **margin**. `200` — an ordinary markup —
tripped a `>= 100` guard that only ever made sense for a margin, so
`buildPreviewRows` returned `null` and the dialog showed *"Type a markup above"*
no matter what was typed. `crossoverCostMinor` had the same fault.

```
buildPreviewRows('200', …)   before → null
                             after  → cost $2 → $6 · $6 → $18 · $20 → $60
```

The owner read this as the store default being broken. **It was not** — the value
saved correctly the whole time; only the preview was dead. The dialog's state was
also still called `marginPercent` while holding markup, **which is exactly how it
got passed to a `marginPercent` prop without anyone noticing.**

Then the second half, in #244: the reserve beside it was still a share of the
**selling price** while the base markup above it was a share of the **cost**. Two
bases, one dialog, nothing saying which was which — so `50` got typed where
`33.33` was meant, and a US$2.00 floor landed on a US$1.00 cost instead of
US$1.50. The reserve is a markup now, converting at the same boundary, and the
worked-example table follows because **comparing markups gives the same answer as
comparing the margins they convert to** (`k / (100 + k)` is strictly increasing),
so it decides exactly what the resolver decides while showing the unit that was
typed. The live translation hint added in #242 came out with the gap it was
bridging.

**Not done, and why: removing the base markup**, which the owner also asked for.
`target_margin_rate` is `NOT NULL` on `pricing_store_defaults`, and it is what
prices every category with no markup of its own. Dropping the field needs a
migration *and* a decision about what those categories fall back to — neither is
a UI change, and guessing at it would break pricing rather than simplify it.

## Lessons

- **A unit is part of a number.** Every defect in this part is one value read
  under two units: the sheet against the table, the dialog field against its own
  preview, the base markup against the reserve. None was a wrong calculation.
- **A rename is not finished until the prose moves too.** #233 converted the
  values, #240 had to come back for the words, and in between the screens said
  *margin* over figures that were markup.
- **`typecheck` and `vitest` do not agree.** A `4400n` BigInt literal ran happily
  under vitest and failed typecheck. `verify` is the gate that decides.
