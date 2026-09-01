---
tags:
  - sals3
  - sals3-ecommerce
  - cart
  - checkout
  - session-note
aliases:
  - Part 123
  - The Cart Learns To Forget Some Of Itself On Purpose
created: 2026-09-01
updated: 2026-09-01
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-09-01-part121-free-shipping-gets-a-dollar-figure-and-a-country]]"
  - "[[usetransition-ispending-lags-committed-state]]"
---

# Part 123 — the cart learns to forget some of itself, on purpose

2026-09-01, `sals3-ecommerce`
[#225](https://github.com/Sals3-Official/sals3-ecommerce/pull/225)/[#226](https://github.com/Sals3-Official/sals3-ecommerce/pull/226)/[#227](https://github.com/Sals3-Official/sals3-ecommerce/pull/227)/[#228](https://github.com/Sals3-Official/sals3-ecommerce/pull/228),
no DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Removing a line from checkout is an invalidation, not just a write (#225)

The order summary at `/checkout` and `/checkout/delivery` listed every line
with no way to drop one — a buyer who changed their mind had to leave
checkout and edit the cart directly. `removeLine` in
`CheckoutFlowProvider` now calls the cart's `removeItem` **and** the existing
`invalidateQuote` together, because a courier quote is priced for one
specific basket: drop an item and the delivery-step price, the selected
shipping option, and any already-prepared Stripe session all describe an
order the buyer is no longer placing. `invalidateQuote` already existed for
exactly this reasoning — it fires on every address edit — so this is one
function now doing both writes rather than two callers that could drift.
The control is disabled while a quote or payment preparation is in flight,
and its accessible name includes the product ("Remove Cold-Proof Face Mask
from this order") rather than a bare "Remove" repeated on every line.

### The race the delivery-step test found

Removing a line while a courier quote is already showing bounces the buyer
back through `/checkout/delivery` → `/checkout` to re-quote, since
`CheckoutDeliveryStep` already treats a cleared quote exactly like a cold
reload. The test for that path failed intermittently under the full parallel
test run — passed alone every time, failed roughly 1 in 3 times under load —
in a pattern that looked exactly like the CPU-contention flake this
repository's e2e suite already documents.

It was not that. Instrumenting the render found the real cause: a
`useTransition`-driven quote fetch can commit its own state — making the
delivery step's radios render, the only thing the test's `reachDelivery()`
helper waited on — **one or more renders before `isPending` itself settles to
`false`**. The Remove button, disabled by that same `isPending`, was still
genuinely disabled at the moment of the very next click on a fraction of
runs. React's synthetic event system silently drops a click dispatched at a
disabled element regardless of how the DOM event itself was raised — a raw
`addEventListener` on the same node still fired, which is the diagnostic that
separated "React declined the click" from "the DOM never received it."

Raising the timeout made the failure *harder* to see, not easier — it failed
just as reliably at 15 seconds as at 1 second, because a longer wait does not
change the odds of hitting the race, only how long a failing run takes to
report it. The fix waits on the delivery step's own "Go to payment" /
"Preparing payment…" label — an existing idiom in the file for a real
synchronization point tied to that same `isPending` — instead of waiting on
the transition's committed *value*, which can render first. See
[[usetransition-ispending-lags-committed-state]].

## Per-line selection (#226)

Every cart line checked out together, with no way to buy only some of it. A
per-line checkbox (Shopee/Lazada-style, beside the product image) plus a
master "Select all" checkbox now controls this. "Buy Now" on the PDP narrows
selection to just the line it adds before landing on `/cart` — without this,
pressing Buy Now on a cart already holding three earlier saves would silently
check out four things instead of one.

Three places had to move together, because a checkbox that only affected
what's *displayed* would be worse than no feature at all — it would look
like control the buyer doesn't actually have:

- **`CheckoutFlowProvider` operates on the selected subset.** An unchecked
  line is never quoted, priced, or included in the Stripe session — not just
  hidden from the summary. `CheckoutFlowChrome` gained a second empty state
  ("nothing is selected"), kept apart from a genuinely empty cart, since "add
  something" and "go back and check something off" are different
  instructions sending the buyer to different places (`/` vs `/cart`).
- **`CheckoutCartCleanup` removes only what was selected**, not the whole
  cart — once partial selection exists, clearing everything on a paid
  checkout would delete lines the buyer deliberately excluded and never
  paid for. `clearSelectedItems` resets selection on whatever remains, so it
  starts fully selected again for the next purchase.
- **`useCartReprice`** (unchanged code, changed input) reprices the selected
  subset on both the cart page and at checkout, matching what is actually
  about to be charged.

`FreeShippingNotice` (part 121) deliberately keeps reading the whole cart's
subtotal rather than the selection — it is advisory copy shared with the
PDP buy rail, where selection does not exist, and nothing there charges
anyone.

Selection is stored as an **opt-out set**
(`CartState.deselectedLineIds`), not opt-in: a newly added line is never in
it, so it is selected the instant it exists. This also means a
`sals3-cart-v2` blob written before selection existed still parses correctly
with the field absent — Zod defaults it to `[]`, so every pre-existing cart
opens with everything selected rather than everything hidden.

**One documented, deliberately unfixed gap:** `clearSelectedItems` reads
selection **at cleanup time**, not at the moment the Stripe session was
created. A buyer changing checkboxes in a second tab while an embedded
payment completes in the first could see a different set removed than they
actually paid for. Narrow, since payment stays single-tab in the normal flow,
and closing it properly means threading the checked-out line ids through
Stripe metadata — a separate, larger change, recorded on
`CartProvider.clearSelected`'s own doc comment rather than left as a silent
surprise.

## A screenshot review, three fixes (#227)

**Checkbox not level with the product image.** Measured, not eyeballed: the
checkbox's 44px hit target was top-anchored while the product image centred
itself within the row's content box on its own — a flex quirk of the default
`align-items: stretch` acting on an item with a fixed aspect ratio. Before
the fix the checkbox glyph's centre sat 24px above the image's own centre on
both rows; `self-start` → `self-center` closes that to 0px, confirmed with
`getBoundingClientRect()` in a real browser.

**The PDP stopped naming a guessed country.** "Your cart already qualifies
for free Standard delivery **to the Philippines**" — added the same day in
part 121's #224 — reverses here. Naming a specific destination is a stronger
claim than a dollar figure: it asserts *where this buyer is*, off nothing
sturdier than `resolveDestination()`'s geo-IP guess. The dollar amount stays
("Add US$X more for free Standard delivery"); only the country is gone, from
both the visible copy and the progress bar's `aria-label`, so a screen-reader
user is not told something a sighted reader no longer is. `destinationLabel`
remains a real prop — it still gates whether an estimate shows at all.

**Free shipping moves off `teal-500` onto the Sals3 brand blue.** Teal was
confirmed genuinely correct and correctly wired (`getComputedStyle` returned
`rgb(21,127,127)`, ruling out a Tailwind-default-color collision) but read as
an outlier against a storefront that is almost entirely navy-to-blue.
Recoloured to `brand-600` (`#0a5c8a`, already used for every link on the
site) across all three places the treatment appears — `FreeShippingNotice`,
`CheckoutFreeShippingProgress`, and the PDP glow keyframe's raw `box-shadow`
channels in `globals.css` — keeping the same opacity pattern (`/45`, `/8`,
`/15`) so the three surfaces keep reading as one thing while moving on-brand.

## Two more from the same review (#228)

**The master checkbox still wasn't in the same column.** Measured again: the
master checkbox sat exactly 14px left of every row checkbox — its label put
the glyph directly against the label's own `p-3.5` padding, while a row's
glyph sits inside `CartLineItemRow`'s 44px centred hit target (14px of row
padding plus another 14px of internal centring, 28px total). Wrapping the
master checkbox in the same 44px box closes the gap; confirmed with
`getBoundingClientRect()` on a 3-item cart — all four checkboxes report the
identical `left: 110`.

**Newest item now shows first.** `addCartItem` appends, so cart storage has
always been oldest-first — correct for that function, since a repeat add
needs to find the same array index to update in place. A buyer expects the
opposite when looking at the list: the thing they just added should be the
first row seen, not the last. The cart page now renders a reversed copy of
`items` for display only; every id, selection state, and quantity handler
stays keyed off the real, untouched array.

## Verification

#225: `npm run verify` green; the new delivery-step test run 5× under the
full default parallel worker count with zero flakes, where it had failed
intermittently before the fix. #226: `npm run verify` green — 1,218 unit
tests (21 new, up from 1,197), 63 e2e; every pre-existing test passed
**unmodified**, since selection defaults to "everything selected," exactly
what every prior single-line-cart test already assumed. Manually verified in
a real browser: checking/unchecking narrows Items/Subtotal live, the master
checkbox shows a real indeterminate state on partial selection, and
deselecting everything swaps "Proceed to Checkout" for a disabled "Select an
item to check out" control. #227: `npm run verify` green — 1,218 unit, 63
e2e; checkbox-to-image alignment measured exactly 0px on both cart rows, the
notice's computed text colour exactly `#0a5c8a`. #228: `npm run verify`
green — 1,219 unit tests (one new, locking in newest-first order), 63 e2e;
manually confirmed the checkbox column and a freshly-added third item landing
on top, together.

## What was not done

The cross-tab selection/payment race documented on
`CartProvider.clearSelected` is left open by design — threading selected
line ids through Stripe metadata is named as the real fix and deferred as a
separate, larger change.

## Lessons

- **A `useTransition`'s committed *value* and its `isPending` flag are not
  guaranteed to settle in the same render.** A disabled-while-pending control
  can still be genuinely disabled on the render immediately after the value
  a test is watching has already changed — waiting on a rendered label tied
  to the same `isPending` is the fix, not a longer timeout. See
  [[usetransition-ispending-lags-committed-state]].
- **A feature that changes selection but not what gets charged is worse than
  no feature.** Per-line selection required three separate call sites
  (checkout quoting, cart cleanup, repricing) to all read the same subset —
  a checkbox that only changed the display would have looked like control
  the buyer didn't actually have.
- **An opt-out data shape survives an old stored blob for free.** Storing
  `deselectedLineIds` rather than a selected-set meant a `sals3-cart-v2` blob
  written before selection existed still parses correctly with the field
  absent, defaulting to "nothing deselected" — the natural reading for data
  that predates the concept.
- **A claim about a buyer's location is a stronger promise than a dollar
  figure, off the same signal.** Naming "the Philippines" from a geo-IP guess
  and quoting "US$12 more" from the same guess are not equally risky claims;
  the amount stayed, the country did not, on the same day it was added.
