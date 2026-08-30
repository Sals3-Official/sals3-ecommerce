---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - orders
  - reviews
  - analytics
  - session-note
aliases:
  - Part 99
  - A Sale Is A Delivery Not A Payment
  - The Sold Tab
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[sals3-session-2026-08-28-part95-the-orders-workspace-meets-real-rows]]"
  - "[[sals3-session-2026-08-22-part69-buyer-reviews-shipped-and-the-read-that-would-have-taken-orders-down]]"
  - "[[sals3-session-2026-08-25-part75-aj-a-department-to-browse-and-a-review-from-the-order-list]]"
---

# Part 99 — a sale is a delivery, not a payment

2026-08-30. The Portal gained a **Sold** tab, then a date filter and a CSV
export, and then the owner changed what the word *sold* means — which turned a
join this module had deliberately avoided into the join it requires. The same
figure travels to the buyer-facing product card in the storefront.

| PR | |
|---|---|
| `sals3-portal` [#253](https://github.com/Sals3-Official/sals3-portal/pull/253) | count what each product has actually sold |
| `sals3-portal` [#258](https://github.com/Sals3-Official/sals3-portal/pull/258) | filter the Sold tab by date, and export it |
| `sals3-portal` [#263](https://github.com/Sals3-Official/sals3-portal/pull/263) | a sale is a delivery, not a payment |
| `sals3-ecommerce` [#192](https://github.com/Sals3-Official/sals3-ecommerce/pull/192) | show units sold on the product card |
| `sals3-ecommerce` [#193](https://github.com/Sals3-Official/sals3-ecommerce/pull/193) | invite the first review instead of noting its absence |

No DDL on either side, and no new column anywhere.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The live-account
> figures (83 paid, 5 delivered) are those records' own measurements.

## 1. Counted from rows the database already holds

Nothing was added to store this. `sals3_order_lines` freezes `product_id`,
`quantity` and `unit_amount_minor` at acceptance, and `sals3_orders.payment_status`
says whether the money stood.

- **No new column.**
- **No denormalised counter to drift.**
- **No CJ call** — which the operating contract's call budget requires checking
  before any new read, and which is the difference between a figure that costs
  points every page load and one that costs a query.

Three decisions were load-bearing from the first commit:

| decision | why |
| --- | --- |
| **Tenancy through `sals3_order_lines.supplier_connection_id`**, which is `NOT NULL` | Routing through `fulfillment_groups` the way the review reader must would silently drop any line not yet grouped into a parcel, **understating the seller's own sales**. |
| **Only `PAID` counts**, and `refundedUnits` is returned beside the total | The number can therefore *go down*. The tab says so above the first figure, **or a correct decrement reads as a bug**. |
| **Review tallies are a second query merged by product id, never a join** | A join fans each order line out into one row per review and **multiplies every quantity by it**. |

Card aggregates are **omitted rather than zeroed** when there is nothing to say,
so a card cannot render "0 sold" from a key that is not there. A failure to
count is logged and costs the aggregate rather than the catalogue — the same
rule the rating summaries already follow.

## 2. Two shapes of window, because they answer different questions

| form | who wants it | property |
| --- | --- | --- |
| relative — `?range=30d` | a seller checking in | **stays true when the link is opened next week** |
| absolute — `?from=&to=` | someone reconciling a month | **must not drift**, so a preset never bakes today's date into the URL |

Explicit bounds win when both are present.

**Filtered on `sals3_orders.created_at` — when the money cleared.** Deliberately
*not* the delivery date: that would move a sale between months depending on how
long CJ took to ship it, and **a seller reconciling August would find August
changing under them.**

The inclusive end date is pushed to the following midnight, or every order
placed on the last day of the window disappears from the total.

## 3. The export, and why every cell is quoted

`GET /api/portal/sales/export` returns the same rows as CSV. It **resolves the
seller from the session and never from the query string** — the response carries
revenue — and shares `parseSoldRange` with the screen, so the file cannot drift
from the table it claims to be.

**Every cell is quoted, always, not only when it contains a delimiter.** A title
carrying a comma, a quote or a newline is ordinary, and conditional quoting is
where hand-rolled CSV writers usually break.

**Formula injection is defused at the cell.** Any value opening with `=`, `+`,
`-`, `@`, or a bare tab or carriage return is prefixed with an apostrophe:

> A product title is seller-authored text, and Excel, LibreOffice and Sheets all
> treat a leading `=` as a **formula**. `=HYPERLINK("http://evil","Click")`
> stops being a title the moment the file opens — the export becomes an
> execution vector against whoever opens it.

The apostrophe is the standard defusal: spreadsheets read it as "this is text",
strip it on display, and the seller sees their title.

**Money leaves as a bare major-unit decimal with the currency in its own
column.** `formatMinorUnits` renders `1,129.99 USD` for the screen, and a
spreadsheet cannot sum that — the comma and the suffix make it a string, which
defeats the whole reason somebody exports rather than reading the screen.

## 4. The review prompt was pointing at parcels in the air

Found while building the date filter. *"Selling, never reviewed"* counted every
product with a sale and no review and called them the **fastest reviews to
win**. Most of them were **not winnable at all**.

A review is gated on `REVIEWABLE_PARCEL_STATE` — the parcel has to be
`DELIVERED` — and **CJ transit runs two to four weeks**. On the live account
that day: **83 units sold against 5 delivered.**

So each row gained `deliveredUnits`, joined through `fulfillment_groups` per
product, and the tile counted only products that had **arrived** and had no
review. Products sold but not yet arrived were named separately underneath
rather than folded in or hidden — the seller should know they exist and know why
they are not counted. Renamed to **"Delivered, not reviewed"**, because the old
label described the old rule.

> [!IMPORTANT] The same join, opposite reasons
> The sales aggregate **avoids** `fulfillment_groups` because a nullable
> `fulfillment_group_id` would drop ungrouped lines and understate sales. The
> review prompt **requires** it, because a line with no parcel has definitionally
> not arrived. One nullable foreign key, two correct and opposite readings.

## 5. Then the owner changed what "sold" means

Owner decision, 2026-08-30: **a unit counts once both halves are true — the
payment cleared and the parcel reached `DELIVERED`.** Goods still in the air can
be lost or refused, and counting them early counts something that may never
happen.

This applies **everywhere the figure appears**: the Sold tab headline, the
per-product table, the revenue, the CSV export, and the "N sold" on the
storefront card. *A shopper reading it should be reading how many people
received one, not how many paid.*

**It costs something real.** The number lags the money by two to four weeks and
sits far below the count of paid orders — **5 against 83** on the live account
that day. So `inTransitUnits` is returned and rendered beside the headline:
without it, a seller who remembers taking the order would find it simply absent
and reasonably conclude the page was broken.

The parcel join is now **required**, and that **flips the earlier hazard rather
than repeating it**. Under the delivered rule, dropping a line with no parcel is
the *correct* behaviour. Tenancy still runs through `supplier_connection_id`,
which is `NOT NULL`, **so scope never depends on a parcel existing** — that
separation is what makes the flip safe.

`deliveredUnits` is gone from the row — under this rule it was just `units` —
and the review tile is **"Sold, not reviewed"** again, actionable now for the
reason it was not before: **every product it names is one a buyer is already
holding.**

## 6. What the buyer sees

`sals3-ecommerce` #192 gives the card **one evidence line under the title**
holding whatever is actually known: the buyer rating, the units sold, or both,
separated by a dot.

- `soldUnits` is a new **optional** field on the storefront card contract.
- Refunded and disputed lines are excluded, so **the figure can go down**.
- Each half renders only when it is real, and **the whole row is absent when
  neither is** — not a greyed star row, not reserved space, and never `0 sold`.
- **The schema enforces the same rule from the other side**, omitting the key
  rather than sending a zero, so a card cannot render a nought from something
  that is not there.

> On a young catalogue a wall of zeroes reads as *"nobody buys here"*, which the
> absence of sales does not support.

`.catch(undefined)` sits on the field for the same reason `listing` on an order
line has it: **a malformed aggregate must cost the line, never the product** —
the salvage-granularity rule this vault already carries.

#192 also corrects a README claim that no live product carries a rating. That
stopped being true once buyer reviews started landing; the decision not to ship
a rating filter still stands, for a different and now accurate reason.

#193 replaces the empty case. A card for a product nobody has reviewed used to
show nothing; it now carries **"Be the first to review"**.

**That is a reframe, not a claim.** *"No reviews yet"* states a deficit and asks
the shopper for nothing; the same fact offered as an opening leans on the one
thing reliably true about going first — that somebody has to. It is deliberately
quiet: **no urgency, no count of people looking, no scarcity, no invented
number.** A product that has already sold keeps its count *in front of* the
invitation, because the sold figure does the persuading and the invitation only
asks for the half that is missing.

**It stays text, never a control.** The whole card is already a link to the
product page, which is where a shopper can act, and a button labelled *review*
that led anywhere else would say one thing and do another. It could not be
honoured immediately in any case: reviewing is gated on the parcel being
delivered, which is weeks away on this catalogue.

The star beside it is **hollow and stays hollow** — filling it would draw a
rating that does not exist — and `0 sold` is still never printed.

## Carry-forward

- **The storefront figure now lags by CJ transit.** A seller who ships a
  campaign and watches the card will see nothing move for two to four weeks.
  That is the decision, not a defect, but nothing on the storefront explains it
  to a shopper.
- **`inTransitUnits` exists only in the Portal.** The buyer-facing card carries
  the delivered count with no companion figure, which is correct for a shopper
  and means the two surfaces show different numbers for the same product.

## Lessons

- **A nullable foreign key has two correct readings, and which one is right
  depends on the question.** Joining through `fulfillment_group_id` understates
  sales and is the only way to count arrivals. The same module does both, in
  different places, on purpose.
- **Tenancy must not ride on an optional relationship.** Scope goes through
  `supplier_connection_id` (`NOT NULL`) precisely so the parcel join can be
  added, removed or reversed without ever changing who can see what.
- **A number that can go down has to say so where it is read.** Refunds make the
  sold count decrease, and an unannounced decrement is indistinguishable from a
  bug.
- **A join is not a merge.** Tallying reviews with a join multiplies every
  quantity by the review count; a second query merged by id is the only correct
  shape.
- **Omit rather than zero.** `0 sold` and "no data yet" are different facts, and
  a schema that sends `0` makes them the same one for every consumer downstream.
- **Every exported cell is untrusted text.** Seller-authored titles reach a
  spreadsheet as formulas unless something defuses them at the cell.
- **Changing a definition is a product decision with a measurable cost.**
  "Delivered" is the honest number and it is 6% of the paid one on this account;
  shipping it required showing the difference, not hiding it.
