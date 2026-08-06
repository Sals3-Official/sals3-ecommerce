---
tags: [sals3, process-flow, flowchart, lifecycle]
aliases: [Sals3 End-to-End Flow, Sals3 Process Flowchart]
created: 2026-07-31
updated: 2026-08-06
status: canonical
authority: product-alignment
maintenance: required-after-every-sals3-workflow-change
review_cadence: every-sals3-implementation-checkpoint
related:
  - "[[sals3-management-bible]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-manual-testing-checklist]]"
  - "[[sals3-master-blueprint]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
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
    Step1["1. Discover supplier candidate<br/>(CJ API or approved source)"] --> Step2["2. Eligibility and risk screening<br/>(objective rejects + review signals)"]
    Step2 --> Step3["3. Map taxonomy, variants, and attributes<br/>(versioned confidence + review)"]
    Step3 --> Step4["4. Editorial and media review<br/>(original copy + licensed assets)"]
    Step4 --> Step5["5. Destination and contribution pricing<br/>(exact country/quote before payment)"]
    Step5 --> Step6["6. Publish Sals3 catalog offer<br/>(truthful seller and fulfillment copy)"]
    Step6 --> Step7["7. Server checkout and verified payment<br/>(idempotent gateway event)"]
    Step7 --> Step8["8. Direct supplier fulfillment<br/>(wallet guard + retry/reconciliation)"]
    Step8 --> Step9["9. Signed tracking and exception sync<br/>(CJ/carrier sources reconciled)"]
    Step9 --> Step10["10. Delivery, refund/return, and settlement<br/>(separate auditable states)"]
```

## Dual-track strategy (how Pillar 1 relates to Pillars 2/3)

```mermaid
graph TD
    Vision["Sals3 Rebuild Vision"] --> TrackA["Track A: Immediate Cash Flow<br/>(Shopify Pop-Up Store - Month 1)"]
    Vision --> TrackB["Track B: Custom Marketplace Rebuild<br/>(Customer Site & Seller Center - Months 1-4)"]

    TrackA --> Sales["Immediate Revenue & Product Demand Testing"]
    TrackB --> Platform["High-Converting Customer Site + Enterprise Seller Center"]
```

## Curated catalog pipeline (quality gate)

```mermaid
graph TD
    RawFeed["Supplier candidate"] --> Technical{"Objective eligibility passes?"}
    Technical -- no --> Reject["Reject or hold with reason"]
    Technical -- yes --> Risk["Compliance, IP, and commercial review signals"]
    Risk --> Mapping{"Category/variant mapping confident?"}
    Mapping -- no --> Review["Human mapping review"]
    Mapping -- yes --> Editorial["Original copy and media-rights review"]
    Review --> Editorial
    Editorial --> Quote{"Supported destination and viable landed cost?"}
    Quote -- no --> Hold["Do not publish for that market"]
    Quote -- yes --> Publish["Publish Sals3-managed offer"]
```

## Full source

Current governing detail lives in ADR-001 through ADR-005 and [[sals3-ux-build-specification]]. Blueprint thresholds remain historical/sample material unless an approved ADR promotes them. This note stays intentionally shorter — a navigable map, not a duplicate specification.
