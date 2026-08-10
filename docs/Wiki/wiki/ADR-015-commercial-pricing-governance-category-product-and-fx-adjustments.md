---
tags: [sals3, adr, pricing, margin, forex, admin-portal, governance, audit]
aliases: [ADR-015, Commercial Pricing Governance, Category and Product Pricing Policy]
created: 2026-08-10
updated: 2026-08-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
---

# ADR-015 — Commercial pricing governance, category/product margins, and FX adjustments

## Status

`approved`

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved the future ability to manage category pricing, product-specific margins, and customizable foreign-exchange adjustments on 2026-08-10, then clarified the multi-seller authority boundary the same day. Merchant commercial policy belongs to each seller account in Seller Portal; Admin Portal governs only platform-owned inputs, fees, permissions, and safety/legal guardrails. This ADR does not authorize implementing either pricing surface or replacing the current storefront pricing contract in the active country-policy cleanup.

## Problem

Sals3 currently has prototype pricing behavior: a live/reference exchange rate with a configured FX buffer and a flat markup that does not represent full landed cost or contribution economics. A fixed percentage embedded in application code cannot safely support new destinations, currency pairs, payment rails, product categories, or a growing company with a person in charge (PIC) for each category.

Category defaults are useful, but they are insufficient. Individual products—and, only where economically necessary, variants—may need a different target margin because of competition, freight, return risk, supplier volatility, lifecycle, or strategic positioning. Sals3 cannot know every merchant's operational needs, so these commercial decisions belong to that merchant inside its tenant-scoped Seller Portal. Exceptions must remain bounded, explainable, reviewable, and reversible.

The actual market exchange rate, an FX adjustment, and a commercial margin are different inputs. Combining them into one generic markup hides costs and prevents reliable reconciliation.

## Decision

### 1. Separate pricing inputs

The pricing engine must preserve distinct, currency-explicit inputs:

- supplier/product cost;
- destination freight and absorbed duties/taxes;
- actual/reference FX rate, provider/source, observation time, and freshness;
- **FX adjustment** (spread/buffer) applied by Sals3;
- fixed and variable payment/supplier-funding fees;
- handling and expected return/refund allowance;
- target margin rate;
- minimum contribution profit;
- category/product price floor or ceiling where approved;
- rounding rule and final price currency.

An FX adjustment is not the exchange rate and is not product margin. A margin is not a fee. UI, APIs, storage, audit, and reports must retain those distinctions.

### 2. Separate platform authority from merchant authority

**Admin Portal / platform-owned policy:**

- approved reference-FX providers, raw-rate integrity, freshness, anomaly, and fallback rules;
- Sals3 commission, marketplace fees, and real platform-borne payment/conversion charges;
- enabled currencies/destinations and applicable legal or disclosure constraints;
- platform loss, fraud, publication, and data-quality guardrails;
- the permissions a seller may grant its own staff, without assigning the seller's staff itself.

**Seller Portal / tenant-owned commercial policy:**

- store-level target margin and minimum contribution preferences;
- category pricing defaults;
- product-specific and exceptional variant overrides;
- the merchant's own FX adjustment/buffer for its funding or conversion exposure;
- merchant handling, return-risk, and other documented operating allowances;
- merchant price floors and temporary commercial overrides;
- category PIC assignments within that seller's organization.

Admin Portal must not set ordinary merchant margins, merchant product prices, merchant category PIC assignments, or merchant FX buffers. The Sals3 Official Dropshipper account follows the same seller-account boundary; its commercial settings are not a reason to bypass tenancy through Admin Portal.

### 3. Use layered merchant commercial policy

Resolve commercial policy from least to most specific:

```text
platform-mandated fees and guardrails (validation, not merchant margin)
  + seller/store default
  -> seller currency-pair / funding-rail / destination adjustment
  -> seller category policy
  -> seller product override
  -> seller variant override (exceptional, only when justified)
```

The most specific active seller-owned rule may override a less-specific seller target, but it can never remove platform-mandated fees, bypass applicable safety/legal rules, or conceal missing landed-cost evidence. Platform constraints validate the seller decision; they do not become a hidden Sals3-selected merchant margin. Precedence must be deterministic and recorded in the price decision.

Category margin is the normal operational default. Product-specific margin is an approved first-class capability for future category PICs. Variant-specific policy is supported by the model but should be used only when variants have materially different costs or risks; it must not become routine manual noise.

### 4. Make merchant FX adjustment customizable

Keep three different concepts explicit:

- **reference FX rate:** platform-supplied market observation that sellers cannot alter;
- **platform conversion/payment cost:** a real, disclosed Sals3 fee/cost where Sals3 owns that rail;
- **merchant FX adjustment:** seller-configurable protection for the merchant's own conversion/funding exposure.

The merchant FX adjustment must be tenant-owned, versioned configuration, never an unexplained literal buried in pricing code. It may be scoped by:

- source and target currency pair;
- payment or supplier-funding rail when its real conversion cost differs;
- buyer destination/settlement context where applicable;
- category, product, or variant only when documented evidence shows a real differentiated FX exposure.

The normal default should be a seller-owned currency-pair/funding-rail policy—not a separate arbitrary FX percentage for every product. Seller category/product/variant FX overrides are allowed, but require a reason, bounded effective period, validation, and the seller's appropriate internal permission/approval. Seller Portal must display the reference rate, platform cost if any, and merchant adjustment separately and show the resulting effective conversion rate. Admin Portal may inspect platform health/audit and platform-owned costs, but must not silently edit the merchant adjustment.

If no safe current rate or required adjustment policy is available, pricing must fail closed or retain the last explicitly valid quoted/snapshotted price according to an approved freshness rule. It must not silently use zero adjustment or an unrelated currency pair.

### 5. Seller category PIC and approval model

- Sals3 platform Finance/Pricing authority owns only platform fees/cost methodology, reference-FX integrity, and platform/legal guardrails.
- Each seller's authorized owner/admin assigns its own category PICs and approval thresholds inside that tenant.
- An authorized seller category PIC may propose and manage that seller's category defaults and product overrides within assigned categories and allowed guardrails.
- A PIC cannot grant themselves scope, cross tenant boundaries, alter raw FX observations, remove platform-mandated costs, or self-approve an exception outside their seller-defined authority.
- Unusually large, long-lived, or high-blast-radius merchant overrides require a higher seller permission and, where the seller configures it, two-person approval. Platform intervention is limited to platform/legal violations, not disagreement with a merchant's normal commercial choice.
- Temporary overrides require start/end time or a review date; expiry returns deterministically to the next valid policy layer.

### 6. Product boundary and enforcement

Seller Portal is the authoritative tenant-facing surface for each merchant's margins, PIC assignments, merchant FX adjustments, and scoped product/variant overrides. Admin Portal is authoritative only for platform-owned reference-FX configuration, Sals3 fees/costs, enabled capabilities, and safety/legal guardrails. Customer website and pricing services resolve both sources server-side without merging their ownership or allowing either browser to supply protected values.

Each platform or seller policy/override must record:

- stable ID, type, scope, precedence, and version;
- proposed value and units;
- actor, seller/tenant where applicable, PIC/category assignment, reason, and evidence/reference;
- approval state and approver where required;
- effective start, expiry/review trigger, and superseded version;
- before/after values, correlation ID, and immutable audit event;
- rollback target and resulting publication status.

Admin Portal and Seller Portal pricing implementation remain deferred. Current applications may introduce separate typed provider/resolver boundaries for platform-owned and seller-owned inputs so future persistence can replace temporary configuration without rewriting pricing consumers.

### 7. Price decisions and order history

Every computed/published price must be explainable from a versioned decision snapshot containing the resolved policy layers and inputs. Accepted orders retain their locked price, currencies, FX source/rate, FX adjustment, relevant fees, margin/contribution result, and policy versions. Later policy changes never rewrite historical quotes or orders.

Price publication or sale must fail when required cost evidence is absent, the result violates a safety floor, policy resolution is ambiguous, or a required approval is missing. A requested override is not guaranteed to become the selling price.

## Explicitly deferred

- Admin Portal platform-pricing UI and Seller Portal merchant-pricing UI implementation;
- final category PIC assignments and permission matrix;
- production margin, fee, floor, allowance, or FX-adjustment values;
- product/variant pricing editor implementation;
- migration of the existing storefront PHP contract or a change from ADR-003 phase-1 USD;
- automated competitive-pricing or machine-learning price optimization.

## Required verification

- Unit tests prove deterministic precedence and fallback across platform, currency/rail, category, product, and variant layers.
- Property/fixture tests prove no combination produces a price below platform safety floors or with currency-unit confusion.
- FX tests separate reference rate from adjustment, validate currency pair/freshness, and reject missing, stale, out-of-range, or unauthorized values.
- Authorization tests prove tenant isolation, seller-owned PIC scope, separation of duties, approval thresholds, and inability to alter raw FX observations, another seller's policy, or platform guardrails.
- Audit tests reconcile every published change, override, expiry, rollback, and calculated price to exact policy versions.
- Historical tests prove policy changes never rewrite accepted quotes/orders.
- End-to-end pricing fixtures cover freight, duties/taxes, payment fees, returns, rounding, and destination-specific evidence under ADR-003.

## Supersession

None. This ADR elaborates ADR-003's requirement that category targets, price floors, FX buffers, return allowances, and fee assumptions be versioned configuration, while assigning merchant-specific commercial authority to Seller Portal. ADR-003 remains controlling for destination availability, freight, currencies, landed cost, checkout quotes, and contribution economics. ADR-014 remains controlling only for Admin Portal's platform-owned security and publication boundaries.
