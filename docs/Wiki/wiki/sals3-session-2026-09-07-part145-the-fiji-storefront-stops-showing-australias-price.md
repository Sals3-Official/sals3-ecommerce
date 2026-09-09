---
tags: [session-record, sals3, portal, ecommerce, fiji, storefront, pricing, read-model]
aliases:
  [
    "Part 145",
    "The Fiji storefront stops showing Australia's price",
    "The market_code filter",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn]]"
  - "[[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off]]"
  - "[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
---

# Part 145 — The Fiji storefront stops showing Australia's price

> [!IMPORTANT] This closes step 3 of ADR-003's Fiji amendment
> [[hot]]'s Fiji entry named three broken links and said *"nothing about FJD is
> safe before this."* All three are now joined. **What is still not done is
> step 4** — the money charged is still USD everywhere; see
> [[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off|part 146]].

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the live measurements
> quoted in them. Two repositories: `anythingsupplies/sals3-portal` and
> `anythingsupplies/sals3.com.fj`, merged 2026-09-07. Promotion PRs not listed.

| PR | Repo | What it did |
| --- | --- | --- |
| [#80](https://github.com/anythingsupplies/sals3-portal/pull/80) | portal | `?market=FJ` on five catalogue reads — a storefront can ask for one market's offers |
| [#18](https://github.com/anythingsupplies/sals3.com.fj/pull/18) | fj | The storefront actually sends it — `resolveMarket()` reaches the catalogue reads at last |
| [#2](https://github.com/anythingsupplies/sals3.com.fj/pull/2) | fj | Market chrome, FJ$ display and seven Fiji heroes, all behind one unset variable |
| [#129](https://github.com/anythingsupplies/sals3-portal/pull/129) | portal | The PDP's variants scoped to one market, and the option fan-out stopped |

## 1. The three broken links, and what each one was

`read-model.ts` said the first one in its own comment:

> There is also no `market_code` filter… every published offer is visible and
> the cheapest one prices the card.

That is what made `sit.sals3.com.fj` show Australia's price with an FX
conversion painted over it. Measured on SIT, same slug, same moment:

| Storefront | Price |
| --- | --- |
| `sit.sals3.com` | **US$3.36** |
| `sit.sals3.com.fj` | **FJ$7.58** |

A ratio of **2.256** — the published RBF rate plus its 1.5% buffer, **not a Fiji
margin.** The Portal had held Fiji's rules the whole time (50% operating
expenses, a full column of category markups) and nothing carried them across.

The second link was on the storefront side. `resolveMarket()` already knew this
deployment is `FJ` — and fed **only presentation**: the welcome band, the promo
slides, the footer, the indicative currency. It never reached
`services/storefront/products.ts`. The third was the API itself, which accepted
only `section`, `page` and `limit`.

## 2. The storefront names its market; the Portal never infers one

The same `read-model.ts` comment said adding the filter *"means reading a
destination from the request … not hardcoding a constant here."* #80 is that.

**A market is a property of the deployment asking, not of the buyer.** The Fiji
domain is a Fiji storefront for everyone who opens it, including a Fijian
browsing from Sydney. So it comes from the storefront's own build-time
configuration and arrives as `?market=FJ` — never from an IP, a header, or a
cookie. `lib/market.ts` on the storefront side says the same thing and refuses to
infer a market from a request.

Two properties were pinned as hard as the feature:

- **Unrecognised is refused, not ignored.** `?market=` is checked against the
  platform capability list rather than a regex; anything else answers **400**.
  Ignoring a typo would answer `200` with *another market's price* — the exact
  defect this exists to end, coming back through a query string.
- **Absent stays absent.** No `market` means the shared storefront and the
  cheapest-across-markets behaviour every caller had. Defaulting to `AU` here
  would silently reprice `sals3.com`, so the tests assert the absence as hard as
  the presence.

### The cache had to be re-keyed, not just extended

The market is an **argument** to every cached read, so `unstable_cache` keys on
it and a Fiji entry can never be served to the shared storefront. Every affected
key was version-bumped for the same reason: **an entry cached under the old arity
would serve one market's price to another.**

On the storefront side (#18), the parameter is applied at the five catalogue URL
builders rather than inside `getStorefrontApiUrl`, which also builds the
checkout, order, FX-buffer and free-shipping paths. Those would ignore an unknown
parameter *today* — and "ignored today" is exactly the assumption worth not
making.

## 3. #80 shipped with a blocking notice on itself

The PR opened with its own refusal to be merged:

> **⛔ Do not merge yet.** This must land **after** the market-offer backfill
> (#76) has actually **run**. The filter is only safe once the offers exist — a
> Fiji storefront asking for `FJ` offers that were never written sees an **empty
> catalogue**. Merging #76 was not enough. Its endpoint has to be called.

That ordering held: #76 merged 02:10, the runs happened (see
[[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn|part 144]]),
and #80 merged **09:53**. The gate was a sentence in a PR body rather than
anything mechanical — worth noting as a weakness, not a success.

## 4. The Fiji release that changed nothing until a variable existed (#2)

`sals3.com.fj` #2 promoted `develop` to production with **125 files** — the FJ$
prices, the Bula band with the drua and masi texture, and seven Fiji hero
slides. Its own account of what production would look like the moment it merged:

> **Exactly what it looks like today.** Everything above is gated on
> `NEXT_PUBLIC_SALS3_MARKET`, and that variable is not set on this Vercel
> project yet — verified on `sit.sals3.com.fj` after the last merge: `data-market`
> null, no welcome band, the shared seven slides.

One commit in that set (`aa5cea1`) deliberately collapsed a **second FX variable
into the market variable**, so `NEXT_PUBLIC_SALS3_MARKET=FJ` is the single switch
for the band, the carousel and the currency. Two switches for one fact is two
things that can disagree.

**A merge that is inert until a configuration exists is the safe order**, and it
is the opposite of the pattern that cost the Portal an afternoon elsewhere: ship
the code dark, then turn it on deliberately.

## 5. The PDP was quoting three markets at once (#129)

With per-market offers live, a buyer on the Fiji storefront saw this on their own
cart line:

```
White · White · White · XXL · XXL · XXL
```

Confirmed from the live payload rather than inferred — the Portal returned
`{"name":"Colour","value":"White"}` **three times** and `Size`/`M` three times
for one variant.

`loadPublishedVariants` joins `product_offers` with **no market filter.** Every
other join in that query documents why it cannot multiply rows — `products` is a
foreign key, `provider_variant_references.variant_id` carries a unique index —
but `product_offers` never did, *because until per-market offers existed a
variant had exactly one and the assumption was accidentally true.* Three markets'
offers, three copies of every option row.

`publishedScope` already narrowed offers to one market. It was added earlier the
same day and **this query was simply missed.**

The second bug in the same place: the fold builds the variant from the first row
it sees, so among three markets' offers the PDP quoted whichever one
`ORDER BY sals3_sku, position` happened to deliver.

## 6. What is true on the three storefronts now

Verified live and quoted in `sals3-portal` #152, same product, same moment:

| Storefront | Shows | Which market's price |
| --- | --- | --- |
| `sals3.com.au` | A$21.96 | Australia, 200% ✓ |
| `sals3.com.fj` | FJ$25.81 | Fiji, 120% ✓ |
| `sals3.com` | US$11.44 | **Fiji's** ✗ |

The first two are the point of this note: **each market storefront now reads its
own market's offer.** The third is a separate defect the filter exposed rather
than caused — the shared storefront had no offer of its own and fell back on the
cheapest across markets. That is what
[[sals3-session-2026-09-07-part152-global-becomes-a-real-offer-destination|part 152]]
addresses.

Note also what the FJ$ figure **is**: an offer priced by Fiji's rules, denominated
in **USD**, displayed as an approximate Fijian number. The margin is Fiji's; the
currency charged is not yet.

## Lessons

- **A comment that names a missing filter is a defect report with no ticket.**
  `read-model.ts` described this gap, and the fix it recommended, before anyone
  noticed the symptom.
- **A join that cannot multiply rows today can multiply them tomorrow.** The
  `product_offers` join was safe only because of a one-offer-per-variant
  invariant nobody had written down. When the invariant changed, the query did
  not.
- **An FX ratio is a diagnostic.** A constant 2.256 between two pages is not two
  prices; it is one price converted. Dividing the two figures found the bug
  faster than reading either code path.
- **Refuse an unrecognised parameter.** Ignoring `?market=FJI` would answer 200
  with the wrong market's money.
- **Assert the absence as hard as the presence.** The tests that pin "no market
  means unchanged behaviour" are what stop this feature silently repricing
  `sals3.com`.
- **A "do not merge yet" banner is not a gate.** The ordering was honoured by a
  person reading a sentence. Where an ordering is load-bearing, it deserves
  something that fails rather than something that asks.
