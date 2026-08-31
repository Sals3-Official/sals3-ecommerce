---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - checkout
  - performance
  - pdp
  - session-note
aliases:
  - Part 109
  - Checkout Stops Lying About The Price
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
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
---

# Part 109 — checkout stops showing a total it knows it will not charge, and the buyer chooses first

2026-08-30, `sals3-ecommerce`
[#199](https://github.com/Sals3-Official/sals3-ecommerce/pull/199)/[#202](https://github.com/Sals3-Official/sals3-ecommerce/pull/202)
and `sals3-portal`
[#279](https://github.com/Sals3-Official/sals3-portal/pull/279), no DDL.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## A silent price increase, discovered at the card form

A cart line stores the price it was added at. The checkout summary rendered
that stored figure through Information and Delivery, while Stripe was
handed `validateCheckoutCart`'s output — the current price read back from
the Portal at pay time. Observed on a real order: US$125.58 shown on both
steps, $126.87 asked for on the card form, because one beanie had moved from
$86.40 to $87.69 while it sat in the cart. The charge was never wrong — the
Portal is the price authority — what was wrong is that the buyer was shown a
figure the checkout already knew it would not honour.

#199's fix reprices **once**, when checkout opens, through the same
`validateCheckoutCart` that decides the charge — deliberately not a second
reader that could agree today and drift tomorrow. Corrected prices are
written onto the cart lines, so the summary, the free-shipping threshold and
every step's totals are all the figures that will actually be charged. Where
a price moved, it is said out loud with both numbers: "Mohair Knit Beanie:
US$86.40 US$87.69" — a fall is reported too, since a buyer charged less than
the number they agreed to has still been shown something untrue.

Three judgement calls: **once, not per step** — the three checkout routes
share one mounted layout, and repricing under someone at the payment screen
would recreate the defect in a new place; the pay path revalidates
server-side regardless, which is what actually protects the charge.
**Advisory, not blocking** — a Portal outage leaves the buyer with the
prices they had and the flow continues, since `createCheckoutSessionAction`
still validates before charging and refuses a cart it cannot price; blocking
checkout on an advisory read would turn a display problem into a lost order.
**No session check on the reprice action**, unlike its neighbours — it
spends no money and no supplier quota and reads only prices already public
on every product page, so requiring a session would leave a signed-out
buyer at checkout still shown stale figures, the exact defect. Still
outstanding: the cart page itself still shows the added-at price.

## Nothing is chosen for the buyer, and the page reads faster

#202 covers five owner-directed changes plus two defects found while
building them. A product with options now arrives with **no variant
selected** — Add to Cart and Buy Now are disabled until the buyer picks
one, with the reason printed above them (`Choose a colour to continue.`,
naming the seller's own word for the axis). This **reverses the 2026-08-21
decision** that had `defaultVariantFor` preselect an available variant at
the feed price; that helper is deleted along with its tests, and ADR-016's
constraint against a preselection moving the lead price no longer applies
because nothing is preselected. Two products still arrive buyable: one
variant, or none at all.

The Sals3 SKU (added in
[[sals3-session-2026-08-30-part110-the-sals3-sku-reaches-the-buyer|part 110]])
moves onto the specifications heading line, and stops rendering in
`font-mono` — that class had never actually been monospaced, since
`layout.tsx` loads only Plus Jakarta Sans, Outfit and Instrument Sans, so it
fell through to whatever the reader's OS had (Consolas on Windows, Menlo on
macOS), which is why the code read as pasted in from elsewhere.
`ProductQuantityStepper` lets a buyer add more than one without a trip to
the cart afterward, sharing `MAX_LINE_QUANTITY` with `CartLineItemRow`
rather than restating it. Add to Cart confirms **in place** — the same
button, teal with a check, for 1100ms — keyed on a new `lastAddedAt` rather
than `itemCount`, because the count also changes when the cart hydrates from
`localStorage` and a badge watching the count would bump on every page load
with a non-empty cart.

Reading faster: the product page read caches for **60s only for the
storefront-caller**, defaulting to `'checkout'`'s uncached `no-store` value
because the same function serves `validateCheckoutCart`, which decides the
price the buyer is charged; caching by caller rather than by endpoint is the
whole point. `validateCheckoutCart` now issues one request per **product**
rather than one per line — a cart of one product in five sizes had asked
the same question five times. Deliberately not done: overlapping the cart
read with the freight quote on the pay button, since a test says no freight
quota may be spent when a price has moved and the quote dominates the wait
anyway.

Two defects a browser found and the tests could not: a disabled Buy Now
kept the full brand gradient, because `.bg-brand-gradient` is an unlayered
rule in `globals.css` and CSS ranks unlayered declarations above `@layer
utilities`, so `disabled:bg-none` beside it never applied — hidden for
months because this button was almost never disabled before the new gate
existed. And two quick presses of the quantity stepper's `+` gave 2, not 3,
because the handler read `value + 1` from the render it was clicked in and
two clicks inside one React batch computed the same number — fixed by
sending a delta the parent applies functionally.

## The portal side of the same slow-checkout report

`sals3-portal` #279: `loadPackageInputs` asked CJ two unrelated questions
per product — `/product/query` and
`/product/stock/getInventoryByPid` — one after the other, on the buyer's
critical path twice (once at the delivery step, again when the pay button
re-quotes). `CJ_REQUEST_TIMEOUT_MS` is 8s, so a slow CJ turned the serial
pair into a 16-second wait on a button already pressed. Fixed with one
`Promise.all`; both calls' errors still surface in the same order as
before, so a malformed detail response still reports itself rather than
whichever call happened to fail first. CJ points, auth (already
single-flighted through `CjTokenManager`) and schema are all untouched —
only the timing moves. Still open: the pay button re-runs the entire quote
to verify the buyer's selection, a second full round of CJ calls; removing
that duplicate needs either a stored or a signed quote, both owner
decisions, left out deliberately. `QUOTE_TTL_MS` already declares a quote
good for 15 minutes, which is consistent with reusing one inside that
window.

## Verification

`sals3-ecommerce` #199: `npm run verify` clean end to end. #202: **1095
unit tests passed (109 files)**, **63 e2e passed**, `npm audit
--audit-level=high` 0 high/critical. `sals3-portal` #279: **3496 unit tests
passed / 4 skipped**, e2e 56 passed / 19 skipped (pre-existing
no-`DATABASE_URL` skips).

## Lessons

- **A checkout summary and the charge it leads to must read the same
  price source.** Two readers that can agree today and drift tomorrow is
  the shape of a silent increase discovered at the point of payment.
- **Advisory reads should fail open; the charge-time read must fail
  closed.** The reprice-on-open action degrades to stale prices rather than
  blocking checkout; `createCheckoutSessionAction` is what actually refuses
  an unpriceable cart.
- **An unlayered CSS rule outranks a `@layer utilities` rule regardless of
  source order** — a `disabled:` variant sitting beside an unlayered
  gradient class can be permanently dead and invisible until the element is
  actually disabled for the first time.
- **Two independent CJ questions about the same product belong in one
  `Promise.all`**, not because the total number of calls changes, but
  because the buyer is waiting on the slower of the two either way.
