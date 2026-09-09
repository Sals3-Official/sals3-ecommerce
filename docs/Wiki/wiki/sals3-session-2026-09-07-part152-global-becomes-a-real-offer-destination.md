---
tags: [session-record, sals3, portal, pricing, global, reprice, market-rules, ux]
aliases:
  [
    "Part 152",
    "Global becomes a real offer destination",
    "The reprice count learns its selection",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price]]"
  - "[[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[cross-border-rest-of-world-selling-reference]]"
---

# Part 152 — Global becomes a real offer destination, and the reprice count learns its selection

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the live three-storefront
> comparison quoted in #152. All six PRs are `anythingsupplies/sals3-portal`,
> merged 2026-09-07 between 19:27 and 22:41. Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#151](https://github.com/anythingsupplies/sals3-portal/pull/151) | `Check the next 500` — a reprice can pass a page with nothing to write |
| [#152](https://github.com/anythingsupplies/sals3-portal/pull/152) | **`XG`** — Global becomes a real offer destination, inert until configured |
| [#155](https://github.com/anythingsupplies/sals3-portal/pull/155) | The margin CSV writes `GLOBAL` instead of leaving three blank cells |
| [#158](https://github.com/anythingsupplies/sals3-portal/pull/158) | Nine controls and three steps become one sentence and one button |
| [#161](https://github.com/anythingsupplies/sals3-portal/pull/161) | The count is a **page's**, not the selection's — and said so |
| [#164](https://github.com/anythingsupplies/sals3-portal/pull/164) | The count is the **selection's**. `MAX_REPRICE_OFFERS` leaves the screen entirely |

## 1. Setting Fiji's markup changed the price on `sals3.com`

Verified live on all three storefronts, same product, same moment:

| Storefront | Shows | Which market's price |
| --- | --- | --- |
| `sals3.com.au` | A$21.96 | Australia, 200% ✓ |
| `sals3.com.fj` | FJ$25.81 | Fiji, 120% ✓ |
| **`sals3.com`** | **US$11.44** | **Fiji's** ✗ |

FJ$25.81 ÷ US$11.44 = **2.2561** — the published USD→FJD reference rate plus its
buffer, so the two pages were showing **one and the same USD offer.** The
Portal's own *Price in each destination* panel confirmed it: Australia $15.60,
Fiji $11.44, on a $5.20 supplier cost.

### The margin rule never leaked — the price did

Per-destination policies are exact-matched (`scopeCondition`), revisions cannot
move a row between scopes, and two partial unique indexes enforce one ACTIVE row
per scope. **AU still read 200%.**

The **Global rule** has always worked: a destination outside the named six
resolves through `isGlobalPricingDestination` to the `market_code IS NULL` policy
row. What never existed was an **offer priced by it** — and the storefront reads
frozen offers rather than pricing on demand. So the shared storefront had nothing
of its own and fell back on the cheapest offer across every market.
`read-model.ts` has always said so in its own header.

This is the third defect in two days that the per-market filter *exposed* rather
than caused; the other two are in
[[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price|part 145]].

## 2. The decision, and why the first proposed number was wrong

> **Owner decision 2026-09-08:** Global is where every country without its own
> Sals3 storefront falls, at **205% over cost with 50% operating expenses.**

**Above every named market, deliberately.** Freight to a country nobody has
measured is more likely worse than Fiji's $16.01 than better than Australia's
$8.10. At the **100%** first proposed, Global would have priced this dress at
$10.40 — *undercutting the very Fiji price being complained about.*

## 3. `XG`, and four things that had to be true

`GLOBAL_OFFER_MARKET_CODE = 'XG'`. Publication and the market-offer backfill may
now write an offer for it, priced by the Global rule.

**No DDL.** `product_offers.market_code` is `text NOT NULL` with a `^[A-Z]{2}$`
check, so Global needs two letters and cannot reuse the policy table's `NULL`.
`XG` is in ISO 3166-1's **user-assigned range**, so no future country can collide
with it. `ZZ` was refused: eight test files already use it as the canonical
*unauthorized* market.

**No change to the buyer-destination policy**, which matters — bumping
`POLICY_VERSION` requeues **588,850** candidate evaluations.

### The absence from `PILOT_DESTINATIONS` is load-bearing

`listPricingScopeDestinations()` is *derived* from the capability list. Naming
`XG` there would make `isPricingScopeDestination` true and
`isGlobalPricingDestination` false — and then `scopeCondition` would stop reading
the Global policy rows for it and start demanding an `XG`-scoped store default
**that will never exist.**

> Nothing would error. The prices would simply stop moving.

Publication would quietly stop writing Global offers, and `reprice.ts`'s Global
scope — `notInArray(market_code, <the named six>)` — would quietly stop covering
the ones already written. **Five test cases pin it.**

### Appended last, and never alone

`publishProduct` checks `offerDestinations[0]` strictly against the capability
list, so a Global entry **in first position would refuse every publication on the
platform.** And an empty named list stays a refusal — Global is *an addition to a
publication that is going ahead, not a licence for one that is not.*

### Fail-closed, so it could ship inert

`filterToSetUpDestinations` gates Global on the `market_code IS NULL` store
default. **Until the owner sets it, Global is filtered out and no offer is
written.** The shared storefront still prices from `min()`. That shape is the
point: this landed and was promoted to production **doing nothing at all.**

> [!CAUTION] The ordering must not be reversed
> 1. #152, promoted to production. **Inert.**
> 2. **Owner sets** Global operating expenses 50% and Global category markups 205%.
> 3. **`backfill-market-offers` runs** per environment, so every live product gains its Global offer.
> 4. **Then** the read side changes — the apex reads Global instead of `min()`, in `read-model.ts` **and** in checkout's `chooseOfferForMarket`, because a read-only change would show one price and charge another.
>
> **Step 4 before step 3 empties the apex catalogue.** It is a separate PR for
> exactly that reason, and as of 2026-09-08 steps 2–4 are **not done**.

One existing test's comment had predicted this and can now be closed out: it said
variant count and offer count were "equal today only because
`offerDestinations[0]` means one destination per publication." Three variants
across AU and Global is now six offers and still `variantCount: 3`.

## 4. A blank cell the codebase had already named as a problem (#155)

The owner exported all **1,491** category-markup rows to set Global's markup and
reported that **Global was not in the file.** It was — 213 rows of it:

```
CAT-GGL-3237,Animals & Pet Supplies > Live Animals,200,NONE,AU
CAT-GGL-3237,Animals & Pet Supplies > Live Animals,120,NONE,FJ
CAT-GGL-3237,Animals & Pet Supplies > Live Animals,,,      ← Global
```

A Global row has no markup and no rounding, so **three adjacent cells are
empty**, and a spreadsheet spills the long `category_path` across them until the
line loses its shape. A blank cell also cannot be told apart from one somebody
forgot to fill in.

**That ambiguity is precisely why `GLOBAL_PRICING_SCOPE_KEY` exists.**
`pricing-scope-destinations.ts` says so in its own words: *"`null` is not a value
a URL, a table column key or a CSV cell can carry unambiguously — a blank cell is
indistinguishable from a missing one at a glance."* The codebase had named the
problem and then **shipped the ambiguous form in the one place a person actually
reads.**

Export writes `GLOBAL` — two characters of code. Import resolves the cell through
`pricingScopeMarketCode()`, already the single point where the keyword and the
stored `null` meet, so this **removed** a bespoke comparison rather than adding
one. A blank cell still means Global, so every file exported before today still
imports.

## 5. The reprice dialog, four times in one day

### #151 — the third dead end, one layer further out

The dialog could only write the page in front of it, and the cursor advanced
**only on a successful apply.** So a page of 500 prices that already matched
their rule was a dead end: `Apply new prices` is disabled when nothing would
move, and the banner said *"apply these, then continue."*

Reported from Fiji with `All categories`: 500 already correct, "more than 500 live
prices in this destination", Apply greyed out, **no way forward.**

> This is the third time this dialog has had the same shape of defect, one layer
> further out each time — first an unscoped run that returned the same 500
> forever, then a scoped run whose "run it again" could not resume, now a cursor
> that cannot pass a page with nothing to write.

`Check the next 500` advances **without writing**, offered only on a page whose
changes are zero. The rule the old behaviour protected is real — *never advance
past changes nobody applied, or the run leaves a silent hole exactly where the
seller stopped paying attention* — and a clean page leaves nothing behind by
definition.

### #158 — nine controls for one act

Two selects, a reclaim checkbox with a paragraph, `Check what would change`,
`Check the next 500`, a required reason, a `Type N to confirm` box, and **two
buttons both called apply.**

> **Owner verdict 2026-09-08 — one click, and a sentence saying how many items
> are affected** — and it was right. The ceremony was not protecting anything the
> sentence could not say better. Some of it was mine: yesterday's dead-end fix
> added two of those nine controls.

The clearest tell was **`Type N to confirm`**. It asked the seller to type the
number of prices being replaced, to prove they had read them — *so on a page
where nothing would move, it asked them to type zero.* **A ritual with no
content.**

### #161 — the fix that rebuilt the reported defect

Found on production a minute after #160 deployed. All categories + Fiji, nothing
pressed:

```
All 500 live prices in Fiji already match your margins.
[ Nothing to move ]   ← disabled
```

**500 is `MAX_REPRICE_OFFERS` — the page size, not a total.** Two defects from
one mistake, and the second is much the worse:

1. the sentence **claimed a total it had never read**, on a selection holding
   thousands — and the owner's own screenshot of the *old* dialog had said
   *"This selection holds more than 500 live prices in this destination."* The
   information was there and it was dropped.
2. **a clean first page disabled the button** — the originally reported dead end,
   rebuilt one design later.

#161's answer was to *explain the page*: "the first 500… and there are more
behind them", with `Move 312+ prices`.

### #164 — the owner said that was still wrong, and it was

> *"hindi nga dapat stuck sa 500 eh dapat single click lang yan tapos lahat ng
> existing item ma uupdate ang price"*

One click **did** already update everything — `runRepriceScopeAction` walks every
page server-side. The dialog just read its numbers from the preview, which is
bounded. **#161 papered over it by explaining the page instead of removing it.**

`countRepriceScope` — one indexed `count(*)` over the whole scope. No resolver,
no limit, no cursor. It shares `scopePredicate` with the page read, extracted for
exactly this purpose: **a count that can drift from the set the run walks would
promise a total and then move a different number of prices.**

```
1,842 live prices in Fiji.
Your margins decide each one. Prices you typed by hand are left alone.

[        Update all 1,842 prices        ]
```

**`MAX_REPRICE_OFFERS` now appears nowhere a seller can see. A test asserts it.**

## 6. Verification

`npm run verify` → exit 0 on #152: lint, format:check, typecheck, build,
**4,143 unit tests** (4 skipped), **68 e2e**, with the pre-commit hook running
eslint, prettier and typecheck again on the commit. #152 added 10 tests, five of
them pinning that `XG` must never become a named pricing scope. All local —
Actions unfunded since 2026-09-04.

## Lessons

- **A rule that works and an offer priced by it are two different things.** The
  Global *policy* had always resolved correctly; no row had ever been written by
  it, and a storefront that reads frozen offers cannot use a rule.
- **A margin above every measured market is the honest default for an unmeasured
  one.** The instinct to price Global low would have undercut the market being
  complained about.
- **Absence from a derived list can be load-bearing.** Adding `XG` to
  `PILOT_DESTINATIONS` would have broken publication and repricing **silently**.
  Pin the absence with tests, and say why in the code.
- **Ship it inert and let configuration turn it on.** Fail-closed on an unset
  store default let a pricing change reach production with zero buyer effect.
- **A codebase that has named an ambiguity can still ship it.** The blank-cell
  problem was documented in the same module whose CSV exported blank cells.
- **The same defect one layer out, three times, means the layer is wrong.** The
  reprice dialog's dead end was fixed at the run, then the cursor, then the page —
  and only removing the page size from the screen ended it.
- **Ceremony is not consent.** `Type N to confirm` asked for a zero on an empty
  page. If a control can be satisfied without reading anything, it protects
  nothing.
- **Explaining a leaked implementation detail is not fixing it.** #161 taught the
  sentence to describe the page size; #164 removed the page size from the
  sentence.
