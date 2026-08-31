---
tags:
  - sals3
  - sals3-ecommerce
  - pdp
  - reviews
  - session-note
aliases:
  - Part 111
  - The PDPs Evidence Stops Contradicting Itself
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-30-part109-checkout-stops-lying-about-the-price]]"
---

# Part 111 — the PDP's evidence stops contradicting itself, and the fact tables stop going ragged

2026-08-30, `sals3-ecommerce`
[#196](https://github.com/Sals3-Official/sals3-ecommerce/pull/196)/[#197](https://github.com/Sals3-Official/sals3-ecommerce/pull/197)/[#203](https://github.com/Sals3-Official/sals3-ecommerce/pull/203)/[#206](https://github.com/Sals3-Official/sals3-ecommerce/pull/206)/[#207](https://github.com/Sals3-Official/sals3-ecommerce/pull/207),
no DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The ledger said a reviewed product had no reviews (#196)

The evidence ledger — built to be the one part of the page a buyer can
check — hardcoded its reviews row to `'None. Sals3 has no reviews yet.'` and
`ProductRecordPanel` never passed it a rating. On a product with published
reviews the ledger declared there were none, one screen above the reviews
themselves and their printed average — live on production, "None. Sals3 has
no reviews yet" and "out of 5" on the same page. A contradiction there does
not cost one row; it discredits the other three facts the ledger states.
`detail.rating` already existed on `ProductDetail`, simply never wired; the
row now reads `4.0 out of 5, from 1 verified purchase.`

The reviews section itself now renders on **every** product, zero included
— an owner call reversing this repo's standing "no section for data the
portal did not send" rule, for this one section only. A buyer who scrolls
to where reviews live and finds no block cannot tell "no reviews yet" apart
from a broken page. The one figure the empty state does not print as a
number is the average: "0.0" beside five hollow stars reads as "rated zero
out of five," the worst thing the page could say about a product nobody has
complained about — an em dash says the true thing instead. The one case
that still renders nothing is a rating claiming reviews exist while the
list came back empty (a failed read outliving the payload's rating);
neither branch is honest there, so it stays hidden, and the ledger's link
to `#reviews-heading` is conditional on the section actually having
rendered.

## Panel cleanup: a currency arguing with itself, and a box measured wrong (#197)

The approximate local price — "From ≈ ₱1,745.38" plus three lines of
qualification — sat under the price in the buy box, where a second currency
arguing with itself competed with the one number the shopper is actually
charged. Removed from the PDP along with the rate fetch that computed it
(`IndicativePriceLine` still ships in the cart, where the conversion note
earns its space closer to paying). The supplier fact table read "Weight 640
g" under a pair of jeans — CJ reports these as **packed** figures
(`packedWeight`, `packedDimensionsLabel` — "one reading per distinct box
size CJ reported"), and checkout quotes freight from the same
`weightGrams`; labelled plainly it read as the item's own weight, a
different and wrong claim. Relabelled "Package weight" / "Package
dimensions" with a provenance line saying which of the two things was
measured. And the ledger's own review row said "Nobody has reviewed this
one" where the card and the reviews section both offered going first — now
"None yet. Be the first to review this," matching the other two.

## Section order and panel colour, corrected the day after (#203)

Two owner corrections after seeing
[[sals3-session-2026-08-30-part110-the-sals3-sku-reaches-the-buyer|the Sals3
SKU change]] on live: its explanatory sentence — *"Sals3's own code for the
option selected above. Searchable."* — was cut, because two lines of
explanation beside a two-word label is the label admitting it does not
work, and this one does; the label collapsed from a two-row stack to one
row. And Supplier details moved to read straight after Product
specifications, since both are the same kind of thing (what the seller
declared, then what the supplier reported) and the description and reviews
sitting between them forced a buyer to scroll past both to compare two
tables about one product — new order: specifications → supplier details →
about → reviews → related. It deliberately stays on the page's 1152px
measure rather than joining the full-bleed white band above it, since a
second full-bleed white section would merge visually with the first. The
reviews panel background moved from `bg-surface` (the page's own tinted
ground, making the one bounded record on the page look disabled rather than
distinct) to `bg-white`, matching Supplier details.

## One grid, two fact tables — and why `auto-fit` broke them (#206)

Supplier details still read as awkward after taking the Specifications
format, because the two tables carried an **identical class string** and
still did not match: `auto-fit` deletes grid tracks that have nothing in
them and lets the survivors stretch, so a table's column width ended up
depending on how many facts the payload happened to carry. Measured: a
6-row/3-track specifications table rendered at 347px per row, a 2-row
table (its third track deleted) at 536px — same class, same page, visibly
different tables, with nothing having drifted; the strings were
byte-identical. `auto-fill` keeps the empty track instead, so two rows sit
in the first two columns of three at the width every other table uses. The
fix applies to **both** tables — a specifications table with four
attributes has the identical problem and nothing had stopped it there
either. The two class strings now live once, in `PRODUCT_FACT_GRID` /
`PRODUCT_FACT_ROW`, with a test asserting the two **resolved** classes are
equal rather than trusting that two copies of a string stay identical.

## The orphan row that no column count can fix (#207)

A short line still hung under Product specifications after #206. The
browser fills grid columns left to right, so the last row is orphaned
whenever the attribute count does not divide by the column count — measured
on a live product with 13 attributes over 3 columns: four full rows, then a
lone fifth cell whose row rule hangs 41px below its neighbours at a third
of the width. **No column count fixes this** — 13 is not divisible by 3,
the next product has a different count, and every alternative rule scheme
(border-top instead, drop the rule only from each column's last cell, flow
column-wise) just moves the short segment rather than removing it. The only
arrangement that cannot go ragged is the one with no rule to go ragged:
rows are now separated by rhythm (`py-2.5` → `py-3`) instead, applied
through the same shared `PRODUCT_FACT_ROW` so neither table can grow the
problem back independently. The band's own bottom border still closes the
table.

## Verification

#196: four ledger tests (one asserting the contradiction cannot return,
requiring no copy matching `/no reviews/i` or `/nobody has reviewed/i` when
a rating is present), plus the zero-state reviews-section tests down to the
five zero bars and the missing `0.0`; `npm run verify` clean including 63
e2e. **Not visually verified in a browser** — the local portal DB is
missing `product_media_sources.stored_url`, so a local PDP 503s. #197: two
guard tests (nothing approximate renders; the FX host is never called).
#203: two tests, both shown to fail without their change, one asserting DOM
order rather than a class so a future layout change cannot silently slide
the description or reviews back between the tables. #206: **1117 unit
tests (110 files)**, **63 e2e**, the equal-resolved-classes test reverted
once to confirm it fails. #207: **1117 unit tests (110 files)**, **63
e2e**; geometry measured from the live DOM rather than a screenshot, since
the Browser pane was hidden in that session.

## Lessons

- **An evidence ledger built to be checkable is discredited by one
  contradicted row**, not merely wrong by that row's own weight — a reader
  who catches one false fact in a "trust this" panel stops trusting the
  panel.
- **The one number an empty state must never print is the average as a
  literal zero.** "0.0" beside hollow stars reads as a verdict, not an
  absence; an em dash says the true thing.
- **A weight or dimension a supplier reports is the package's, not
  necessarily the item's**, and the label has to say which was measured
  once that distinction is real.
- **Two class strings that happen to be identical are not a shared
  contract** — `auto-fit` versus `auto-fill` broke two visibly matching
  tables that were, byte for byte, the same string, because grid track
  behaviour depends on how many cells are filled, not on the class name.
- **No column count eliminates an orphan row in a fills-left-to-right
  grid.** The fix that cannot regress is removing the thing that can go
  ragged (the rule), not tuning the count that produces the orphan.
