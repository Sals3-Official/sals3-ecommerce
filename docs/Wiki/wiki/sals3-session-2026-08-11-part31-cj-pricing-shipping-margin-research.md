---
tags: [sals3, session, cj, pricing, margin, shipping, forex, evidence]
aliases: [CJ Pricing and Shipping Margin Research, Sals3 Pricing Research]
created: 2026-08-11
updated: 2026-08-11
status: session-note
authority: research-record
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[sals3-session-2026-08-11-part30-cj-legacy-continuous-discovery-implementation-review]]"
---

# Sals3 session 2026-08-11, part 31 — CJ pricing, freight, service-fee, and margin research

## Status and purpose

`research-record`; this is **not** an implementation authorization, a supplier-contract finding, a production fee schedule, or a replacement for [[ADR-003-international-availability-shipping-and-pricing]] or [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]].

The owner asked where Sals3 should assign margin and foreign-exchange (FX) adjustment in the Product Editor, then challenged an important assumption: the customer may pay shipping separately. This note records the official CJ materials read on 2026-08-11 and the design consequence. Its purpose is to prevent a future UI or pricing engine from silently treating customer-paid shipping as item revenue, hiding CJ freight, or calling an estimated quote exact.

## Executive conclusion

CJ consistently treats product cost, logistics/freight, and service-fee components as supplier-side costs that must be understood before a seller decides a retail price. CJ also explicitly leaves the **customer-facing shipping strategy** to the seller: a seller may offer free shipping and bake the cost into item price, or charge a flat customer shipping fee. The documents do **not** prescribe one mandatory storefront model.

Therefore Sals3 must model two different flows, never conflate them:

```text
Supplier fulfillment obligation (CJ account pays)
  CJ product cost
  + selected CJ freight/shipping cost
  + CJ logistics service component where returned
  + any applicable supplier/fulfillment costs

Customer checkout revenue (Sals3/storefront collects)
  item price
  + customer shipping charge, if the merchant chose customer-paid shipping
  + applicable tax amounts collected on behalf of a tax authority
```

If shipping is customer-paid, freight must **not automatically be added to the item price**. It must still participate in order contribution economics because CJ charges the merchant account to fulfill it. If shipping is advertised as free, the merchant must intentionally absorb it in the item economics or make an explicit subsidy decision.

## Official CJ sources reviewed

All URLs below were opened/read on 2026-08-11. CJ blog articles are supplier guidance/marketing material, not a binding API contract. OpenAPI documentation is the stronger source for request/response behavior; actual production behavior still requires the approved contract probe and live-order validation before launch.

### 1. Service Fee page

Source: <https://cjdropshipping.com/service-fee>

What it says:

- CJ describes a set of fulfillment-related services: shipping, storage, inspection, packing, stocktaking, and labeling.
- The page contains shipping, inbound, outbound, storage, and add-on-service charges. It specifically warns that overseas-warehouse stock-shipping prices are references and subject to real-time change; it directs users to Shipping Calculation for actual delivery pricing.
- It distinguishes China/US and European warehouse contexts. Many published figures apply to private inventory, warehouse fulfillment, bulk stock movement, labeling, storage, or other optional services—not necessarily one-off direct dropship orders.

Sals3 interpretation:

- Do not build a universal per-item fee by scraping or hard-coding this table.
- Direct dropshipping must use the actual CJ response for the selected product/variant, origin, destination, and logistics method.
- Private-inventory, custom-packaging, warehouse, and add-on costs belong in a separate applicable-cost model and must only be included when the selected fulfillment configuration actually uses them.

### 2. CJ Help Center: shipping and service fee

Sources:

- <https://www.cjdropshipping.com/help-center>
- <https://cjdropshipping.com/help-center?keyWord=shipping+fee&navType=search&searchType=faq>
- <https://cjdropshipping.com/help-center?keyWord=Outbound+Cost&navType=search&searchType=faq>

What it says:

- Shipping cost depends on shipping method, destination country, product weight, and product attributes; CJ points users to its Shipping Calculator for average cost and delivery time.
- CJ says `service fee` is not a new/additional charge but a clarification/breakdown of the original logistics cost. It describes the split as `Shipping Fee + Service Fee`, with service fee including labor, quality inspection, packing, and dispatch.
- CJ's listing guidance tells sellers to edit their store price based on CJ product and shipping cost.
- CJ also recommends making shipping costs clear on a home or product page to avoid checkout surprises; its Shopify guidance presents exact, flat-rate, and free-shipping strategies as merchant choices.

Sals3 interpretation:

- A returned CJ logistics `serviceFee`, when applicable, is not optional just because its label is separate from freight. It is part of the fulfillment cost evidence.
- “Calculated from CJ” is not the same thing as “exact for every visitor.” Destination, shipment configuration, and current supplier state determine the result.
- Customer transparency must not be achieved by claiming a permanent exact shipping number before the system has the required quote inputs.

### 3. CJ OpenAPI logistics and shopping documentation

Sources:

- <https://developers.cjdropshipping.cn/en/api/api2/api/logistic.html>
- <https://developers.cjdropshipping.cn/en/api/api2/api/shopping.html>

What it says:

- `POST /api2.0/v1/logistic/freightCalculate` calculates freight from order/destination data. Its documented inputs include shipment origin country, destination country, optional postal code, product variant ID, and quantity.
- CJ’s shopping/cost responses can expose a logistics amount under names such as `freightAmount`, `logisticsCost`, or `shippingCost`; a service-fee field may also be returned. Field availability depends on the order/cost workflow.
- CJ’s documented cost result can carry a selected freight row, selected logistics name, product amount, service fee, shipping cost, total amount, and an explicit flag for whether totals are calculable. When logistics is not selected, the total may intentionally remain uncalculated.
- CJ order creation requires a logistics option that is available for the current warehouse/products/destination. CJ’s own order guidance says the merchant pays `product cost + shipping` before CJ processes/ships the order.

Sals3 interpretation:

- The exact checkout quote must be tied to a variant, quantity, destination, origin/warehouse, selected logistics method, currency, response timestamp, and expiry/freshness state.
- A product detail page can show a regional estimate or a statement such as “shipping calculated at checkout,” but must label any non-address-level number as an estimate.
- Product page, cart, checkout, and supplier-order flow must not reuse an expired or mismatched freight response.
- The supplier fulfillment cost must be recorded independently from the customer shipping charge even when both happen to have the same number.

### 4. CJ article: `CJdropshipping Made Easy: 5 Must-Know Tips for 2026`

Source: <https://cjdropshipping.com/blogs/cj-news/CJdropshipping-5-Must-Know-Tips>

Relevant claims:

- Local/US warehouse stock can reduce delivery time and may lower shipping cost, especially for heavy items.
- CJ advises selecting warehouse stock and compatible logistics, monitoring stock, ordering samples, and using inventory/order automation.
- It says CJ provides a profit dashboard and describes the ability to set minimum-margin rules/warnings.

Reliability and Sals3 interpretation:

- These are strategy claims, not a stable pricing API specification or evidence that every CJ product has viable local stock.
- Warehouse and origin must be visible as an evidence input because they materially affect freight, delivery promise, and returns risk.
- “Minimum margin warning” supports a Sals3 guardrail concept; it does not justify hard-coding CJ's suggested values or treating a broad catalogue candidate as profitable without freight evidence.

### 5. CJ article: `Dropshipping Profit Margin Explained`

Source: <https://cjdropshipping.com/blogs/selling-strategies/Dropshipping-Profit-Margin-Explained>

Relevant claims:

- CJ defines margin as `(Revenue − Total Costs) / Revenue × 100%`.
- It lists product cost, shipping, advertising, payment processing, platform fees, and returns/refunds as cost categories that affect profitability.
- It presents broad illustrative ranges: beginner stores 10–20%, growing stores 20–30%, established brands 30–50%+; these are market commentary, not Sals3 policy values.
- It calls a three-times-product-cost price a common rule of thumb to leave room for additional costs.

Sals3 interpretation:

- The formula is useful only when `revenue` and `total costs` use matching scope. A margin based solely on retail item price and product cost is a **product gross-margin proxy**, not complete order contribution margin.
- CJ’s ranges and 3× multiplier are market heuristics. They must not become a publication threshold or a default seller margin without explicit Sals3 owner/merchant approval, market evidence, and tenant-scoped policy.
- Advertising, returns, platform fees, and payment fees may be unavailable at catalogue-discovery time. The UI must show which costs are actual, estimated, configured allowances, or absent—not fabricate a “net profit.”

### 6. CJ article: `How to Price Your Dropshipping Products`

Source: <https://cjdropshipping.com/blogs/selling-strategies/How-to-Price-Dropshipping-Products>

Relevant claims:

- It says pricing should start with product, shipping, packaging, platform commission, payment-gateway fee, and potential-return costs; it calls this total landed cost.
- Its illustrative framework is `Final Price = Product Cost + Shipping + Platform Fees + Marketing Cost + Desired Profit Margin`.
- It describes cost-plus markup (30–60% in its example), competitive pricing, value-based pricing, bundle pricing, and psychological/charm pricing.
- It notes that faster/reliable delivery and local warehouse availability can support higher perceived value/pricing.

Sals3 interpretation:

- The formula is a business-planning shorthand, not a safe accounting expression. A percentage target margin must be solved as a denominator, not added as though it were a dollar cost. ADR-003’s contribution-economics formula remains the authoritative Sals3 formula.
- Any use of `.99`, anchors, discounts, scarcity, or countdowns must follow ADR-003’s ban on fabricated price comparisons and deceptive claims.
- Competitive/value-based strategy is a merchant commercial decision. It is not supplier truth and must not mutate supplier evidence.

### 7. CJ article: `How To Start Dropshipping From China`

Source: <https://cjdropshipping.com/blogs/dropshipping-knowledge/How-To-Start-Dropshipping-From-China>

Relevant claims:

- It recommends pricing with a markup over landed cost, described as product price plus shipping, and gives 2–3× as a common dropshipping heuristic to leave advertising/return room.
- It says sellers can select shipping options, manage shipping promises, and should ensure listed product details fit their brand.
- It notes that delivery speed varies by shipping method; cross-border shipping can be slower, while stocked overseas warehouses can shorten delivery.
- It flags customs/import-tax differences and suggests considering DDP where applicable.

Sals3 interpretation:

- A product’s browse/publish eligibility cannot assume country-wide delivery, taxes, or exact shipping. ADR-003’s country allow-list and checkout quote gate remain mandatory.
- A delivery promise must be sourced from a valid quote/method/warehouse combination; it cannot be inferred from a generic CJ marketing duration.
- Tax/duty treatment needs legal/operational validation per destination and cannot be guessed from the shopper’s country alone.

### 8. CJ article: `What is CJdropshipping`

Source: <https://cjdropshipping.com/blogs/cj-news/What-is-CJdropshipping>

Relevant claims:

- CJ says it shows product plus shipping cost and the seller chooses the retail price.
- It explicitly describes both customer-facing choices: bake shipping into a “free shipping” product price **or** charge a flat shipping fee.
- It says shipping method should be selected for each destination and its promise must be consistent with the actual selected warehouse/method.
- It says the seller pays CJ for product cost plus shipping for fulfillment; it also notes that an order can be consolidated when compatible items originate from the same warehouse.

Sals3 interpretation:

- This directly confirms that shipping strategy is merchant-facing policy; supplier freight is a supplier cost regardless of whether the buyer sees a separate shipping line.
- Multi-item shipment economics are order-level. Do not sum standalone product-page freight estimates and call the result an exact final freight charge; consolidation/splitting can change it.

### 9. CJ article: `12+ Dropshipping Products with High Profit Margin`

Source: <https://cjdropshipping.com/blogs/dropshipping-niches/12--Dropshipping-Products-with-High-Profit-Margin>

Relevant claims:

- It offers product/niche examples and repeatedly favors products with low source cost, clear perceived value, bundling potential, demonstrable benefits, and social-media appeal.
- Several examples are small/light accessories; it also contains premium/technical examples.

Sals3 interpretation:

- This is product-research inspiration, not supplier verification and not a reliable rule for automatic qualification.
- Lightweight, high perceived-value products may be useful discovery-ranking signals only after policy, IP/compliance, stock, supplier, freight, quality, and market evidence checks. It cannot override Sals3 product safeguards.

## Required pricing concepts and formulas

### A. Keep price, margin, markup, fees, and FX separate

These terms must be separately stored, rendered, audited, and versioned:

| Concept | Meaning | Must never be disguised as |
| --- | --- | --- |
| Reference FX rate | Market/provider observation for a named currency pair and timestamp | seller margin or an arbitrary markup |
| Merchant FX adjustment | Seller-configured buffer for a real funding/conversion exposure | reference FX rate or platform fee |
| Product price | Customer’s item charge | total order revenue |
| Customer shipping charge | Shipping revenue chosen by merchant policy | CJ freight cost |
| CJ product cost | Supplier item amount | total landed cost |
| CJ freight + service component | Supplier fulfillment logistics amount | customer shipping charge |
| Gross margin | Profit percentage for a clearly declared scope | an absolute dollar profit |
| Contribution profit | Revenue less attributable variable costs | unverified net profit |

### B. Product-price calculation — customer-paid shipping model

This is appropriate only if checkout charges a separate customer shipping amount:

```text
product_price_basis =
  converted_CJ_product_cost
  + product_allocated_handling
  + product_allocated_return_allowance
  + product_fixed_supplier_fee_if_applicable

minimum_item_price =
  (product_price_basis + desired_product_contribution + fixed_payment_fee_allocation)
  / (1 - variable_payment_fee_rate)
```

Do not include the full shipping cost in `product_price_basis` merely because it exists. The checkout/order profitability calculation below must still include it.

### C. Shipping-price calculation — customer-paid shipping model

```text
customer_shipping_charge = merchant shipping policy result

shipping_contribution =
  customer_shipping_charge
  - fresh_CJ_freight_cost
  - fresh_CJ_logistics_service_component_if_returned
  - shipping_allocated_payment_fee
  - shipping-specific duty/tax/handling absorbed by merchant
```

The policy may be exact calculated shipping, flat rate, zone rate, threshold/free-shipping promotion, or an explicit subsidy. A flat rate must show a loss-risk warning if a current quote exceeds it by the configured tolerance.

### D. Full order contribution — only valid after quote/selection

```text
order_revenue = item_revenue + customer_shipping_charge

order_variable_cost =
  converted_CJ_product_cost
  + CJ_freight
  + CJ_logistics_service_component
  + absorbed_duties_taxes
  + payment_processing_fee
  + allocated_handling
  + allocated_return_allowance
  + other evidenced variable costs

order_contribution = order_revenue - order_variable_cost
order_contribution_margin = order_contribution / order_revenue
```

This is the honest profitability result. Advertising/CAC may be added as an actual or approved estimated allocation, but must be visibly labelled. Never show a complete net-profit figure if those inputs are absent.

### E. Free-shipping model

For a merchant promise of free shipping, the expected/verified supplier logistics cost is intentionally absorbed:

```text
landed_cost = product_cost + freight + applicable_service_fee + other_absorbed_costs
selling_price must satisfy ADR-003 safety and contribution rules
```

At checkout, Sals3 must fresh-quote again. If the fresh quote makes the published price violate the configured loss threshold, payment/order submission must be blocked, repriced only through an approved customer-visible flow, or escalated to a merchant decision. It must never silently pass the loss to the seller.

## UI placement decision for future implementation

This describes desired information architecture, not completed UI.

### Settings → Market Rules → Pricing & Shipping Policy

Merchant-managed defaults, tenant-scoped as required by ADR-015:

- target product margin and minimum contribution profit;
- seller FX adjustment by currency pair/funding rail, with reason/effective period;
- rounding policy;
- shipping model per market/zone: free, flat, calculated, threshold, or disabled;
- default selected/shipping-method preference and promised delivery constraints;
- configured payment/handling/return allowances where permitted;
- publication/order loss thresholds and approval workflow;
- audit history, policy version, actor, reason, effective start/end, and rollback.

### Product Editor → Variants & Pricing

Use this page for product/variant-specific application and exceptions:

- read-only supplier product cost and currency/evidence timestamp;
- resolved reference FX rate, merchant adjustment, effective conversion rate, and freshness;
- inherited pricing policy with visible source (seller default, market, category, product, variant);
- approved product/variant margin or price overrides only where justified;
- final item price, rounding result, and product-margin scope label;
- warning when cost evidence, FX, policy authorization, or required price-floor evidence is missing/stale.

The user must not be asked to hand-type an alleged CJ shipping amount here as a substitute for a quote. This page may show the shipping model and latest applicable estimate, but no field may imply that it is a locked checkout quote.

### Product Editor → Markets & Shipping

Use this page for availability and shipping configuration/evidence, not for setting the item margin:

- enabled destination/market and warehouse/origin evidence;
- preferred/available logistics method and delivery promise;
- regional estimate status versus quote-required status;
- customer shipping policy inherited from Market Rules, with explicit per-product exception only when approved;
- quote freshness/coverage and delivery/restriction warnings.

### Customer product page and checkout

- Product page: show item price and the merchant’s shipping policy clearly. If no address-level quote exists, show an estimate with basis or “Calculated at checkout”; do not present an unsupported fixed number as exact.
- Cart/checkout: collect the destination inputs; call the supplier freight boundary; offer only eligible methods; show exact charge for the quote’s valid scope/time; persist quote identity and expiry.
- Payment/order confirmation: require an unexpired, matching quote and a still-valid price decision. Keep supplier fulfillment cost private; show buyer only the correct customer-facing charge/tax disclosures.

### Internal review and operational UI

An operator-facing cost waterfall should display:

```text
CJ product cost (supplier evidence)
→ reference FX rate
→ merchant FX adjustment
→ converted product cost
→ current/estimated/quoted freight + logistics service component
→ customer shipping strategy and charge
→ payment/other known cost allowances
→ product margin proxy and order contribution status
```

Every row requires a source, currency, timestamp/freshness, and an `actual | quoted | estimated | configured allowance | unavailable` label. The system must distinguish `not yet quoted` from `zero`.

## FX findings and guardrails

None of the reviewed CJ commercial articles defines a CJ-provided FX fee, a valid FX buffer percentage, a currency-conversion provider, or a rule for Sals3 merchant funding exposure. Therefore:

- Do not derive an FX adjustment from CJ marketing content.
- ADR-015 remains controlling: raw/reference rate, platform conversion cost, seller-owned FX adjustment, and margin are distinct.
- Phase 1 remains USD accounting/checkout under ADR-003 unless an approved multi-currency change is implemented.
- Any later local-currency display must be labelled approximate unless tied to a persisted rate, source, timestamp, and freshness policy; it must not silently alter order charge currency.

## Non-negotiable implementation safeguards

1. **No false exact freight.** Exact freight requires the complete quote identity; browse estimates may not authorize payment.
2. **No double-counted freight.** A customer-paid freight charge and CJ freight cost are different ledger entries. Do not put the same freight in both item cost and shipping cost unless the merchant explicitly selected free/absorbed shipping.
3. **No invisible service component.** When CJ returns a logistics service fee, preserve it as part of supplier fulfillment evidence.
4. **No hard-coded 2×/3× or 30–60% policy.** CJ’s figures are advice; Sals3 policy needs explicit owner/merchant approval and versioned configuration.
5. **No stale price/order.** Refresh quote before payment/order creation; persist quote inputs, selected method, amount, currency, response reference, timestamp, and expiry.
6. **No misleading storefront promise.** Delivery time, origin, free-shipping claim, tax/duty claim, and price must agree with valid supplier evidence.
7. **No cross-tenant commercial control.** Seller Portal owns merchant margin, merchant FX adjustment, and shipping strategy; Admin Portal owns only platform fees, reference-FX integrity, legal/safety constraints, and enabled capabilities.
8. **No fabricated discounts or urgency.** Keep ADR-003’s evidence requirement for old prices, discounts, scarcity, and countdown claims.
9. **No product-only “net profit” claim.** The UI must label a product-only margin as a proxy until order-level freight, fees, and other required inputs are known.
10. **No automatic live rollout from research.** The pricing resolver, seller UI, checkout quote integration, database migration, local/live tests, and legal/tax review remain future work.

## Open decisions before implementation

1. Which merchant shipping model is approved for the initial AU launch: customer-paid calculated, customer-paid flat, free shipping, threshold, or a controlled mix?
2. What customer-visible currency and settlement currency are approved? ADR-003 currently says USD phase 1.
3. Which CJ freight endpoint/result constitutes the authoritative checkout quote for Sals3’s chosen ordering flow, and what is its quote expiry behavior? Requires the separately authorized CJ contract probe.
4. Which payment rail(s) apply, and what are the real fixed/variable fees? Do not use generic Stripe/PayPal figures from a CJ blog as a Sals3 fact.
5. Which taxes/duties are merchant-absorbed, buyer-paid, or handled through a specific DDP/IOSS workflow for AU? Requires legal/operational confirmation.
6. Which merchant role can set defaults, request overrides, approve exceptions, and publish price changes under ADR-015?
7. What loss threshold, quote-change tolerance, and customer re-consent flow are acceptable if freight changes after product publication but before payment?
8. Should early Product Editor display regional freight estimates at all, or simply show the selected shipping policy until checkout quote support exists?

## Recommended next implementation sequence

1. Confirm the owner decisions above; do not start with cosmetic fields alone.
2. Implement typed money, cost-evidence, pricing-policy, and price-decision boundaries following ADR-003/ADR-015.
3. Add tenant-safe Settings → Market Rules policy surfaces and Product Editor inheritance/override display.
4. Implement CJ quote adapter with mocked contract tests first; run no live probe without owner authorization.
5. Implement product/cart estimate presentation, checkout re-quote/lock, and order snapshot persistence.
6. Add pricing, freshness, authorization, negative-cost, double-counting, stale-quote, and order-history tests; then perform approved local and deployed pilot validation.

## Provenance and limitation

This note summarizes public CJ material as read on 2026-08-11. CJ can change fees, quote behavior, shipping availability, warehouse inventory, taxes, service components, and documentation. The source pages do not replace a live, owner-authorized supplier contract probe, a real-payment test, legal/tax assessment, or the accepted Sals3 ADRs.
