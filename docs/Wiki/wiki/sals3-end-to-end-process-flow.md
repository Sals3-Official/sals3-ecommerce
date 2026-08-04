---
tags: [sals3, process-flow, flowchart, lifecycle]
aliases: [Sals3 End-to-End Flow, Sals3 Process Flowchart]
created: 2026-07-31
updated: 2026-07-31
status: canonical-process-map
authority: product-alignment
maintenance: required-after-every-sals3-workflow-change
review_cadence: every-sals3-implementation-checkpoint
related:
  - "[[sals3-management-bible]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-manual-testing-checklist]]"
  - "[[sals3-master-blueprint]]"
---

# Sals3 — End-to-End Process Flow

## Purpose

This is the canonical high-level flow for Sals3's item lifecycle, from supplier ingestion to financial settlement. Planned nodes are not implementation claims — use [[sals3-implementation-phases]] for exact completion status.

This Markdown note is the only canonical flowchart copy. Obsidian renders the Mermaid blocks directly; no external diagram tool is required.

## Mandatory maintenance rule

Update this note in the same task whenever a verified Sals3 workflow, guardrail, or system boundary changes. Do not let it drift from [[sals3-management-bible]] or [[sals3-implementation-phases]].

## 10-step item lifecycle

```mermaid
graph TD
    Step1["1. Supplier Feed Ingestion<br/>(CJ API / Local Stock Upload)"] --> Step2["2. Smart Quality Gate Filter<br/>(rating & sales threshold, sample values)"]
    Step2 --> Step3["3. Dynamic Margin Pricing Engine<br/>(Sals3 retail price calculation)"]
    Step3 --> Step4["4. Customer Order & Payment<br/>(checkout on Sals3 storefront)"]
    Step4 --> Step5["5. Real-Time Stock Verification<br/>(instant webhook stock check)"]
    Step5 --> Step6["6. Auto Order PO Dispatch<br/>(API trigger to CJ / local seller alert)"]
    Step6 --> Step7["7. White-Label Parcel Packaging<br/>('Sold & Fulfilled by Sals3' label)"]
    Step7 --> Step8["8. Live Tracking Webhook Sync<br/>(courier ID to tracking.sals3.com)"]
    Step8 --> Step9["9. Parcel Delivery & Review Collection<br/>(delivered within SLA; photo review prompt)"]
    Step9 --> Step10["10. Financial Settlement & Margin Payout<br/>(net profit deposited into Sals3 bank)"]
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
    RawFeed["1. Supplier Raw Product Feed / Upload"] --> StarFilter{"2. Rating Check"}
    StarFilter -- fail --> Reject1["Reject item"]
    StarFilter -- pass --> SalesFilter{"3. Sales Volume Check"}
    SalesFilter -- fail --> Reject2["Reject item"]
    SalesFilter -- pass --> PassFilter["4. Passed automated quality gate"]
    PassFilter --> MediaReview["5. Media & content review queue"]
    MediaReview -->|clean| Publish["Publish to customer website & Seller Center"]
```

## Full source

Full narrative detail, exact thresholds (marked sample), and module-level specification for each node live in [[sals3-master-blueprint]]. This note stays intentionally shorter — a navigable map, not a duplicate of the whole document.
