---
tags: [sals3, process-flow, flowchart, lifecycle]
aliases: [Sals3 End-to-End Flow, Sals3 Process Flowchart]
created: 2026-07-31
updated: 2026-08-10
status: canonical
authority: product-alignment
maintenance: required-after-every-sals3-workflow-change
review_cadence: every-sals3-implementation-checkpoint
related:
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-manual-testing-checklist]]"
  - "[[sals3-master-blueprint]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
---

# Sals3 — End-to-End Process Flow

## Purpose

This is the canonical high-level flow for Sals3's item lifecycle, from supplier ingestion to financial settlement. Planned nodes are not implementation claims — use [[sals3-implementation-phases]] for exact completion status.

This Markdown note is the only canonical flowchart copy. Obsidian renders the Mermaid blocks directly; no external diagram tool is required.

## Mandatory maintenance rule

Update this note in the same task whenever a verified Sals3 workflow, guardrail, or system boundary changes. Do not let it drift from [[sals3-management-bible]] or [[sals3-implementation-phases]].

## Approved high-level item lifecycle

```mermaid
graph TD
    Account["Separate Dropshipper registration<br/>(immutable account business model)"] --> Connect["Connect an approved supplier<br/>(healthy tenant-owned connection)"]
    Connect --> Step1["1. Discover supplier candidate<br/>(CJ API or approved source)"]
    Step1 --> Step2["2. Automated eligibility and risk screening<br/>(hard blockers + attention signals)"]
    Step2 --> Step3["3. Map taxonomy, variants, and attributes<br/>(versioned confidence + exceptions)"]
    Step3 --> Step4["4. Validate controlled copy and media<br/>(truthful content + rights-known assets)"]
    Step4 --> Step5["5. Destination and contribution pricing<br/>(exact country/quote before payment)"]
    Step5 --> Step6["6. Auto-publish eligible Sals3 offer<br/>(attention or auto-pause on exceptions)"]
    Step6 --> Step7["7. Server checkout and verified payment<br/>(idempotent gateway event)"]
    Step7 --> Lock["Immutable ordered-item snapshot<br/>(revision, variant, price, media, supplier binding)"]
    Lock --> Step8["8. Direct supplier fulfillment<br/>(wallet guard + retry/reconciliation)"]
    Step8 --> Step9["9. Signed tracking and exception sync<br/>(CJ/carrier sources reconciled)"]
    Step9 --> Step10["10. Delivery, refund/return, and settlement<br/>(separate auditable states)"]
```

## Active platform strategy

```mermaid
graph TD
    Vision["Sals3 Rebuild Vision"] --> Customer["Custom Sals3 Customer Site"]
    Vision --> Seller["Sals3 Seller Center"]
    Seller --> Catalog["Sals3-managed catalog and operations"]
    Catalog --> Customer
```

The earlier Shopify pop-up track is rejected as an active implementation path. Preserve it only in historical/sample notes; do not build, integrate, or plan migration around Shopify.

## Curated catalog pipeline (quality gate)

```mermaid
graph TD
    RawFeed["All Supplier Products<br/>(raw supplier feed)"] --> Scan["Automatic bounded discovery<br/>(per-connection hot + backfill checkpoint)"]
    Scan --> Admit{"Queue admission reason?"}
    Admit -- "new / material change / stale evidence / new policy / due retry" --> Queue["Evaluating<br/>(Queued + active evaluation)"]
    Admit -- "unchanged or outside approved pilot" --> Wait["Remain discoverable<br/>with reason and next recheck"]
    Queue --> Preflight["Fresh-enough full preflight<br/>(detail, variants, stock, freight, reviews, policy)"]
    Preflight --> Decision{"Versioned decision?"}
    Decision -- "PASS" --> Publish["Product Editor/import<br/>rerun publication gates"]
    Decision -- "PASS_WITH_ATTENTION" --> Attention["Eligible for<br/>Live · Needs Attention"]
    Decision -- "REVIEW / HOLD / BLOCKED / EVALUATION_FAILED" --> Reject["No publication<br/>reason, evidence, and recovery/review path"]
    Publish --> Sync["Supplier and policy sync"]
    Attention --> Sync
    Sync -- new blocker --> Pause["Auto-pause affected variant/offer/market"]
    Pause --> Notify["Clickable seller attention<br/>(in-app + severity-based push/email)"]
```

The exact supplier-listing-to-editor handoff, status surfaces, field ownership, synchronization, attention, and publish gates are defined in [[cj-candidate-to-sals3-product-draft-implementation-spec]]. [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]] governs the prerequisite: a separately registered Dropshipper account must own a healthy approved supplier connection. **All Supplier Products** is the raw provider discovery surface. Browsing itself creates no curated Product, but automatic ingestion creates/requeues supplier candidates for new, materially changed, freshness-due, policy-affected, or retry-due rows. ADR-010 requires persistent full-feed coverage and an explainable admission reason; the current fixed first-five-page scanner does not yet satisfy that target. ADR-013 keeps that coverage proportional: checkpoint CJ by category/listing time and split a partition only after it actually reaches CJ's 6,000-record ceiling. Only a candidate with a fresh, enforced `PASS` or eligible `PASS_WITH_ATTENTION` may enter the future import/publication workflow. Factory-backed or unverified-warehouse inventory is preserved as evidence and handled by policy; it is not automatically unusable. Stock origin is not a shipping route, so destination freight still requires its own publication and checkout validation. The customer storefront reads only the Sals3 published record.

[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]] governs changes after publication and purchase. Supplier delist, stock loss, price spike, freight loss, or source edits protect future checkout and open actionable seller attention. An accepted order remains active and renders its immutable ordered-item/media snapshot; later product changes never rewrite it. Existing fulfillment continues through its exact committed supplier binding unless the order enters an explicit exception.

[[ADR-010-catalog-decision-governance-and-shadow-enforcement]] governs how a candidate decision becomes an action. Yellow auto-publication is limited to non-blocking quality or operational warnings. Unresolved legal, IP, safety, permit, mapping, media-rights, evidence, or near-duplicate uncertainty stops at pre-publication `REVIEW`; objective red blockers do not publish or auto-pause an affected live offer. New automatic publish/block/pause rules require a versioned golden pilot set, shadow measurement, owner-approved promotion gates, and a bounded canary. Perceptual similarity creates a reviewable duplicate cluster, never an automatic merge or rejection.

## Product media source resolution

```mermaid
graph TD
    SupplierOriginals["Original supplier pictures<br/>(always-visible read-only evidence)"] --> ControlledSupplier["Approved supplier imports<br/>(controlled Sals3 assets)"]
    SellerUploads["Your pictures<br/>(validated seller uploads)"] --> Preference{"Picture preference"}
    ControlledSupplier --> Preference
    Preference -- "Use my pictures first" --> SellerFirst{"Eligible own pictures?"}
    SellerFirst -- yes --> OwnOrMixed["OWN_PICTURES or MIXED_PICTURES"]
    SellerFirst -- no --> SupplierFallback["SUPPLIER_FALLBACK<br/>(approved supplier set only)"]
    Preference -- "Use supplier pictures" --> SupplierOnly["SUPPLIER_PICTURES"]
    OwnOrMixed --> Revision["ProductRevision media set"]
    SupplierFallback --> Revision
    SupplierOnly --> Revision
    ControlledSupplier -- "no rights-known usable set" --> MediaReview["NEEDS_MEDIA_REVIEW / NO_USABLE_PICTURES<br/>no publication"]
```

ADR-011 governs this resolver. Public media is always controlled, rights-known revision media; a mutable supplier URL is never the public source of truth. Product Catalogue shows listing lifecycle separately from media-source/review status.

## Qualified trend merchandising

```mermaid
graph LR
    CjTrend["CJ trending + listed snapshots<br/>(Portal ranking signals, not sales)"] --> Rank["Versioned category/market rank<br/>(shadow then promoted)"]
    Published["Published and currently purchasable<br/>Sals3 Product Catalogue"] --> Eligibility{"Trend eligible?"}
    Rank --> Eligibility
    Eligibility -- yes --> PortalApi["Portal storefront API<br/>section=trending"]
    Eligibility -- no --> Suppress["Expired / suppressed<br/>not shown as trending"]
    PortalApi --> Ecommerce["Ecommerce<br/>Trending now"]
```

ADR-012 governs ranking. Popularity never changes qualification and cannot override a review, hold, block, pause, stale evidence, invalid media, or failed commercial gate. Ecommerce never calls CJ directly and never claims `Best seller` or `Deals` from listing count alone. ADR-013 limits phase 1 to a daily, expiring, category-relative V0 signal; advanced velocity and saturation models wait for enough trustworthy history.

## Supplier connection pause and recovery

```mermaid
graph LR
    Connected["Supplier Apps<br/>Connected"] --> Disconnect["Disconnect<br/>(owner-requested pause)"]
    Disconnect --> Temporary["Blocked / Rejected<br/>Temporarily unavailable"]
    Temporary --> Wait["No supplier polling<br/>wait for connection event"]
    Wait --> Reconnect["Reconnect and resume evaluation<br/>(verify credentials)"]
    Reconnect --> Requeue["Bounded automatic requeue<br/>CONNECTION_RESTORED"]
    Requeue --> Evaluating["Evaluating<br/>fresh-enough evidence required"]
    Evaluating --> Ready["Qualified Products<br/>Ready or Needs Attention"]
```

Intentional disconnect does not become `EVALUATION_FAILED` and does not consume a technical retry attempt. It temporarily removes listing/publication eligibility while preserving the last completed decision and evidence as history. Reconnect is event-driven and requeues affected candidates in bounded batches. After publication exists, disconnect protects future sales without rewriting or cancelling accepted orders.

[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]] separates installable provider access and money movement. A Dropshipper connects and funds its own CJ/approved-provider account. The Sals3 customer-payment rail records commission and seller payable; the supplier rail charges the seller's own provider wallet/payment method. No ready funding path blocks new automatic-fulfillment checkout, while an accepted order remains active in `AWAITING_SUPPLIER_FUNDS` with actionable recovery.

## Full source

Current governing detail lives in the approved ADRs, [[cj-candidate-to-sals3-product-draft-implementation-spec]], and [[sals3-ux-build-specification]]. Blueprint thresholds remain historical/sample material unless an approved ADR promotes them. This note stays intentionally shorter — a navigable map, not a duplicate specification.
