---
tags:
  - sals3
  - sals3-portal
  - pricing
  - fx
  - catalog
  - session-note
aliases:
  - Part 100
  - One Price Per Destination
  - The Column That Named No Country
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-28-part94-the-storefront-buffers-on-the-sellers-own-rate]]"
  - "[[sals3-session-2026-08-27-part80-a-global-scope-for-the-countries-with-no-column]]"
  - "[[sals3-session-2026-08-08-part19-owner-decision-cj-wallet-and-multi-supplier-roadmap]]"
---

# Part 100 — one price per destination, in the money that destination thinks in

2026-08-30. `Retail price` was **one number under a heading that named no
country**, and the markups genuinely differ by destination — so the column was
true in one country and wrong in three, with nothing on screen saying which.
Three pull requests: one makes the column answer, one puts each answer in the
currency a buyer there thinks in, and one removes a control that had been added
the same day.

| PR | |
|---|---|
| [#249](https://github.com/Sals3-Official/sals3-portal/pull/249) | hovering a price shows what it is in each destination |
| [#261](https://github.com/Sals3-Official/sals3-portal/pull/261) | show each destination's price in its own currency |
| [#262](https://github.com/Sals3-Official/sals3-portal/pull/262) | drop the fourth way to open the same list |

No DDL in any of them, and nothing here reaches the pricing resolver's stored
output.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The markup spread
> and the ECB currency coverage are those records' own measurements, dated
> 2026-08-29 and 2026-08-30 respectively.

## 1. The column was one destination's answer

`pricing-guidance.ts` resolves **the seller's active profile market and nothing
else**. On 2026-08-29 the same product carried:

| destination | markup |
| --- | --- |
| AU, PH, FJ | 200% |
| NZ, US, CA | 0% |

So `Retail price` showed a number that was correct for one country and wrong for
three, under a heading naming none of them. Hovering the price now asks, and
answers with every destination.

**Asked on demand, not resolved with the page.** The arithmetic behind that
decision is worth keeping:

- `resolveProductPricing` is about **six queries**.
- The editor already runs one call per variant, so a 27-variant product is
  roughly **162 queries** for a page load.
- Resolving every destination eagerly would make that roughly **1,100 queries**
  to render a table most sellers never interrogate.

What ships runs **six queries, for the one row somebody is looking at, once per
mounted row.**

**It re-runs the resolver rather than scaling the number already on screen.**
Multiplying by the ratio of two markups would be a second implementation of the
pricing sum, and this codebase has already paid for one of those:
`lib/storefront/fx.ts` carried a hard-coded buffer while the screen a seller
edits showed a different one, and the two drifted because nothing forced them to
agree (see [[sals3-session-2026-08-28-part94-the-storefront-buffers-on-the-sellers-own-rate|part 94]]).

**A destination the rules refuse is a row carrying the refusal**, not a missing
row — a destination absent from the list reads as one that does not exist.

> [!WARNING] The server-only import that broke three unrelated suites
> The action **defers its `db/client` and domain imports into the call**. A
> top-level import put a server-only module into the client graph, and three
> suites that merely *render the editor* failed to load at all. Mocking each of
> them would have hidden that rather than fixed it. Same reason the break-glass
> routes defer theirs.

## 2. Global was not a row, and then it was

#249 left Global out deliberately, on the reading that **it is a rule scope
rather than a destination** — quoting "Global: $20.70" would name a place nobody
can order from.

#261 reverses that, and the reason is better than the original: Global is what
every country **without a column of its own** pays — *most of the world* — and
leaving it out hid the price covering the largest set of buyers.

It shows in **USD**, because those buyers share no currency, and that is a
decision rather than a fallback: returning "no display currency" would have the
row silently lose its money column.

**It is asked for with `AQ`** — a real, well-formed country code Sals3 has not
named, so it is *a member of the set Global prices* rather than a stand-in for
it. The screens key the scope as `GLOBAL`, which is explicitly documented as not
a country code.

## 3. An approximate local figure, and every guard around it

A seller reading `$14.79` cannot tell whether that is a sane shelf price in
Fiji. An approximate `FJ$` figure answers that — the same thing the storefront
already shows buyers beside a USD price.

> [!IMPORTANT] These are approximations and never what anybody is charged
> ADR-003 phase 1 charges **USD in every market**, so the local figure is
> rendered **second, dimmed, beside the USD one, under a line that says so**.
> Showing it alone would state a price nobody pays, and **a test fails if the
> USD figure is dropped.**

The boundaries this deliberately does not cross:

- `modules/pricing/reference-fx.ts` **still refuses every non-identity pair**,
  and that stays true — no provider is approved for what the Portal *charges*.
- Nothing here reaches the resolver, is stored on an offer, or decides what
  anybody pays.
- `authorizedSellingCurrencyCodes` is **untouched**. `capabilities.ts` already
  draws that line, calling a display currency *"not a checkout, settlement, or
  conversion contract"*, and this sits on the display side of it.

The display map is one file, `lib/portal/destination-display-currency.ts`:
`AU → AUD`, `PH → PHP`, `NZ → NZD`, `US → USD`, `CA → CAD`, `FJ → FJD`, with
`null` meaning "nothing to convert to" rather than `'USD'`, so a caller can tell
*no conversion needed* from *no answer*.

### Two rate sources, and Fiji is the reason there are two

In the order `lib/storefront/fx.ts` already uses in production:

| source | covers |
| --- | --- |
| ECB reference feed | AUD, PHP, NZD, CAD |
| `open.er-api.com` | the fallback — **and the only source for FJD** |

**The ECB does not publish FJD** — checked 2026-08-30. So the second source is a
**fallback rather than a redundancy**: Fiji has no figure at all without it.

**A currency no source answered for is simply absent.** A missing rate treated
as `1` would render `FJ$20.70` — a Fijian dollar at parity with the US dollar,
off by more than half, and **indistinguishable from a real answer**. Reverting
that guard fails a test.

## 4. The fourth way to open the same list

#261 also added a `Per country` control beside the column's ⓘ icon, so the list
opened from three places — the retail price, the supplier cost, and that
control — *"so the three cannot drift"*.

#262 removes it, one commit later, and the reasoning is the interesting part:

- It was **the weakest of the four**. The same list already opens from every
  price and every supplier cost in the column — **eighteen dotted-underlined
  triggers** on the product it was tested against, which is what signals the
  list is there at all.
- **The icon is not click-to-open either**, which is what the owner had actually
  asked about. Nothing on screen distinguishes an icon that answers on hover
  from one that answers differently on click, and **a touch screen has no
  hover** — so one control with two behaviours is one behaviour nobody finds and
  one that breaks on a phone.

**Two questions, two places.** The icon says how the number was reached; the
prices themselves say what it is everywhere else.

## Carry-forward

- **The six pricing destinations still exceed the three checkout destinations.**
  This column now shows prices for NZ, US and CA that no buyer can complete a
  purchase to. That gap is disclosed elsewhere and unchanged here — see
  [[hot]]'s active risks, and
  [[sals3-session-2026-08-30-part101-two-editor-panels-that-were-showing-nothing|part 101]]
  for the preview that deliberately shows only three.
- **The display FX path and the charged-price path are now genuinely separate
  code**, and must stay that way. `reference-fx.ts` refusing non-identity pairs
  is the guard; copying a display rate into it would silently make an
  approximation into a charge.

## Lessons

- **A column heading that names no country is a column with a hidden
  parameter.** The number was never wrong; it was one destination's answer
  presented as the answer.
- **Re-run the calculation; never scale its output.** A ratio applied to a
  displayed price is a second pricing implementation, and this repository has
  already been bitten by exactly that.
- **On-demand beats eager when the resolver is expensive and the question is
  rare.** Six queries for the row someone is reading, not eleven hundred for a
  table most sellers never open.
- **A missing rate must render nothing, never `1`.** Parity is a plausible
  number and therefore the most dangerous possible default.
- **A second source is sometimes not redundancy.** ECB plus er-api reads like
  belt and braces until you notice ECB has no FJD at all.
- **Adding a fourth affordance for one action is a cost, not a courtesy.** The
  fix for "the icon does not open on click" was not a new button; it was
  deciding what the icon is for.
- **Deferring an import is a real architectural decision.** A top-level
  `db/client` in a server action pulls server-only code into the client graph
  and takes unrelated suites down with it.
