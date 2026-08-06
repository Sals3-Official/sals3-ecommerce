---
tags: [sals3, adr, shipping, pricing, international, seo, currency]
aliases: [ADR-003, International Availability and Pricing, Destination Pricing]
created: 2026-08-06
updated: 2026-08-06
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
---

# ADR-003 - International availability, shipping, currency, and pricing

> [!IMPORTANT] Approved direction; launch markets still require configuration
> Sals3 will support explicitly enabled countries rather than claim universal worldwide delivery. Regional estimates may improve browsing, but only a destination-specific quote can authorize checkout.

## Decision

### 1. Use explicit launch markets

Maintain a versioned allow-list of enabled destination countries and product/category restrictions. Customer copy should say "ships to supported countries" rather than "ships worldwide" until every claimed country is operationally verified.

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
