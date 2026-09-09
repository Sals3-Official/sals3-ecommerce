---
tags: [session-record, sals3, portal, pricing, checkout, currency, fiji, fx]
aliases:
  [
    "Part 146",
    "A market settles in its own currency, wired and left off",
    "settlementCurrencyForMarket",
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
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[cross-border-rest-of-world-selling-reference]]"
---

# Part 146 — A market settles in its own currency, wired and left switched off

> [!WARNING] FJD is **not** switched on. Verified on `main` 2026-09-08
> `src/modules/market-config/capabilities.ts` carries
> `settlementCurrencyCode: 'USD'` on **all six** destinations, and
> `settlementCurrencyForMarket` falls back to `'USD'`. ADR-003 §3's
> "phase 1 displays/charges USD" is therefore still in force everywhere,
> including Fiji. What these two PRs did is make the switch *safe to flip* —
> they did not flip it.

> [!NOTE] Provenance
> Written after the fact from each PR's own record, plus a read of
> `capabilities.ts` on `anythingsupplies/sals3-portal@main` on 2026-09-08 to
> confirm the switch state. Both PRs are `anythingsupplies/sals3-portal`,
> merged 2026-09-07. Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#117](https://github.com/anythingsupplies/sals3-portal/pull/117) | One settlement currency per market, from one place, with the switch left at USD |
| [#120](https://github.com/anythingsupplies/sals3-portal/pull/120) | Checkout prices from the **storefront's** market, not the buyer's address |

## 1. Three copies of one constant, and the third was dangerous

Each writer carried its own `const SETTLEMENT_CURRENCY = USD`: `publish.ts`, the
market-offer backfill, and `reprice.ts`. **Three copies agree right up until one
market stops matching them.**

`reprice.ts` was the one that bites. Repricing an FJD offer with a USD settlement
would overwrite a Fijian price with an Australian number and stamp it
`RESOLVED` — resolver version and all, **so nothing downstream would question
it.** They now share `settlementCurrencyForMarket`.

## 2. The same constant was doing two unrelated jobs

It also stood in for the **supplier cost** currency when the evidence does not
name one. Those are different facts:

| Fact | Why it is that currency |
| --- | --- |
| supplier cost | CJ prices in USD because CJ prices in USD |
| what a buyer is charged | a property of the **market** |

The cost fallback is now `SUPPLIER_COST_FALLBACK_CURRENCY` and says which of the
two it is. A constant standing in for two facts is a rename waiting to be a
defect.

## 3. A seller price in the wrong currency is refused

One typed number reaches every market a publication writes. **`US$120.00` into a
market selling in FJD would be stored as `FJD 120.00`** — the same digits,
roughly half the intended price, and nothing anywhere recording that a conversion
was skipped. There is no rate on that path, and inventing one is what ADR-003
forbids. So the publication refuses rather than converting.

## 4. Why the switch stays off, in the PR's own words

`settlementCurrencyCode` is `USD` for all six destinations. Flipping `FJ` to
`FJD` needs two more things first:

- **checkout to quote and charge FJD** — `modules/checkout/orders.ts` hardcoded
  it, and CJ quotes freight in USD;
- **the Fiji storefront to stop converting a price that is already Fijian.**

> Flip it before those and the storefront shows a double-converted number and the
> buyer is charged the wrong one — the amendment's own warning.

#120 closed the first of the two. The second is still open.

## 5. Checkout was pricing from the wrong fact entirely (#120)

`chooseOfferForDestination` picked the offer by `address.country`. **That is the
wrong fact.** A market is a property of the deployment — `sals3.com.fj` is a
Fijian storefront for everyone who opens it.

Pricing off the shipping address means a buyer can be **shown one price and
charged another, in both directions**:

| Buyer | Shown | Charged |
| --- | --- | --- |
| on `sals3.com`, shipping to Fiji | the cheapest offer | **Fiji price** |
| on `sals3.com.fj`, shipping to Australia | Fiji price | **Australia price** |

Invisible while every market carries the same rules. **A live mispricing the day
one of them does not — which is the day the FJ column changes.** It had already
changed.

### The fix

The storefront names its market, the same `market` it already sends on reads.

- **Named** → only that market's offer will do. **No nearest-market fallback**:
  selling at another market's price is what per-market rules exist to stop.
- **Absent** → global. `sals3.com` prices a card from the cheapest published
  offer and must charge what it displayed.

A market with no offer refuses **in its own words**. The neighbouring
availability-scope test warned about precisely this: a refusal worded as a
delivery problem is how a frozen availability flag was misread as a delivery
restriction for months. *"Not sold in this store" does not send a buyer to edit
an address that is fine.* That thread continues in
[[sals3-session-2026-09-07-part151-every-checkout-refusal-names-the-item|part 151]].

### Currency, carried instead of assumed

- The cart line carries `priceCurrency` **from the offer**.
- The global tiebreak **refuses to compare two currencies** — subtracting an FJD
  minor unit from a USD one sorts confidently and means nothing, so the
  "cheapest" would be whichever currency is weakest.
- The intent settles in the **cart currency**, not a hardcoded `USD`. CJ quotes
  freight in USD, so a non-USD purchase converts it once at a reference rate and
  **stores the rate, its provider and when it was observed** — the disclosure
  ADR-003 §3 already requires.

## 6. Where this leaves ADR-003's Fiji amendment

| Step | State |
| --- | --- |
| 1. A Fiji offer exists, priced by Fiji's rules | **done** — portal #69 |
| 2. Already-published products backfilled | **done and run** — [[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn\|part 144]] |
| 3. The Fiji storefront reads only Fiji's offer | **done** — [[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price\|part 145]] |
| 3b. FJD authorized as a selling currency for `FJ` | **wired, switched off** — this note |
| 4. Checkout quotes and charges FJD | **half** — #120 carries the currency; settlement is still USD |

**What remains, concretely:** flip `FJ` to `FJD` in `capabilities.ts`, and make
the Fiji storefront stop converting a price that is already Fijian. Neither is
safe alone, and the order matters — the storefront change must not lead.

## Lessons

- **A constant copied into three writers is one rule with three chances to
  disagree.** The dangerous copy is never the one you are editing.
- **A name that stands for two facts will eventually be wrong about one.**
  `SETTLEMENT_CURRENCY` meant both "what we charge" and "what CJ charges us".
- **Wire the mechanism, leave the switch off, and say so in the code.** The whole
  currency path exists and changes no price today. That is a shippable state, and
  it is safer than a flag flipped in the same PR that built it.
- **Never infer a market from the buyer.** Address, IP, header and cookie are all
  the wrong source. The deployment knows what it is.
- **Refuse to compare two currencies.** A numeric comparison across currencies
  never errors and is never right.
