---
tags:
  - sals3
  - sals3-portal
  - product-editor
  - media
  - accessibility
  - markets
  - session-note
aliases:
  - Part 101
  - Two Editor Panels That Were Showing Nothing
  - The Picker With One Row
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[sals3-session-2026-08-28-part91-a-third-market-its-towns-and-the-first-free-shipping-line]]"
  - "[[sals3-session-2026-08-30-part100-one-price-per-destination-in-the-money-that-destination-thinks-in]]"
  - "[[sals3-session-2026-08-28-part87-two-budgets-for-one-twelve-and-the-gallery-that-was-holding-the-variant-photos]]"
---

# Part 101 — two editor panels that were showing nothing

2026-08-30. Two Product Editor panels looked finished and were not: one offered
a control that fires from a mouse and nothing else, the other offered a picker
with a single synthetic row that changed nothing on the card beneath it.

| PR | |
|---|---|
| [#255](https://github.com/Sals3-Official/sals3-portal/pull/255) | supplier photos get a cover button, not a 44px grip |
| [#259](https://github.com/Sals3-Official/sals3-portal/pull/259) | the storefront preview runs the three checkout markets |

No schema, no migration, no new server module, no API route in either.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## 1. The control that fires from neither keyboard nor touch

The **Original photos** panel rendered **44px tiles** whose only control was a
native drag grip. The owner reported both as unusable, and the grip was the
worse half:

> `<span draggable>` fires **HTML5 drag**, which fires from neither keyboard nor
> touch.

So on a tablet the supplier's photo order could not be changed **at all**, and
the decision that matters most — **which photograph a buyer meets first** — was
reachable only with a mouse.

Tiles are now **150–168px** on a container-query grid that keeps them in that
band from 2 columns to 6, and every control is a **real button**: `Set as cover`
sends a photo to the front, two chevrons move it one place.

### `Set as cover` is not new authority

This is the load-bearing claim, and it is worth stating carefully because the
panel sits inside ADR-011's supplier-original preservation rules:

- The cover **is position 0 of the whole gallery**.
- This panel **already wrote position 0** whenever the seller had uploaded
  nothing — **the drag was choosing a cover without saying so.**
- `reorder-product-media.ts` already describes it in those words.

So the button **names what the drag did** and adds the keyboard. Deleting and
replacing stay refused here, and in `delete-seller-media.ts`'s own `WHERE`.

The reorder call is **byte-identical** to the one the drag issued.

### The label follows who actually holds position 0

`composeGalleryOrder` is `[...seller uploads, ...supplier photos]`. Once a
seller upload exists, **nothing in this panel can reach the cover** — so a badge
or a button claiming otherwise would be asserting something the storefront
contradicts.

With `sellerGalleryCount > 0` the panel claims no cover, **says who has it**, and
the button reads `Move to front`. Same write, honest name.

> [!NOTE] Scope was fixed by the owner
> Owner rule 2026-08-30: fix **only** the supplier *Original photos* panel.
> Product media (the seller's own photos) is accepted as it stands. This PR
> holds that line — presentation and one prop.

## 2. A market picker with one synthetic row

The Preview market picker listed **one row and changed nothing.**

- `editorMarkets()` returns a single entry coded **`DB`**, named *"Configured
  offer market"*, so the control literally read `DB` and offered no alternative.
- `previewMarketCode` was consumed by the `<Select>` that set it **and by
  nothing else.**
- The card underneath rendered `variant.retailPrice` **whichever market was
  chosen.**
- Same for the variant picker, which showed a **raw UUID**: a bare
  `<SelectValue />` prints the stored value, not a label.

**That single row is right for what it was built for** — the Markets tab's
evidence card, describing the one market this product is actually offered in,
because `publish.ts` takes `offerDestinations[0]`. The preview *borrowed* the
list and inherited a shape that was never meant to answer *"what does this look
like in Fiji"*.

The two are now separate: the evidence card keeps its configured market, and the
preview lists the destinations **a buyer can complete a purchase to**, resolving
each one's real price through the same `pricesByDestinationAction` the Variants
& Pricing tooltip uses (see
[[sals3-session-2026-08-30-part100-one-price-per-destination-in-the-money-that-destination-thinks-in|part 100]]).

## 3. Three, not six — and one home for the three

`listPricingScopeDestinations()` offers **six**, because a margin may be set for
any of them. `freight-quotes.ts` can only quote **AU, PH and FJ**. A buyer in New
Zealand can browse and can be priced, and then gets **no freight quote at all**,
so no order exists to preview.

`modules/market-config/checkout-destinations.ts` is the one home for those three
codes. They had already been written down **twice** —
`CHECKOUT_FREIGHT_COUNTRIES` in `freight-quotes.ts` and the keys of
`FREE_SHIPPING_ENV_KEYS` in `free-shipping.ts` — and this would have made three.

Both now read it, and **the free-shipping map is keyed by the shared type, so
opening a fourth destination fails to compile rather than shipping a market with
no threshold.**

The module states three lists and three questions explicitly, which is the part
worth carrying forward:

| list | question |
| --- | --- |
| `resolveBuyerDestinationCountryPolicy()` | which six countries a candidate may be **screened** for |
| `listPricingScopeDestinations()` | which six a **margin** may be set for |
| `CHECKOUT_DESTINATION_CODES` | which three can be **checked out to** |

> Adding a code here is not what opens a market. A destination becomes
> checkout-capable when freight can be quoted for it, a free-shipping threshold
> is configured, and its address rules are written — the 2026-08-28 Fiji work is
> the worked example. **This list records that decision; it does not make it.**

**Nothing had asserted what the checkout country enum admits,** which made moving
it unguarded: pointed at the pricing list it would have accepted NZ/US/CA
addresses CJ cannot quote, **failing at the supplier call instead of at
validation**. `freight-quotes.test.ts` now pins both sides, and the guard was
checked by widening the list and watching it go red.

## 4. Priced in three markets is not on sale in three markets

The second commit closes the gap the first one opened. The panel now prices all
three checkout destinations, which answers *"what would this cost in Fiji"* —
and **not** *"can anyone in Fiji buy it"*.

Those differ, and today they usually disagree: `publish.ts` takes
`offerDestinations[0]`, so **a product carries exactly one offer while the
preview prices three markets.** A Philippines preview could therefore quote a
price for a product no Philippines buyer can open.

`offeredMarketCodes` carries the markets holding a **`PUBLISHED`** offer,
derived from the offers the catalogue read **already fetches — no extra query**
— and threaded to the panel. Three states, three sentences:

| state | what it says |
| --- | --- |
| a market **with** an offer | nothing |
| a market **without** one | it is not on sale there, and **names where the product *is* published** |
| a product published **nowhere** | says that, instead of accusing one market |

**The price stays visible in every case.** Hiding it for an unoffered market
would remove the number the seller needs in order to decide whether publishing
there is worth it — *the warning is about the shopfront, not about the price.*

`offeredMarkets()` is **exported and pure** for the same reason `mediaStatusOf`
is: the `PUBLISHED` predicate is the whole behaviour, and left inline in the
query path it is the one line no test would ever run. It now has one, including
every state that must not count.

## Carry-forward

- **`publish.ts` still writes one destination per product.** The preview now
  makes that visible on screen, which is the first surface in the Portal that
  says so plainly. Widening publication to more than one destination remains
  unbuilt.
- **The three-versus-six gap is now stated in code**, in
  `checkout-destinations.ts`'s own header, rather than only in this vault.

## Lessons

- **A drag handle is a mouse-only affordance.** HTML5 drag fires from neither
  keyboard nor touch, so a decision reachable only by dragging is a decision a
  tablet user cannot make.
- **Naming what a control already does is a fix.** The drag was choosing the
  cover silently; the button changes no permission and no write, only what the
  seller can see and reach.
- **A label must follow the data, not the panel.** Once a seller upload holds
  position 0, a supplier tile claiming "cover" is contradicted by the
  storefront — so the panel checks and renames itself.
- **A picker whose value is read by nothing is not a picker.** `previewMarketCode`
  was consumed only by the `<Select>` that set it, and the card below ignored it
  entirely; nothing failed, so nothing reported it.
- **A bare `<SelectValue />` prints the stored value.** A UUID on screen is the
  visible symptom of a missing label, not a data problem.
- **A constant written down three times is a compile error waiting to be
  configured away.** One home, keyed types, and opening a fourth market now
  fails the build instead of shipping a market with no shipping threshold.
- **Pricing a market and offering a market are different facts.** Answering the
  first while looking like the second is how a seller concludes a product is on
  sale somewhere it is not.
