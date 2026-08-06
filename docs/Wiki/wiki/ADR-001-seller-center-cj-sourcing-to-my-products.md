---
tags: [sals3, adr, seller-center, cj-dropshipping, catalog, architecture]
aliases: [ADR-001, CJ Sourcing to My Products, My Products Import Flow]
created: 2026-08-06
updated: 2026-08-07
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[sals3-cj-dropshipping-integration-plan]]"
  - "[[sals3-global-seller-center-ux-blueprint-proposal]]"
  - "[[sals3-ux-build-specification]]"
  - "[[universal-category-variation-taxonomy-reference]]"
---

# ADR-001 - Curated CJ sourcing into Sals3 My Products

Implementation companion: [[cj-candidate-to-sals3-product-draft-implementation-spec]] defines the approved identity, field ownership, editor, API, workflow, synchronization, security, and verification contract. It remains unimplemented until verified code and infrastructure exist.

> [!IMPORTANT] Approved direction; not implemented
> Approved by Bogs on 2026-08-06 after a content and fact-check review. This ADR governs catalog ownership, product curation, and system boundaries. The linked ADRs separately govern taxonomy, international pricing/shipping, fulfillment, and payment/COD. No implementation is claimed by this status.

## Problem

`sals3-portal` currently exposes CJ-sourced listings, but a supplier feed is not yet a Sals3 catalog. Sals3 needs a controlled way for an employee to discover a CJ item, create a Sals3-managed product record, generate or edit truthful merchandising content, evaluate commercial and compliance risks, and publish it without coupling the customer storefront to CJ's raw schema or availability. Phase 1 minimizes manual work through exception-based automated approval and publication.

## Evidence

- Current `sals3-portal` code is the strict source of truth for its API contracts; it is a read-oriented CJ integration today.
- CJ exposes product detail, variants, categories, comments, freight calculation, ordering, wallet balance, and signed webhook capabilities. Its raw list data is not sufficient for publication; fresh Sals3-controlled hard gates, transformation, policy evaluation, and evidence are required. Human review is reserved for unresolved exceptions.
- The canonical build specification separates storefront, BFF/API, Catalog, Pricing, Order, Seller, and worker responsibilities.
- Raw supplier titles, descriptions, photos, ratings, and comparison prices cannot automatically be represented as original or verified Sals3 content.

Official CJ references checked 2026-08-06:

- Product API: <https://developers.cjdropshipping.com/en/api/api2/api/product.html>
- Logistics API: <https://developers.cjdropshipping.com/en/api/api2/api/logistic.html>
- Shopping API: <https://developers.cjdropshipping.com/en/api/api2/api/shopping.html>
- Webhooks: <https://developers.cjdropshipping.com/en/api/start/webhook.html>

## Decision

### 1. Sals3 owns the customer-facing catalog record

CJ is a sourcing and fulfillment supplier, not the live catalog database. Importing creates a separate Sals3 product and offer. It does not expose or publish the raw CJ object directly.

Use this wording in product and technical documentation:

> Sals3-managed catalog record with original merchandising copy and licensed supplier assets.

Do not claim that supplier photos or supplier-authored content become Sals3-owned merely because they were copied or edited.

### 2. Use a server-side modular boundary

The first implementation may be a modular monolith, but its responsibilities must remain separated:

```text
Customer storefront
        |
        v
Sals3 BFF / server API
  - Catalog module
  - Pricing module
  - Shipping module
  - Order module
  - Seller/admin module
        |
        +--> Sals3 database
        +--> background worker / CJ adapter
```

- The browser and client components never receive CJ credentials or call trusted CJ operations directly.
- `sals3-ecommerce` consumes a stable Sals3 catalog contract rather than depending on CJ's raw schema. It reads that contract through `sals3-portal`'s protected storefront endpoints and never connects to the catalog database directly.
- `sals3-portal` remains the strict reference for its current code and contracts.
- **Revised 2026-08-07 by Bogs:** the writable catalog **is** hosted in `sals3-portal`, together with the Seller Center screens that write to it. This supersedes the earlier line forbidding a writable catalog there. The modular boundary is still required — catalog domain code stays in `src/modules/catalog/`, database access in `src/lib/db/`, and neither depends on React — but the boundary is now enforced by module structure inside one deployable instead of by a network hop between two. Internal writes use Server Actions, so no service-to-service credential exists for them. See [[cj-candidate-to-sals3-product-draft-implementation-spec#3.2 Initial physical placement]] for the recorded rationale and trade-off.
- Approved persistence stack: PostgreSQL, Drizzle ORM, Drizzle Kit, `postgres.js`, Zod. Prisma was evaluated and rejected; do not reintroduce it.

### 3. Separate account business model from offer fulfillment mode

Each `SellerAccount` has one immutable business model: `RETAILER` or `DROPSHIPPER`. Retail and dropshipping require separate registrations, accounts, and logins, even when owned by the same person or business. There is no shared-login organization switcher or business-model toggle in phase 1. A Dropshipper account may use multiple approved supplier providers through connections it owns; this does not change its account business model. See [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]].

Minimum logical model:

```text
SellerAccount
- id
- legal identity
- display identity
- merchant-of-record role
- businessModel: RETAILER | DROPSHIPPER

Product
- Sals3 catalog identity
- original editorial content
- category and publish state

Variant
- product option combination and sellable identity

Offer
- sellerAccountId
- variantId
- fulfillmentMode
- offerSupplierBindingId when supplier-fulfilled
- warehouse and cost state
- availability state
```

Initial `fulfillmentMode` values may include `SALS3_STOCK`, `SUPPLIER_DROPSHIP`, `THIRD_PARTY_WAREHOUSE`, and `DIGITAL`. This is an implementation enum, not customer-facing copy.

Do not automatically display "Fulfilled by Sals3" when CJ or another partner physically fulfills the parcel. Customer copy must accurately distinguish merchant of record, physical fulfillment, origin, and delivery promise.

### 4. Use an evidence-based curation funnel

Only objective failures are automatic hard rejects:

- prohibited or restricted category;
- no supported variant or inventory signal;
- no valid destination-specific freight option for the intended market;
- missing required product/variant data;
- known blocked supplier, product, or approved legal restriction;
- commercially non-viable landed cost;
- unusable or unlicensed media.

Brand-like titles, suspicious wording, low review volume, and uncertain category matches are review signals. A capitalized multi-word phrase is not a reliable counterfeit detector and must not be an automatic legal block by itself.

Recommended funnel:

```text
CJ candidate
  -> explicit shortlist and full preflight
  -> technical, compliance, IP, and commercial hard gates
  -> category/attribute and media validation
  -> GREEN: auto-publish
  -> YELLOW: auto-publish with attention
  -> RED: block or auto-pause; human exception handling where resolvable
```

Review counts and sampled ratings may be used as explicitly labelled proxies. The first 20 results or reviews are not a statistically representative catalog sample. Initial thresholds and weights are experimental until calibrated against delivery, refund, and support outcomes.

### 5. Require truthful publish content

Before automatic or manual publication, require at least:

- Sals3-controlled truthful title and structured merchandising description;
- selected Sals3 category and validated required attributes;
- valid variants, price, inventory state, and destination availability;
- validated, rights-known media with source/provenance recorded;
- truthful seller and fulfillment wording;
- no fabricated rating, sales count, urgency, discount, or comparison price;
- compliance flags resolved for the intended launch markets.

CJ product detail does expose a `description` and `productImageSet`. Sals3 may use them as source material only where permitted; they do not bypass content validation, provenance, rights evidence, or publication gates.

Phase 1 uses a **human-on-exception** policy. Eligible selected imports are auto-approved and auto-published. Non-blocking quality weaknesses publish as **Live · Needs Attention**. Legal, safety, counterfeit/IP, permit, required mapping/data, availability, freight, margin, duplicate, source-status, and media-rights blockers prevent publication or auto-pause the affected live offer. No raw CJ row, score, warning, or client request can override a blocker.

After publication or purchase, ADR-007 governs supplier changes. Pause future sales at the smallest affected scope, notify the seller through the canonical attention case and required severity channels, and preserve immutable accepted-order product, variant, price, terms, media, and supplier-binding snapshots.

### 6. Copy media only with a recorded right to use it

Approved product media should be copied to controlled Sals3 storage for availability, performance, transformation, and auditability. Hosting the file does not establish copyright ownership. Store the supplier/source URL, import date, rights basis or supplier terms reference, checksum, and review status.

### 7. Phase the rollout

1. Build the logical catalog, seller-account, variant, offer, media, provider-reference, supplier-connection, and offer-binding model.
2. Add real authentication, separate Retailer/Dropshipper registration, immutable account entitlements, tenant isolation, encrypted secret references, audit logging, and least privilege.
3. Pilot a small set of low-regulatory-risk categories.
4. Validate category mapping and quality signals against real CJ products.
5. Add pricing and destination availability from [[ADR-003-international-availability-shipping-and-pricing]].
6. Add order fulfillment only after [[ADR-004-cj-ordering-tracking-and-fulfillment]] controls exist.
7. Enable payment methods only under [[ADR-005-payment-settlement-refunds-and-cod]].

Admin authentication is not disposable because it can publish products, change prices, expose customer/order data, and trigger supplier spending. Minimum controls include secure server sessions, MFA/passkeys for privileged roles, CSRF protection where applicable, rate limiting, least privilege, recovery controls, and an immutable audit trail for sensitive actions.

## Consequences

### Benefits

- Sals3 controls customer-facing content and catalog stability.
- Supplier changes do not silently rewrite editorial content.
- Multiple suppliers and fulfillment modes can be added without changing seller identity.
- Storefront, trusted business logic, and external supplier integration remain separable.

### Costs and risks

- Requires a real database, worker/retry design, media storage, admin security, and review workflow.
- Product review and rights verification add operational work.
- Supplier synchronization must preserve Sals3 editorial ownership while still updating cost, inventory, and fulfillment facts.

## Verification required before implementation is marked complete

- Architecture review against the current `sals3-portal` contract and build specification.
- Schema and authorization threat review.
- Pilot import with representative variants and media.
- Evidence that publish gates cannot be bypassed by client input.
- Proven rollback: unpublish imported products, disable supplier sync, replay failed jobs, and restore prior mappings without deleting audit history.

## Supersession

This revision supersedes the earlier 2026-08-06 draft that combined catalog, taxonomy, worldwide pricing, order fulfillment, and payment/COD into one decision. Historical discussion remains recoverable from Git history. The approved current decisions are this ADR and ADR-002 through ADR-005.
