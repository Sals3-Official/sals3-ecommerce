---
tags: [sals3, adr, shipping, pricing, international, seo, currency]
aliases: [ADR-003, International Availability and Pricing, Destination Pricing]
created: 2026-08-06
updated: 2026-08-28
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
