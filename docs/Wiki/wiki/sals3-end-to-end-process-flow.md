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
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
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
    Step1["1. Discover supplier candidate<br/>(CJ API or approved source)"] --> Step2["2. Automated eligibility and risk screening<br/>(hard blockers + attention signals)"]
    Step2 --> Step3["3. Map taxonomy, variants, and attributes<br/>(versioned confidence + exceptions)"]
    Step3 --> Step4["4. Validate controlled copy and media<br/>(truthful content + rights-known assets)"]
    Step4 --> Step5["5. Destination and contribution pricing<br/>(exact country/quote before payment)"]
    Step5 --> Step6["6. Auto-publish eligible Sals3 offer<br/>(attention or auto-pause on exceptions)"]
    Step6 --> Step7["7. Server checkout and verified payment<br/>(idempotent gateway event)"]
    Step7 --> Step8["8. Direct supplier fulfillment<br/>(wallet guard + retry/reconciliation)"]
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
    RawFeed["CJ discovery feed"] --> Shortlist["Explicit shortlist<br/>(candidate record only)"]
    Shortlist --> Preflight["Fresh full preflight<br/>(detail, variants, stock, freight, reviews, policy)"]
    Preflight --> Technical{"Hard gates pass?"}
    Technical -- no --> Reject["Review, hold, or block<br/>with reason and evidence"]
    Technical -- yes --> Score{"Versioned result?"}
    Score -- green --> Publish["Auto-create + auto-approve + auto-publish"]
    Score -- yellow --> Attention["Auto-publish<br/>Live · Needs Attention"]
    Score -- red --> Reject
    Publish --> Sync["Supplier and policy sync"]
    Attention --> Sync
    Sync -- new blocker --> Pause["Auto-pause affected offer"]
```

The exact CJ-listing-to-editor handoff, status surfaces, field ownership, synchronization, attention, and publish gates are defined in [[cj-candidate-to-sals3-product-draft-implementation-spec]]. Aj's existing work is named **CJ Candidate Explorer** and remains the read-only discovery source. Browsing creates no catalog record. Only an explicitly selected candidate with a fresh `PASS` or `PASS_WITH_ATTENTION` preflight may import; phase 1 has no batch import. Green auto-publishes, yellow auto-publishes with attention, and red blocks or auto-pauses. Country eligibility, permits, and counterfeit/IP evidence remain separate from CJ freight availability. The customer storefront reads only the Sals3 published record.

## Full source

Current governing detail lives in ADR-001 through ADR-005 and [[sals3-ux-build-specification]]. Blueprint thresholds remain historical/sample material unless an approved ADR promotes them. This note stays intentionally shorter — a navigable map, not a duplicate specification.
