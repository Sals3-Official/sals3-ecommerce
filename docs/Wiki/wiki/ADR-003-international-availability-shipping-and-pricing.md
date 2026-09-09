---
tags: [sals3, adr, shipping, pricing, international, seo, currency]
aliases: [ADR-003, International Availability and Pricing, Destination Pricing]
created: 2026-08-06
updated: 2026-08-29
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[sals3-session-2026-08-27-part81-the-site-learns-where-it-is-shipping]]"
  - "[[cross-border-rest-of-world-selling-reference]]"
---

# ADR-003 - International availability, shipping, currency, and pricing

> [!IMPORTANT] Australia approved as the initial buyer destination; operational evidence still required
> Bogs approved `AU` as the initial buyer destination country on 2026-08-11. This enables AU-scoped product evaluation only. It does not prove nationwide delivery, freight, compliance, landed cost, checkout currency, or Ready/sellable status. Regional estimates may improve browsing, but only a destination-specific quote can authorize checkout.

## Decision

### 1. Use explicit launch markets

Maintain a versioned allow-list of enabled destination countries and product/category restrictions. Customer copy should say "ships to supported countries" rather than "ships worldwide" until every claimed country is operationally verified.

The initial buyer destination-country allowlist is `['AU']`, independently approved on 2026-08-11. It is separate from Sals3's Australian business/seller registration, even though both initial values are `AU`. Adding another seller-operating country must not add a buyer destination, and adding another buyer destination must not change seller-registration eligibility.

Geo-IP is only a default suggestion. The user's selected shipping country is the browsing source of truth. Exact country and, where required, postal code are the checkout source of truth.

### 2. Separate estimates from final quotes

Regional or zone calculations may power catalog browsing and caching. Testing one representative country does not prove deliverability or price for every country in that zone.

```text
Browse: regional estimate, clearly labelled
Product/cart: destination-country availability check
Checkout: fresh country/postal-code freight quote
Payment: allowed only while the quote is valid
Supplier order: uses the confirmed quote inputs
```

Persist the quote inputs, selected logistics method, amount, currency, timestamp, expiry, and supplier response reference. Prevent payment when the quote is missing, expired, or materially changed.

### 2.1 Present three delivery tiers without fabricating services

For each fulfillment package, checkout always presents three buyer-facing
positions in this order: `Standard`, `Express`, `Expedited`. Portal owns the
classification beside its authoritative CJ quote integration; the browser
cannot assign a tier, courier, amount, or delivery promise.

A valid candidate has no CJ row error, non-empty `optionId` and `channelId`, a
positive final USD shipping amount, a parseable positive arrival window, and a
unique, internally consistent option/channel identity. Conflicting duplicate
identities are excluded.

- `Standard` is the lowest amount; ties prefer lower maximum days, then lower
  minimum days, then stable IDs.
- `Expedited` is the fastest remaining row strictly faster than Standard; ties
  prefer lower minimum days, lower price, then stable IDs.
- `Express` must be strictly between Standard and Expedited. Candidates are
  ranked independently by price and speed, each rank normalized to `0..1`, and
  the lowest `|priceRank - 0.5| + |speedRank - 0.5|` wins. Ties prefer lower
  price, faster delivery, then stable IDs.

One CJ option/channel identity may serve only one tier. Portal returns available
assignments only; ecommerce renders all three cards and disables any missing
tier with explicit unavailable copy. Thus twenty valid CJ rows become at most
three services, two rows normally produce Standard plus Expedited, and one row
produces Standard only. If any package lacks Standard, the cart/address is
unshippable. The invariant is **three visible, not three fabricated**.

Before payment, Portal re-quotes and reclassifies. The selected row must exactly
match `packageId + shippingTier + optionId + channelId + amountMinor + currency`.
Checkout intents and new fulfillment groups persist the tier plus exact CJ row;
legacy groups keep a null tier and display their stored carrier without an
invented classification. Stripe metadata uses `cj_freight_v2`; receipts retain
read compatibility with `cj_freight_v1`.

This decision adds no CJ call, poller, job, package, free-shipping contribution,
courier-preference policy, or Admin Portal dependency. The 2026-08-28 shipping
handoff is implementation evidence, not authority; this ADR is canonical.

### 3. Use USD as the phase-1 accounting and checkout currency

CJ supplier costs are USD-denominated and phase 1 displays/charges USD. Do not use a hardcoded USD/PHP conversion. An approximate local-currency display may be added later, but it must be clearly labelled and must not change the actual charge currency.

When true multi-currency checkout is introduced, store the rate, provider/source, effective timestamp, spread, and locked order rate. Currency-explicit `Money` values are required from the first schema version.

### 4. Price from contribution economics

Use:

```text
landed_cost =
  product_cost
  + shipping_cost
  + absorbed duties/taxes
  + handling
  + expected return/refund allowance

minimum_price =
  (landed_cost + desired_contribution_profit + fixed_payment_fee)
  / (1 - variable_payment_fee_rate)

selling_price = max(
  minimum_price,
  landed_cost / (1 - target_margin_rate),
  approved_category_price_floor
)
```

Do not call an absolute dollar amount a margin; call it `desired_contribution_profit` or `minimum_contribution_profit`.

Category targets, price floors, FX buffers, return allowances, and fee assumptions are versioned configuration with an owner, effective date, and review trigger. Initial values are hypotheses until validated against real orders. They are not facts baked into code.

Under [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]], ownership is multi-seller aware: Seller Portal owns each merchant's margins, category PICs, product/variant overrides, and merchant FX adjustment; Admin Portal owns only platform reference-FX configuration, Sals3 fees/real platform costs, enabled capabilities, and safety/legal guardrails. Reference rates, platform costs, merchant adjustments, and margins remain separate inputs.

### 5. Ban fabricated price comparisons

`oldPrice`, "was" prices, discount percentages, scarcity, and countdown claims require real evidence. A computed uplift over the current price is not a prior price and must not be displayed as one. Preserve historical price evidence and effective dates if comparison pricing is later supported.

### 6. Keep international SEO stable

Do not rely on IP-adaptive content and a sitemap to represent every market. Phase 1 may use one stable English/USD product URL. When materially localized content or purchasable currencies are introduced, use stable locale/market URLs, canonical rules, and `hreflang` following current Google guidance:

<https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages>

Structured data must describe the visible, actually purchasable offer for that page and market. Never publish guessed availability, ratings, or price data.

## CJ quota and freight controls

CJ's documented system uses both per-second rate limits and daily points. As checked 2026-08-06, current points documentation gives a 50,000 base daily allowance plus transaction-based points, includes `pointsInfo` in responses, and assigns endpoint-specific costs. Treat account-specific remaining points as runtime state, not an unknown discovered only through `429` responses.

Use a central queue with priority:

1. paid-order creation and supplier payment;
2. order reconciliation and tracking;
3. checkout freight confirmation;
4. published-product inventory/cost refresh;
5. new-product discovery and enrichment.

Start conservatively, distinguish QPS throttling from points exhaustion, reserve capacity for paid orders, and persist quota observations. Official references:

- <https://developers.cjdropshipping.com/en/api/api2/standard/points.html>
- <https://developers.cjdropshipping.com/en/api/api2/standard/limit.html>
- <https://developers.cjdropshipping.com/en/api/api2/api/logistic.html>

## Verification required

- Sample freight tests for each enabled country and representative postal codes.
- Checkout rejects stale or changed quotes before payment.
- Pricing fixtures cover percentage fees, fixed fees, rounding, returns allowance, and loss prevention.
- Search/structured-data review for each enabled market presentation.
- Actual fee, tax, duty, refund, and consumer-law review before launch in a market.

## Amendment — 2026-08-27: the storefront gains a destination context, and Global is its default (owner decision, Bogs)

§1 required a versioned allow-list of enabled destinations and copy saying "ships to supported
countries" rather than "ships worldwide". Until now the storefront had **no notion of a
destination at all** outside the checkout address form, so it said neither. This amendment
records what it now does. Built and merged the same day —
`sals3-ecommerce` [#170](https://github.com/Sals3-Official/sals3-ecommerce/pull/170) — with no
schema, migration or API contract change. See
[[sals3-session-2026-08-27-part81-the-site-learns-where-it-is-shipping]].

### Decision

1. **The storefront resolves a buyer destination**, in this order: the buyer's stored choice, then
   a geo-IP hint, then **Global**. Global is the default, because the site's shape is a global one
   (owner decision 2026-08-27) and a neutral state must not name a country nobody picked.
2. **§1's geo-IP rule is implemented literally.** A geo hint is *never* written to the cookie on
   the buyer's behalf, so a stored value always means a person chose it, and the resolver reports
   `chosen | suggested | default` so no interface can present a guess as a decision. There is
   deliberately **no middleware**: stamping a cookie on first request is the one thing that would
   make a guess indistinguishable from a choice.
3. **The destination vocabulary is the six measured countries plus Global** — the same seven
   scopes as ADR-015's pricing, deliberately not a list of every country. Offering ~190 countries
   would be the "ships worldwide" claim §1 forbids, made in a dropdown instead of a sentence.
4. **The gap between pricing and ordering is disclosed, not hidden.** Where an order may be
   *priced* (seven scopes) and where it may be *placed* (`CHECKOUT_ALLOWED_COUNTRIES`, two
   countries) are separate lists, and the storefront now names the second before a buyer reaches
   the sign-in wall.

### What this does not change

**No destination is enabled by this amendment.** Checkout still accepts Australia and the
Philippines. A buyer's destination changes no price either: prices are frozen onto
`product_offers` at publish and the storefront read model has no `market_code` filter, so this is
a context and a disclosure, not a pricing mechanism.

### Consequence for §2's cache guidance

Reading the destination in shared chrome converts every route that renders the site header from
static to dynamic. Measured across the change: exactly two routes flipped, `/cart` and
`/categories`. That is accepted — a static page would serve one visitor's header to all of them —
but it means **any new route rendering the header is dynamic from birth**.

The portal's `unstable_cache` catalogue cache is keyed without a country and is barred from
reading request APIs. It is safe **only while the destination changes no price**. The day a price
becomes destination-dependent, the destination must be threaded into that cache key as an
explicit argument; nothing will report it if that is missed.

### Open

- **Widening checkout is two pieces of work, not one**: the freight-quote country enum, and an
  address form that is currently dropdown-driven from closed region and city lists per country
  and does not generalise beyond them.
- **Before Global can take an order**: a duty model, a restricted-category deny-list, a sanctions
  country deny-list, and terms naming the buyer as importer of record — see
  [[cross-border-rest-of-world-selling-reference]].
- **`sals3.com` does not serve this storefront.** It resolves to SiteGround behind a captcha
  challenge with `X-Robots-Tag: noindex`; the storefront is on Vercel. The domain is referenced
  nowhere in either codebase and `NEXT_PUBLIC_SITE_URL` is unset, so every canonical URL and the
  Organization JSON-LD `url` are omitted rather than guessed. §6's international-SEO guidance
  cannot be satisfied until a real domain is configured.

**Frontmatter `updated`** moves to 2026-08-27.

## Amendment — 2026-08-28: the shopfront per country and the buyer's choice are both withdrawn (owner decision, Bogs)

The amendment above, and the shopfront-per-country that followed it a day later, are **reverted**
by owner decision. `sals3-ecommerce` [#177](https://github.com/Sals3-Official/sals3-ecommerce/pull/177)
and [#178](https://github.com/Sals3-Official/sals3-ecommerce/pull/178), both merged and live, no
schema, migration or API contract change. See
[[sals3-session-2026-08-28-part85-one-storefront-again-and-the-country-that-stopped-being-asked]].

### What the owner said, and why

> "kung ano ang current selected country ay kahit anong pindotin ay di mag spill over sa ibang
> country" — 2026-08-28, after finding that `/checkout` read `Ship to: Philippines` while its own
> logo linked to `/au`.

Then, when offered the choice between patching that and removing the split: **remove the split**,
and the `Ship to` picker with it. "Revert talaga sa original."

The reasoning is worth keeping because it is not the obvious one. The defect was not that a link
was wrong; it was that **one fact — the buyer's country — was stated in two places that could
disagree.** A patch keeps both places and teaches them to agree, which lasts until the next
surface forgets. Removing one of them ends the class of defect.

### Decision

1. **There is one storefront.** No market segment in any URL: `/`, `/p/[id]`, `/c/[slug]`,
   `/search`, `/categories`, `/cart`. `/au`, `/ph` and `/fj` redirect back, **temporarily (307)** —
   the owner's word was `muna`, for now, and a permanent redirect would outlive the decision. An
   unrecognised segment is still a 404.
2. **Point 1 of the 2026-08-27 amendment survives; its first step has no control.** The resolution
   order is still stored choice → geo-IP → Global, but the `Ship to` picker was the only writer of
   the cookie and it is deleted, along with `setDestinationAction`. The read is kept so a buyer who
   chose a country on 2026-08-27 keeps it rather than silently losing it.
3. **Point 2's `chosen | suggested | default` reporting is withdrawn.** Its only readers were the
   picker and the wrapper that fed it. Nothing now presents a destination to the buyer, so nothing
   needs to distinguish a guess from a decision on screen.
4. **Points 3 and 4 stand.** The vocabulary is unchanged, and the gap between "priced" and
   "orderable" is still disclosed — by the cart's notice, which now speaks to the geo-or-Global
   answer rather than to a chosen one.

### The cost, stated plainly

**§1's silence is back.** A buyer cannot tell the site where they are shipping until the checkout
address form — which is the exact failure the 2026-08-27 amendment was written to end, quoted in
its own opening paragraph. In practice geo-IP is now the only live signal, and `x-vercel-ip-country`
is absent locally and on any non-Vercel host, so **every visitor without it is treated as Global**:
the cannot-ship notice on the cart, and no approximate local price.

This is a deliberate owner trade, not an oversight, and it is recorded here so nobody re-derives it
as a bug. The cheapest way back, if it is wanted, is the **checkout address form writing the cookie
it already reads** — one call, no change to the read path.

### What did not change

- **USD remains what is charged** (§3). The approximate local price survives, re-keyed from the
  market in the URL to the destination the buyer is shopping to — the only honest answer to "local
  to whom" once no URL names a country. AUD, PHP and FJD only, because those are the three
  currencies `rates.ts` can source from a named central bank; every other destination shows no
  figure rather than one from an unnamed rate.
- **No destination is enabled or disabled.** Checkout still takes Australia and the Philippines.
- **§6's international-SEO guidance is again unsatisfiable for a different reason**: the `hreflang`
  set went with the markets, correctly, because there are no alternates to be reciprocal with. The
  home page now emits a self-referential canonical — still omitted in production, because
  `NEXT_PUBLIC_SITE_URL` is unset.

### Consequence for §2's cache guidance

The 2026-08-27 note that "any new route rendering the header is dynamic from birth" **no longer
holds for that reason**: the header no longer reads `cookies()`. The routes that resolve a
destination are now the cart, the PDP and the checkout flow, each of which was dynamic already.
The `unstable_cache` warning stands unchanged and for the same reason: it is keyed without a
country and is safe only while the destination changes no price.

**Frontmatter `updated`** moves to 2026-08-28.

## Amendment — 2026-08-28: freight options are sorted into three named delivery tiers

CJ returns a variable, unnamed list of logistics options per package — the same cart can offer
four choices one minute and seven the next, with names that mean nothing to a buyer. §1's
"checkout freight confirmation" and the verification item "checkout rejects stale or changed
quotes before payment" both assume the buyer chose something nameable. They could not.

### Decision

1. **Every quote is classified into exactly one of three tiers** — `Standard`, `Express`,
   `Expedited` — from its arrival window, and the buyer is offered at most one option per tier.
   Classification is a pure function over the parsed window, so the same quote list always
   produces the same tiers.
2. **The tier is what the buyer selects, and what is carried forward.** The selection travels
   into the Stripe Checkout Session metadata (`sals3_checkout_version: cj_freight_v2`) and onto
   the order, so what was promised at checkout is recoverable from the payment record alone.
3. **The tier is persisted nullable.** `fulfillment_groups.shipping_tier` is a nullable `text`
   with a CHECK constraint restricting it to the three names. Nullable because every order placed
   before this change has no tier and must not be given a false one.
4. **Older receipts stay readable.** The receipt path keeps its pre-tier shape, so an order from
   last week renders from the same code as one from today.

### What this does not change

No destination is enabled or disabled; checkout still takes Australia and the Philippines. USD
remains what is charged. Prices are untouched — this changes only how the freight line is chosen
and named.

### Migration

`drizzle/0032_strict_shipping_tiers.sql`. Additive only: one nullable column and one CHECK
constraint, no backfill and no rewrite of existing rows.

**Frontmatter `updated`** stays 2026-08-28.

## Amendment — 2026-08-29: destination thresholds fund Standard delivery only (owner decision, Bogs)

The storefront now offers free `Standard` delivery when the current, Portal-verified
product subtotal reaches the destination's USD threshold:

| Destination | Product subtotal threshold |
|---|---:|
| Philippines (`PH`) | US$12 |
| Australia (`AU`) | US$25 |
| Fiji (`FJ`) | US$55 |

### Decision

1. **Portal owns eligibility.** It resolves current published offer prices while producing the
   existing CJ freight quote, totals `price × quantity`, and returns the threshold, verified
   subtotal, amount remaining, and eligibility. Browser cart prices never authorize the benefit.
   Threshold values exist only in Portal server environment:
   `SALS3_FREE_STANDARD_SHIPPING_PH_USD`,
   `SALS3_FREE_STANDARD_SHIPPING_AU_USD`, and
   `SALS3_FREE_STANDARD_SHIPPING_FJ_USD`. There is no code fallback.
2. **Only `Standard` becomes zero.** Classification still uses CJ's positive freight amounts.
   After classification, an eligible Standard row receives a buyer charge of zero; Express and
   Expedited retain their full quoted amounts.
3. **Payment re-verifies the zero.** Both ecommerce and Portal re-quote and require the selected
   package, tier, option, channel, amount, and currency to match before intent and Stripe Session
   creation. A zero Standard amount is valid only when that fresh quote also returns zero.
4. **Supplier freight remains auditable.** Each quote carries `regularAmountMinor` beside the
   buyer-facing `amountMinor`, and Portal's immutable freight snapshot retains both. The promotion
   changes what the buyer pays; it does not claim CJ stopped charging Sals3.
5. **Checkout shows measured progress.** Below threshold it states the exact USD amount remaining.
   At or above threshold it states that free Standard delivery is unlocked. Its short animated
   sheen uses transform only and respects reduced-motion preferences.

This adds no CJ call, background task, package, database migration, or new destination. It uses
the quote work checkout already performs for AU, PH, and FJ. Ecommerce opts in through
`capabilities.freeStandardShipping`; omission keeps Standard paid, so separate deployments remain
backward compatible.

## Amendment — 2026-09-07: Fiji sells in FJD (owner decision, Bogs)

§3 above says phase 1 "displays/charges USD" and that an approximate local-currency
display "must not change the actual charge currency". For the Fiji market, that no
longer holds. `sals3.com.fj` is a Fijian storefront for Fijian buyers, and the owner's
decision is that it prices, quotes, and charges in **FJD** — not USD with a Fijian
number painted over it.

### What this reverses, and what it does not

It reverses the currency half of §3 **for Fiji only**. AU and PH are untouched: they
remain USD, and this amendment authorizes no second currency for them. §3's
requirement that a local-currency *display* be clearly labelled also survives, because
until every step below is delivered, the labelled display is exactly what Fiji has.

It does not reverse §3's conditions on multi-currency. Those were written as the price
of admission and are now binding rather than hypothetical: **store the rate, the
provider and source, the effective timestamp, the spread, and the locked order rate.**
An FJD order that cannot say which rate it was struck at is not acceptable.

### Why this is possible now and was not when §3 was written

§3 was written when the platform had no approved reference-FX provider at all.
`modules/pricing/reference-fx.ts` returned only the identity rate, and ADR-015's own
status note recorded that its FX branch was "still not exercised by any live
non-identity currency pair". A price in any currency but USD could not be produced
honestly, so USD was not a preference — it was the only truthful answer.

That changed on 2026-09-04, when the owner approved the central-bank source. The
module now quotes `USD/FJD` against the **Reserve Bank of Fiji**, pinned by name, with
no aggregator blend and no configured-constant fallback. The input §3 lacked exists.

### The defect this amendment sits on top of

Fiji has had operating expenses (50%) and a full column of category markups (200%) set
for it in Market Rules since the market was opened, and **not one offer was ever priced
by them**. `publish.ts` wrote offers for `resolveOfferDestinations(...)[0]`, and because
`market-rules/page.tsx` removed the only way to create a `seller_market_profiles` row on
2026-08-20, no seller has one — so that fallback was the only branch that ran, and every
published product in the catalogue carried an `AU` offer alone.

Measured on SIT on 2026-09-07, same slug, same moment: `sit.sals3.com` showed US$3.36
and `sit.sals3.com.fj` showed FJ$7.58 — a ratio of 2.256, which is the published rate
plus its buffer, not a Fiji margin. Fixed the same day: publication now writes an offer
for every market the seller has priced. That fix is a precondition of this amendment,
not a part of it — an FJD price is meaningless until a Fiji offer exists to carry it.

### Ordered, and no step may be skipped

Each step is separately verifiable, and a half-applied version of this amendment is
worse than none: an offer denominated in FJD that is charged in USD would convert twice
and disclose neither.

1. **A Fiji offer exists, priced by Fiji's rules.** Delivered 2026-09-07. Still
   denominated in USD.
2. **The Fiji storefront reads only Fiji's offer.** The storefront read model has no
   `market_code` filter, so the cheapest offer across all markets prices every card;
   until it filters, Fiji can be shown a price another market's rules produced. Nothing
   about FJD is safe before this.
3. **FJD becomes an authorized selling currency for Fiji.**
   `modules/market-config/capabilities.ts` lists `authorizedSellingCurrencyCodes:
   ['USD']` for every destination including `FJ`. The resolver prices through
   `reference-fx.ts`, which already answers for `FJD`, and must fail closed exactly as
   it does today when the Reserve Bank rate is unavailable — an offer that cannot be
   priced honestly stays unpriced.
4. **Checkout quotes and charges FJD.** `modules/checkout/orders.ts` hard-codes the
   currency as `z.enum(['USD'])` and `z.literal('USD')`; CJ freight quotes are
   USD-denominated (§3); and the order snapshot must carry the locked rate named above.
5. **The payment rail carries FJD.** Stripe lists FJD as a supported presentment
   currency — owner-confirmed 2026-09-07 against `docs.stripe.com/currencies`. Stripe's
   own page adds that the presentment list is per account country, so the one thing
   still to record is that it is enabled for the Sals3 account; that is a dashboard
   observation, not a design question, and it does not reopen this decision.

   Presentment is not settlement. Stripe converts a charge whose currency differs from
   the settlement currency of the receiving account, so an FJD charge on a
   USD-settling account is a conversion with a cost and a rate — which is precisely
   what §3 requires be stored, and why the locked order rate in step 4 is not optional
   paperwork.

Step 4 is what turns a Fijian price into a Fijian charge. Until it ships, the storefront
must keep saying what it says today — that payment is taken in US dollars — because that
will still be true.

### Verification required

- The Reserve Bank of Fiji rate resolves for `USD/FJD`, and pricing fails closed when it
  does not.
- A Fiji offer's stored `pricingDecision` names the rate, its source, and its timestamp.
- An FJD order records the rate it was locked at.
- FJD presentment enabled for this account, observed in the Stripe dashboard and
  recorded here with the date it was checked.
- The conversion from an FJD charge to the account's settlement currency is stored with
  its rate and its cost, not inferred afterwards from a payout total.

### Rollout status — recorded 2026-09-08

Steps 1–3 of the ordered list above were delivered on 2026-09-07 and are live.
**Step 3's currency authorization is wired and switched off, and step 4 is half
done, so this amendment is NOT yet in force: Fiji still charges USD.**

| Step | State on 2026-09-08 | Evidence |
|---|---|---|
| 1. A Fiji offer exists, priced by Fiji's rules | **done** | `sals3-portal` [#69](https://github.com/anythingsupplies/sals3-portal/pull/69) |
| 1b. Already-published products backfilled | **done, and run** — 5,666 offers written; `NZ`/`US`/`CA` withdrawn as unconfigured | [[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn\|part 144]] |
| 2. The Fiji storefront reads only Fiji's offer | **done** — `?market=FJ` on five catalogue reads, sent by the storefront, PDP variants scoped | [[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price\|part 145]] |
| 3. FJD authorized as a selling currency for `FJ` | **wired, switched OFF** | [[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off\|part 146]] |
| 4. Checkout quotes and charges FJD | **half** — checkout prices from the storefront's market and carries the offer's currency; settlement is still USD | `sals3-portal` [#120](https://github.com/anythingsupplies/sals3-portal/pull/120) |
| 5. The payment rail carries FJD | **not started** — the dashboard observation is still unrecorded | — |

> [!WARNING] The switch is a one-line change and must not be flipped alone
> Verified on `anythingsupplies/sals3-portal@main` 2026-09-08:
> `src/modules/market-config/capabilities.ts` carries
> `settlementCurrencyCode: 'USD'` on **all six** destinations, and
> `settlementCurrencyForMarket` falls back to `'USD'`. Flipping `FJ` to `FJD`
> needs the Fiji storefront to **stop converting a price that is already
> Fijian** in the same release, or the buyer sees a double-converted number and
> is charged a third one. The storefront change must not lead.

What step 1–3 delivery did **not** change, and what the storefront must therefore
keep saying: **payment is taken in US dollars.** That is still true. What did
change is that the Fijian number a buyer sees is now derived from **Fiji's own
margin** rather than Australia's — verified live, same product, same moment:
`sals3.com.au` A$21.96 (200%), `sals3.com.fj` FJ$25.81 (120%).

A consequence worth carrying into ADR-016's territory: `offers.priceCurrency` in
the storefronts' `Product` JSON-LD is `USD` on all three domains, because that is
the charge currency, while the ccTLDs display A$ and FJ$. An Australian seeing a
rich result gets a USD price. Asserting a currency Sals3 does not charge would be
a fabrication, so it stands — and it resolves itself once step 4 ships. Raised as
an owner decision in [[sals3-session-2026-09-08-part153-the-canonical-layer-switched-on-across-three-storefronts|part 153]].

## Amendment — 2026-09-09: a market storefront's own country seeds the checkout address form, above geo and below a choice (owner decision, Bogs)

§1 above says: *"Geo-IP is only a default suggestion. The user's selected shipping
country is the browsing source of truth."* That sentence was read, from 2026-09-04
until this amendment, as forbidding the checkout address form from being seeded with
anything but the buyer's own stored choice — which in practice meant seeding it from
geo-IP, or from a hard-coded fallback when geo said nothing.

Measured on the live sites on 2026-09-09, that reading produced the opposite of what
§1 protects. `sals3.com.fj/checkout` and `sals3.com.au/checkout` were both serving a
**Philippine** address form — the seventeen PH regions, PH cities, a `+639` phone
prefix, and a mandatory postal code the Fiji storefront's own welcome band says is not
needed — under Fijian and Australian prices respectively. Two paths reached it: geo
answers `PH` for a buyer in Manila, and a visitor with **no** geo header resolves to
Global, which carries no checkout country, so the form fell to its own
`FALLBACK_COUNTRY = 'PH'`. Every visitor from outside the six named countries got it.

### What this amends

**A market storefront's own country (`NEXT_PUBLIC_SALS3_MARKET`) outranks geo-IP when
seeding the checkout address form.** It is not a guess about the person: opening
`sals3.com.fj` is itself a buyer action, and a more deliberate one than the IP their
traffic exits from. §1's purpose is that a **guess** must not masquerade as a
**choice**; a deployment's identity is neither, and it beats the guess.

### What this explicitly does not amend

**A stored choice still wins.** The `sals3_destination` cookie is written only by
`setDestinationAction` and by no middleware, precisely so its presence means a person
picked it. A market must not overrule it, and §1 is unchanged on that point. The first
implementation of this seed did overrule it for about four hours on 2026-09-09 and was
corrected the same day; the correction is the reason `resolveDestinationChoice()`
reports *where* an answer came from rather than only *what* it is.

`resolveDestination()` itself is unchanged, and so are the cart's cannot-ship notice
and the approximate local price — both still follow the buyer's destination, or Global.

### The resulting precedence

| | Signal | Standing |
| --- | --- | --- |
| 1 | A stored choice | §1's browsing source of truth |
| 2 | The deployment's market | A fact about the storefront |
| 3 | Geo-IP, then the form's default | A suggestion |

A stored `NZ`, `US`, `CA` or Global cannot be honoured, because checkout takes no
address for those; it falls to the market rather than to the unrelated `PH` default.

### What it is not

It is a **seed, not a lock**. The country select stays fully editable,
`CHECKOUT_ALLOWED_COUNTRIES` and the Zod schema are untouched, and the address is
still validated server-side on submit. Whether a market storefront should *restrict*
checkout to its own country is a separate decision this amendment does not make.

It also does not restore the `Ship to` picker withdrawn by the 2026-08-28 amendment, so
a buyer still cannot make a **new** choice before the address form — only a cookie
predating 2026-08-28 carries one. That gap is registered in [[pending-register]].

Detail, evidence and the failing-test output in
[[sals3-session-2026-09-09-part161-the-fiji-and-australian-storefronts-were-asking-for-a-philippine-address|part 161]];
`sals3.com.fj` [#41](https://github.com/anythingsupplies/sals3.com.fj/pull/41)/[#42](https://github.com/anythingsupplies/sals3.com.fj/pull/42),
`sals3.com.au` [#33](https://github.com/anythingsupplies/sals3.com.au/pull/33)/[#34](https://github.com/anythingsupplies/sals3.com.au/pull/34), all merged to `develop`, none promoted.
