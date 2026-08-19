---
tags: [sals3, adr, pricing, margin, forex, admin-portal, governance, audit]
aliases: [ADR-015, Commercial Pricing Governance, Category and Product Pricing Policy]
created: 2026-08-10
updated: 2026-08-14
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: phase-1-merged-not-launched
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]"
  - "[[sals3-session-2026-08-13-part41-market-rules-profile-fix-and-pricing-rework]]"
  - "[[sals3-portal-seller-market-configuration]]"
---

# ADR-015 — Commercial pricing governance, category/product margins, and FX adjustments

## Status

`approved`

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved the future ability to manage category pricing, product-specific margins, and customizable foreign-exchange adjustments on 2026-08-10, then clarified the multi-seller authority boundary the same day. Merchant commercial policy belongs to each seller account in Seller Portal; Admin Portal governs only platform-owned inputs, fees, permissions, and safety/legal guardrails. This ADR does not authorize implementing either pricing surface or replacing the current storefront pricing contract in the active country-policy cleanup.

> [!DANGER] Amendment — 2026-08-14: code exists now; this ADR's own text never authorized building it
> Read this box before trusting the "not implemented" callout above — it is now stale. See the amendment section at the end of this note for the full, verified picture.

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

---

## Amendment — 2026-08-14: Phase 1 has been built and merged; this ADR's own "not implemented" framing is now stale

> [!WARNING] What actually happened
> This ADR approved a **decision framework** on 2026-08-10 and its own `[!IMPORTANT]` callout explicitly says it "does not authorize implementing either pricing surface." Despite that, real code implementing this framework has since been written, reviewed, and merged to `develop` across three commits — not by anyone silently ignoring the ADR's authorization boundary, but because the underlying design being owner-approved was treated as sufficient basis to proceed to a Phase 1 build. Whether that was the right call is an owner judgment, not a fact this amendment can resolve — it is recorded here so the next agent doesn't repeat the original `implementation_status: not-started` claim as if it were still true.

**What shipped, in order:**

1. **`973fa0e`** (2026-08-11, PR #37) — the Phase 1 schema, resolver, money-math module, seller Taxonomy v0 seed data, server actions, and initial dialog-based UI. Documented in [[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]. Migration originally `0010_regular_scarecrow.sql`, since renumbered to `drizzle/0011_curious_falcon.sql`.
2. **`6e5b244`** (2026-08-12, PR #39) — real per-seller market profile (`seller_market_profiles`, `src/modules/market-config/`), replacing the illustrative PH/ID/SG fixture. Documented in [[sals3-portal-seller-market-configuration]]. Migration `0012_flashy_penance.sql`.
3. **`166d0ec`** (2026-08-13, PR #63) — reworked the Phase 1 pricing UI into an inline, dialog-free flow; renamed "FX adjustment" to "Funding buffer" throughout the UI and the resolver's typed unavailable-reasons; dropped the now-unused `source_currency`/`target_currency`/`funding_rail` columns via migration `0018_rare_william_stryker.sql`. Documented in [[sals3-session-2026-08-13-part41-market-rules-profile-fix-and-pricing-rework]].

**Still true, unchanged by any of the above** (verified 2026-08-14 by reading the current code and the resolver directly): the FX-adjustment/funding-buffer branch remains reachable only for a same-currency identity rate — no real cross-currency reference-FX provider has been approved for the Portal's own pricing surface, so the branch this ADR's §4 describes is still real, tested, and still not exercised by any live non-identity currency pair. Product/variant overrides are still keyed to `supplier_candidates.id` rather than a real Product/Variant table, even though a real canonical Product/Revision/Variant/Offer model has since landed in this codebase via an unrelated migration (`0013_cold_timeslip.sql`) — nobody has revisited that keying decision (open gap, see [[sals3-session-2026-08-13-part41-market-rules-profile-fix-and-pricing-rework]] §4). Per the portal's own `README.md` (2026-08-14 production-verification note), `seller_market_profiles` and `pricing_category_policies` are both empty in production — no seller has actually used Market Rules pricing yet, so "merged to `develop`" is not the same claim as "launched" or "in commercial use."

**Verification status as of 2026-08-14**: `npm run typecheck` clean; the Market Rules/pricing-scoped test suite (15 files, 190 tests) passes. The full `npm run verify` (lint, format, build, full unit+e2e suite, `npm audit`) was not re-run for this amendment — the last full green run on record for this area is part34's, against `973fa0e`'s content specifically, not the two later commits.

**Frontmatter `implementation_status`** updated from `not-started` to `phase-1-merged-not-launched` to reflect this. The `[!IMPORTANT]` callout above the Decision section is left as originally written (it correctly states what this ADR *authorizes*, which has not changed) — this amendment exists precisely because that authorization boundary and the code's actual existence have diverged, and both facts need to stay visible side by side rather than one silently overwriting the other.

---

## Amendment — 2026-08-19: inheritance chain implemented, store default and contribution floor built, PIC machinery scoped down (owner decision, Bogs)

Bogs, reviewing Market Rules on 2026-08-19, judged the per-category margin list unmanageable at the current headcount (Taxonomy v1 is 5,595 rows; the seller roster is effectively one person) and directed a deviation from Phase 1's shape. His words in session: the ADR was his own, and the business model has been learned along the way — the framework should follow the reality, recorded here rather than silently drifted from.

**What changed in `sals3-portal` (PRs [#131](https://github.com/Sals3-Official/sals3-portal/pull/131), [#132](https://github.com/Sals3-Official/sals3-portal/pull/132), [#134](https://github.com/Sals3-Official/sals3-portal/pull/134), 2026-08-19):**

1. **§3's chain is now actually implemented as written.** Phase 1 resolved only an exact-category policy and failed closed otherwise. `pricing-resolver-v3` resolves store default → nearest-ancestor category policy → product override → variant override. Taxonomy v1 stores a row for every node, so a margin on a department prices its whole subtree unless a deeper node carries its own; the decision snapshot records which node supplied the policy (`policySourceCategoryCode/Path`) per §3's "precedence must be deterministic and recorded".
2. **The "seller/store default" layer exists**: new `pricing_store_defaults` table (one ACTIVE row per seller, versioned append-only-by-edit like every policy table), applied to production through the established break-glass migration endpoint before any reader merged.
3. **§1's "minimum contribution profit" is built**, as an absolute per-item floor on the store default: `suggested = max(cost/(1−margin), cost + floor)`. It fails closed on a floor/settlement currency mismatch rather than converting at an invented rate. Rationale: the catalogue's real price points are low (a US$5.80-cost jacket is a representative live product), and a percentage alone prices below fixed per-order cost at the cheap end.
4. **The Market Rules UI replaced the L1>L2 bulk fan-out** (which wrote 5,595 policy rows + audit events per click, and whose 21 department groups were unreachable — `l2 = null` always returned `not_found`) with an inheritance tree showing each node's effective margin and its source. Old fan-out-written leaf policies remain valid chain nodes.

**Scoped down, not deleted — deliberately unbuilt until the org grows into them** (§5's machinery presumes a staffed merchant): seller category PIC assignments, per-PIC approval thresholds, two-person approval for large overrides, and per-currency-pair / funding-rail / destination FX-adjustment scoping (the single seller funding buffer stays, unchanged). Nothing in this amendment removes the §2 platform/merchant authority boundary, §4's three-way FX separation, §6's recording requirements, or §7's immutable price decisions.

**Unchanged and still open**: overrides remain keyed to `supplier_candidates.id` (the 2026-08-14 amendment's open gap); no cross-currency reference-FX provider exists; margin values themselves remain provisional — no buyer payment rail or platform commission is configured, so any rate/floor set today is a conservative placeholder with its reasoning in the policy row's required `reason` field.

**Frontmatter note**: `implementation_status` stays `phase-1-merged-not-launched`; production still has no seller using these policies. Offers priced before v3 are stamped `pricing-resolver-v2` on the offer row and are not re-priced by this change.
