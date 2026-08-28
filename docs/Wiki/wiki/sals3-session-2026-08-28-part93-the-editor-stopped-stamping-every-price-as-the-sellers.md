---
tags:
  - sals3
  - sals3-portal
  - pricing
  - product-editor
  - audit
  - session-note
aliases:
  - Part 93
  - The Editor Stopped Stamping Every Price
  - Rule-Owned Prices
  - Reclaiming Hand Prices
created: 2026-08-29
updated: 2026-08-29
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[sals3-session-2026-08-28-part92-one-rule-in-two-units-and-the-first-repricing-path]]"
  - "[[sals3-session-2026-08-28-part94-the-storefront-buffers-on-the-sellers-own-rate]]"
---

# Part 93 — the editor stopped stamping every price as the seller's

2026-08-28. *"The owner set a department to 300% and watched nothing happen to
the products in it."* The margin engine was working. **The Product Editor was
quietly claiming every price as a human decision**, and a price claimed that way
is exempt from every rule forever. Eight `sals3-portal` pull requests across the
day untangled it.

- [#219](https://github.com/Sals3-Official/sals3-portal/pull/219) — a category
  margin can now reach a product's price at all.
- [#222](https://github.com/Sals3-Official/sals3-portal/pull/222) — the rule's
  price reaches the cell without a reload.
- [#224](https://github.com/Sals3-Official/sals3-portal/pull/224) — show the
  working behind a rule-derived price.
- [#226](https://github.com/Sals3-Official/sals3-portal/pull/226) — one explainer
  per column, and reprice serves every rule.
- [#229](https://github.com/Sals3-Official/sals3-portal/pull/229) — the rule owns
  the price until somebody says why.
- [#235](https://github.com/Sals3-Official/sals3-portal/pull/235) — an edit ends
  where it started, at the pencil.
- [#237](https://github.com/Sals3-Official/sals3-portal/pull/237) — the revert
  control says "nothing to undo" instead of vanishing.
- [#238](https://github.com/Sals3-Official/sals3-portal/pull/238) — reprice can
  take back the prices a person typed.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The 335 hand-priced
> offers, the `$5.80`/`$7.85` and `$9.12`/`$12.35` worked examples, and the owner
> quotes are as those records reported them.

## 1. The editor was the thing standing between a rule and a price

The Product Editor seeded its Retail price cell from
`product_offers.price_amount_minor` and sent **every one of those numbers back**
on save and on publish.

- `publishProduct` treats any retail price it is handed as a price a person
  typed, and **skips `resolveProductPricing` entirely**.
- `updateSellerRetailPrices` (the draft save) writes straight onto the offer row
  stamped `SELLER_RETAIL_PRICE_V1`.

So a category margin only ever reached a product's **first** publication. Every
save and republish after that re-wrote whatever was already in the box, and no
rule could move it.

The wiring that should have prevented this was dead in an obvious way:
`productToEditorFixture` returned `variantGuidance` with `decision: null`
hardcoded, beside a comment pointing at a `resolveFixtureVariantGuidance` **that
has never existed in this repository**. Nothing rendered it either way.

**And it exposed a defect in the repricer #218 had shipped hours earlier.**
`reprice.ts` recognised a seller-entered price only as
`resolvedLayer === 'SELLER_RETAIL_PRICE'` — the shape `publishProduct` writes.
The draft save writes `{ source: 'SELLER_RETAIL_PRICE' }` with **no
`resolvedLayer` at all**, which is the shape most stored prices actually carry —
so the repricer would have overwritten prices a person had typed. Both shapes and
the resolver-version stamp now go through one `isSellerEnteredPrice`, with a case
per shape.

`modules/catalog/products/pricing-guidance.ts` resolves, per variant, what this
account's rules say the price should be — the same resolver, the same destination
`publishProduct` would use, the same supplier cost. The cell is seeded from it and
says which rule produced the number:

> From 300% markup on Apparel & Accessories > Clothing Accessories

**That line was the first place anywhere in the product UI where a margin had
ever been visible.** Only a price a person decided is sent back to the server;
every other variant is left to the resolver, which writes exactly the number
already on screen — that is what makes the editor cell, the offer row and the
storefront one price rather than three. A price already stamped as the seller's
keeps its number and is labelled as theirs, with **Use $4.40 from your rules**
underneath to restore the rule's price *and* clear the flag. Without that, an
existing catalogue could never be handed back to its own margin rules.

## 2. The prop updated and the state did not

Reported from production the same day: after choosing the Category, **every
Retail price cell stayed `0.00`** and the readiness panel kept blocking on
"Retail price is required" — while the line under each cell already read
`From 33.33% markup on Apparel & Accessories > Clothing`. Only a hard reload
fixed it.

Not a rendering bug. `variants` is a `useState` seeded on mount;
`handleDecideCategory` calls `router.refresh()`, which re-renders the
already-mounted client component with a fresh `fixture`. **Choosing the category
is what makes a product priceable at all** — before it the resolver refuses
`CATEGORY_MAPPING_REQUIRES_REVIEW` and every cell is `0.00` — so that refresh
carried the first real prices the product had ever had, and the frozen state threw
all of them away.

**What disguised it:** `variantGuidance` is a *prop* and goes straight to the
table, so the rule line under each cell updated immediately while the cell above
it did not. One number from a prop, one from state, disagreeing on screen. That
is also why the earlier read of this as a deployment skew was wrong — the server
was returning `$23.44` for that exact product the whole time.

This was **the third instance of this defect in this one file** (option labels and
category attributes already carry their own resync), so it follows the same
*adjust state when a prop changes* pattern, **during render rather than in an
effect**, so the stale value never commits even for a frame. It is keyed on a
signature of the server's own prices rather than on the category code, because a
supplier cost refresh or a margin-rule change moves these numbers too. A price
the seller decided is never touched by the resync.

## 3. Showing the working

The owner read `From 33.33% markup on …` against a **$5.80** supplier cost and a
**$7.85** price and asked where the numbers came from. That is the right question
of a figure that will not reconcile: `5.80 × 1.3333` is **$7.73**. The funding
buffer is added to the cost *first*, and the margin divides what comes out. The
label was true about the rule and silent about the arithmetic.

```
How this price is worked out

Supplier cost              $5.80
+ 1.5% funding buffer      $5.89
÷ 0.75  (25% margin)       $7.85
```

**Every value is read from the resolver's own decision; none is recomputed in the
component.** A second implementation of that sum is how an explainer starts
disagreeing with the price above it — and the decision already carried all of it
(`effectiveProductCost`, `fundingBufferRate`, `suggestedItemPrice` before
rounding, `contributionFloorApplied`).

Two things the working made honest: **the rounding step appears only when
rounding actually moved the number**, and **when the contribution floor set the
price rather than the margin, it now says so** — the one-line label had been
claiming the markup produced a number the floor had produced.

The arithmetic is tested as its own component (`PricingWorkingLines`) rather than
through the tooltip: Base UI mounts the popup only once open, and a test that
drives that proves the library works rather than that the sum does.

Then #226 moved the explainer **to the column heading**, once, beside the words
`Retail price` — the per-row copy had become noise on a ten-variant product. It
renders only when every listed variant shares one sum; where costs genuinely
differ, one variant's arithmetic in the header would state a number wrong for
most of the table, so it stays silent and each row keeps its own line.

The same PR answered a second owner report — *"the Market Rule doesn't seem to be
applied"* — by checking a live product: `$9.12` cost → `+1.5%` buffer → `$9.26` →
`÷ 0.75` → **`$12.35`**, exactly the 25% category margin on the Market Rules
screen. **It was applied.** It did not look applied because one rule was shown in
two units, which is part 92's story.

## 4. The cell locks, and an unlock asks why

The retail cell was a free-typing field sitting on a number the margin rules
produced, so the rules' price could be lost to a stray click. It renders as text
with a pencil now, and unlocking opens a dialog that asks **why**.

| Case | Locked? | Why |
| --- | --- | --- |
| The rules priced it | **yes** | there is a number to protect |
| A person already owns it | **yes** (from #235) | a money field should not be somewhere a click can land |
| The rules cannot price it | no | locking would block publication on the very field it asks for |
| Fixture / design-preview | no | no audited write behind the ceremony |

#229 originally left an owned price open, on the reading that there was no rule
price left to protect. #235 corrected that: **the thing being guarded is not only
the rules' number — it is that a money field should not be somewhere a click can
land.** Unlocking an owned price asks for **no reason**, though: the reason
records *leaving the rules*, and that price left them already.

This is a guard against the *accidental* edit, not an authorization check. A
disabled control never is one — the value still reaches the server through a
Server Action, which re-derives what it stores either way.

**Who edited it, and why.** `save-draft.ts` writes one
`product_offer.retail_price_overridden` audit event per price that **actually
moved**, carrying the actor, the previous price, the previous resolver version,
the new price, and the reason. `actorId` is server-resolved, so the name on the
event is never one the browser supplied. Pressing Save on an untouched product
writes none. **No DDL** — `audit_events` already had everything this needs.
Reading the previous price needs its own `SELECT`, because `UPDATE … RETURNING`
reports the row *after* the statement and the previous value is the whole point
of a price audit.

**Clearing a price hands it back to the rules.** Clearing the cell used to look
like it did something and did not: an empty field became `0`, and both the draft
save and publish filter on `amountMinor > 0` — so the save wrote nothing and left
the old price standing, while publish read the same absence as *"resolve it from
the rules"*. **One gesture did nothing or everything depending on which button
came next.** It now resolves on blur, never per keystroke, because clearing a
field to retype passes through empty and reverting there would snap the rules'
number in under the caret.

Blur is also where an edit ends: the cell re-locks and the pencil returns. The two
blur outcomes are exclusive and both tested — a field left **with** a value ends
the edit, a field left **empty** is a request for the rule price and does not
lock.

`Set retail price…` was renamed `Set one price for all…` so it reads as the blast
radius it always had, and it sits beside `Use my rules for all` as the two
directions of one decision. The ellipsis stays: it is the ordinary convention for
*"this opens a dialog rather than acting now"*.

## 5. A control that disappears reads as a deleted feature

`Use my rules for all` hid itself when no variant was overridden, on the reading
that a control which would change nothing is noise. **The owner pressed it,
watched it do its job, saw it disappear, and reported the feature as deleted.**

That is a worse failure than a button reporting an empty state — and disabling
also stops the row reflowing under the cursor the moment it is used. It renders
always now, disabled when there is nothing to undo, with
`Every price here already comes from your margin rules.` on the title.

## 6. Taking back 335 prices nobody decided

> *"Isang pindot ay babalik lahat ng item sa market rule settings."*

Because the old editor sent every price back as the seller's on every save,
**335 offers on this account are stamped as hand-priced** — decisions nobody made.
The reprice preview reported them as *"priced by hand and left alone"*, and a
margin change reached none of them. Undoing that one product at a time is not a
repair anybody finishes.

Built **on** the repricer rather than beside it: same preview, same typed reason,
same fingerprint, same per-offer audit, same permission gate. One checkbox, off by
default, because `writeReprice` replaces `pricing_decision` and
`pricing_resolver_version` outright and a reclaimed offer stops being the
seller's for good.

Two things that would have made the repair silently wrong:

- **A reclaimed offer is written even when the number does not move.** What
  changes is ownership. One left at the same price but still stamped
  `SELLER_RETAIL_PRICE_V1` would stay exempt from every future rule change —
  exactly the state the run exists to end. Skipping it as `UNCHANGED` would have
  made the repair partial for every price already matching its rule.
- **The audit says which of two different things happened.** A rule moving a
  price the rules already owned, and a person's decision being overwritten, are
  not the same event. `reclaimedFromSeller` distinguishes them, and
  `previousPriceMinor` was already on that event — which is what makes the second
  recoverable at all.

The confirmation is **typing the count the preview reported** — a number that
cannot be supplied without reading the preview. Deliberately **not a password**: a
password proves *who* is pressing, and what needed proving is that they know
*what it will do*. (Password re-verification does not exist in this portal today
— only CJ supplier auth — so it would be a new auth surface, not a checkbox.)

## Consequences and open items

- **`product_offers` has no history table.** It is updated in place, and the only
  audit action carrying a previous price
  (`product_offer.retail_price_overridden`) shipped on 2026-08-28. **The 335
  hand-priced values predate it and exist nowhere else** — a catalogue-wide
  reclaim is irreversible for them.
- A catalogue-wide *"one press returns every listing to the market rules"* across
  all products is still unbuilt; the irreversibility above is one of three things
  that must be settled before it can be written safely.
- Nothing on Market Rules yet says a reprice is outstanding after a rule changes.
  Still the obvious next piece of work.

## Lessons

- **A default that claims authorship is worse than no default.** The editor
  seeding from the stored price and echoing it back made every price look like a
  decision, and a decision is permanently exempt from the rules.
- **`useState` seeded from a prop is a bug waiting for a `router.refresh()`** —
  three times in one file now. Adjust during render, keyed on the server value's
  own signature.
- **A control that vanishes when it succeeds will be reported as removed.**
  Disable and explain instead.
