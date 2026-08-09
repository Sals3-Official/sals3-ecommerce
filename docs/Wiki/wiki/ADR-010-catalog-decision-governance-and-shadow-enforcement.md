---
tags: [sals3, adr, catalog, governance, automation, compliance, evidence, deduplication]
aliases: [Catalog Decision Governance, Shadow Catalog Enforcement, Evidence-Based Catalog Automation]
created: 2026-08-10
updated: 2026-08-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-implementation-phases]]"
  - "[[hot]]"
---

# ADR-010: Catalog decision governance and shadow enforcement

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved this decision on 2026-08-10 after reviewing the general-purpose "zero-defect" dropshipping pipeline proposal against the actual Sals3 code, data, build stage, and approved ADRs. This ADR strengthens the existing human-on-exception design. It does not approve Kafka, Protobuf, Hyperscan, vector databases, machine-learning rejection, or distributed Saga infrastructure.

## Status

`approved`

## Problem

Sals3 needs catalog automation that can scale without creating an unbounded manual-review queue. It must also avoid the opposite failure: publishing, blocking, pausing, or merging a product because an opaque threshold or uncertain automated signal was treated as objective truth.

The phrase "zero-defect ingestion" creates false certainty. No automated classifier, denylist, supplier metric, or legal/compliance rule can guarantee zero defects. The enforceable objective is:

> No silent or untraceable catalog decision or automated side effect.

Every decision must be reproducible from preserved evidence, a named policy version, stable reason codes, and an audited action. Uncertain legal, IP, product-safety, permit, media-rights, mapping, or duplicate findings must not be converted into either an automatic pass or an automatic hard rejection merely to reduce queue volume.

## Evidence

- `sals3-portal` currently pulls JSON from one active provider, `CJ_DROPSHIPPING`, through a tenant-owned `CjSupplierAdapter`. It does not receive supplier-produced Kafka or Protobuf events.
- The implemented candidate pipeline already uses Zod at the supplier boundary, PostgreSQL leasing, bounded retry with exponential backoff, a terminal `EVALUATION_FAILED` path, policy versions, evidence snapshots, stable reason codes, and append-only audit events.
- No curated Sals3 Product/Variant/Offer publication backend and no completed Sals3 orders exist. Supplier-performance and fulfillment models therefore have no Sals3 outcome sample yet.
- The current approved implementation specification already separates `PASS_WITH_ATTENTION` from `REVIEW`: non-blocking quality/operational issues may publish with attention, while unresolved legal, IP, duplicate, mapping, media-rights, or evidence risks require pre-publication review.
- Exact external product identity is implemented. Near-duplicate detection across different provider product IDs is not.
- The current category/counterfeit list, destination market, and price/margin thresholds are labelled placeholders. A real category-and-market pilot rule pack remains the highest-leverage approval.
- ADR-006 and ADR-008 make supplier connections tenant-owned. A connection failure for one seller must not disable another seller's connection to the same provider.
- The canonical build specification classifies official laws, standards, regulator guidance, and official vendor documentation above blogs or marketing pages for decisions.

## Options considered

### Option A: Adopt the general enterprise pipeline now

Add Kafka, Schema Registry, Protobuf contracts, Hyperscan, vector search, computer-vision rejection, supplier scoring, anomaly models, compound-warning rejection, and Saga orchestration before the first published catalog slice.

Benefits:

- Anticipates hypothetical high-volume and multi-service conditions.
- Provides a broad catalogue of future techniques.

Risks:

- Solves a push-ingestion and distributed-service architecture that Sals3 does not have.
- Adds cost and operational failure modes before real product/order evidence exists.
- Encourages uncertain signals and arbitrary hardcoded thresholds to become automatic legal or commercial conclusions.
- Repeats the documented failure mode of extended infrastructure work without a shippable vertical slice.

### Option B: Keep the current rules unchanged

Continue the existing candidate decisions and implement the publication workflow without an additional governance gate.

Benefits:

- Lowest immediate effort.
- Much of the required evidence, decision, and audit structure already exists.

Risks:

- New rules can become active without measured false-positive/false-clear evidence.
- `PASS_WITH_ATTENTION` can be misunderstood as permission to publish every soft signal.
- Deferred technology and compliance work has no explicit activation trigger.
- Near-duplicate thresholds could be implemented as automatic rejection despite the canonical multi-supplier product model.

### Option C: Evidence-first automation with shadow enforcement

Preserve the modular monolith and existing decision taxonomy. Add a formal evidence-to-action boundary, golden pilot catalogue, shadow evaluation, measured promotion gates, risk-domain-aware decisions, and explicit triggers for future techniques.

Benefits:

- Reuses current PostgreSQL, Zod, policy-version, and audit foundations.
- Improves correctness without adding an infrastructure tier.
- Produces measurable evidence before a rule can block or publish products.
- Keeps uncertain legal/compliance judgments with qualified review while automating objective gates.
- Supports later multi-provider growth without prematurely building for it.

Risks:

- Requires a curated labelled pilot set and accountable review owners.
- Keeps a bounded exception workflow rather than claiming the manual queue can be eliminated.
- Slows activation of new blocking rules until evidence meets the approval gate.

## Strongest objection

Shadow operation and human-labelled pilot data add work before publication. A team can misuse "more evidence needed" to defer automation forever, and some rules are cheaper to add before the catalog grows.

This objection is valid. Every deferred technique therefore needs a named activation trigger, and every shadow rule needs a decision date, accountable owner, sample target, and acceptance threshold. Shadow mode is a release gate, not a permanent state.

## Decision

Sals3 adopts Option C.

### 1. Governing objective

Optimize for zero silent or untraceable automated decisions, not a false promise of zero defects. Every candidate decision and automated side effect records:

- immutable or checksummed source evidence;
- evidence capture time and freshness;
- policy and algorithm version;
- stable reason codes and affected scope;
- decision and allowed next action;
- actor or system initiator;
- audit event and, when applicable, an idempotent outbox action;
- recovery, expiry, or re-evaluation path.

### 2. Five-layer boundary

Keep these concerns separate:

```text
Immutable supplier evidence
  -> derived signals
  -> versioned policy
  -> decision
  -> audited action/outbox
```

A policy change re-evaluates stored evidence when it is still fresh enough. It must not require another supplier request solely because decision logic changed. An external side effect does not occur inside a long supplier-fetch transaction.

### 3. Decision taxonomy and publication effect

- `PASS`: all hard gates pass and the approved clean threshold is met; eligible for publication.
- `PASS_WITH_ATTENTION`: only non-blocking quality or operational issues remain; eligible for `Live - Needs Attention`.
- `REVIEW`: unresolved legal, IP, safety, permit, mapping, media-rights, evidence, or near-duplicate uncertainty; no publication until resolved.
- `HOLD` or the implemented `TEMPORARILY_INELIGIBLE`: temporary stock, freight, economics, freshness, funding, or supplier failure; retry under policy, no publication.
- `BLOCKED`: objective prohibited, confirmed infringing, unsafe, invalid, or policy-blocked condition; normal editor cannot override it.
- `EVALUATION_FAILED`: technical failure; never converted into a pass or policy rejection.

Warning counts alone never determine rejection. Multiple signals are combined according to risk domain, independence/correlation, evidence strength, and current market policy. Legal or compliance uncertainty never becomes `PASS_WITH_ATTENTION` merely because the individual signal is labelled soft.

### 4. Golden pilot catalogue

Before production enforcement, approve one low-risk category and market, accountable policy/review owners, and a representative labelled set. The initial target is 200-500 candidates when the source pool permits it, including:

- clean products;
- borderline quality cases;
- exact and near duplicates;
- prohibited/restricted cases;
- incomplete evidence;
- supplier/API failures;
- variant and media edge cases.

Each case stores expected decision, reason codes, reviewer, evidence date, and disputed/uncertain status. The set becomes the catalog equivalent of golden-cart tests and is versioned with the pilot policy.

### 5. Shadow-to-enforcement promotion

Every new or materially changed automatic publication, block, pause, or merge-affecting rule runs in shadow mode first. Shadow decisions are recorded but cause no publication or protection side effect.

Promotion requires:

- an approved policy owner and review date;
- representative golden-set coverage;
- measured false-block and sampled false-clear rates;
- human-overturn and insufficient-evidence rates;
- decision latency and supplier API/points cost;
- documented rollback and re-evaluation behavior;
- owner approval of the measured gate.

The exact numeric acceptance thresholds belong to the approved pilot rule pack; this ADR does not invent them. Activation starts with a bounded canary before full enforcement.

### 6. Near-duplicate handling

Use normalized title, category, variant structure, dimensions, provider identifiers, description similarity, and versioned image perceptual hashes to create duplicate-candidate clusters.

- Normalize image orientation and dimensions before hashing.
- Record hash algorithm, preprocessing version, source image identity, and threshold policy.
- Compare the relevant image set, not only one unqualified URL.
- A near match produces `REVIEW`; it does not auto-reject or auto-merge.
- A reviewer may link another `ProviderProductReference`/seller Offer to an existing canonical Product, confirm a distinct product, or block a confirmed duplicate.
- Exact provider identity remains idempotent and reopens the existing record.

### 7. Supplier health and anomaly metrics

Supplier-performance enforcement is deferred until real order, fulfillment, cancellation, return, and delivery outcomes exist. One supplier is sufficient for a stop-sale or pause decision; a second supplier is needed only for comparative ranking.

When activated, metrics require minimum sample sizes, confidence bounds, recent and long-term windows, category/market/route segmentation, hysteresis/recovery rules, and policy versions. A raw percentage from a tiny sample never automatically suspends a supplier. Machine-learning models require sufficient representative features, labelled outcomes where applicable, baseline comparison, drift monitoring, and a reversible shadow rollout.

### 8. Circuit-breaker scope

A provider breaker, if implemented, is scoped at least by:

```text
sellerAccountId + supplierConnectionId + operation
```

One seller's credential or rate-limit failure must not open another seller's circuit. Record the opening reason, retry time, recovery probe, and audit event. Do not trip on permanent validation/authorization failures as though they were transient provider outages.

### 9. Policy-source registry

Every compliance or legal rule records jurisdiction, market, category/product scope, authoritative source, effective date, last verification date, policy owner, policy version, and review/expiry date. Blogs, marketing pages, AI summaries, and supplier claims may generate research leads or attention signals; they cannot independently authorize an automatic legal rejection.

### 10. External-fetch security

Supplier media, compliance evidence, Digital Product Passport, or other external URL validation remains server-side and uses allow-listed hosts, private/local-address blocking, redirect revalidation, DNS-rebinding protection where applicable, response size/type/time limits, no credential forwarding, checksummed evidence, and audit. A browser-supplied arbitrary URL is never trusted.

### 11. Future-technology triggers

- Supplier health: meaningful verified Sals3 order/fulfillment sample.
- Cross-provider comparison or collusion analysis: at least two verified providers plus stored comparable price histories and a defined legal/business use.
- Aho-Corasick/Hyperscan: approved dictionary growth and profiling prove current matching materially affects the bounded job.
- Computer vision/vector search: licensed/authorized reference data, a measured rule gap, and evidence that the output can support the proposed action. Similarity alone never proves infringement.
- Isolation Forest/XGBoost or another model: sufficient representative observations/features, evaluation baseline, explainable action boundary, and drift/rollback plan.
- Saga orchestration: independently committed distributed services actually exist. Until then use a PostgreSQL transaction for database state and an idempotent outbox for external effects.
- DPP, INFORM Consumers Act, or other jurisdiction-specific automation: approved market/seller/category applicability and qualified legal interpretation.

## System impact

- Data and schema: future policy/source records, golden-case labels, shadow decisions, algorithm versions, duplicate clusters, and promotion measurements. Exact schema remains an implementation ADR/task.
- Modules: `sals3-portal` catalog candidate rules, evidence capture, decision engine, publication workflow, supplier adapter resilience, audit, and outbox. `sals3-ecommerce` continues to read only published catalog data.
- User workflow: qualified operational warnings may publish with visible attention; uncertain legal/compliance/duplicate cases stop before publication and enter a bounded exception workflow.
- Financial or compliance effect: reduces false publication and false blocking; no legal rule activates without market scope, primary-source evidence, accountable owner, and applicable review.
- Migration and rollback: current stored decisions remain historical. New policy versions re-evaluate eligible evidence in shadow mode first. A feature flag disables enforcement without deleting evidence, decisions, or audit history.
- Cost impact: lower than the rejected enterprise stack. Additional storage and review cost is bounded by the pilot/golden set and shadow records; no new paid infrastructure is approved.

## Required verification

- Focused tests:
  - one evidence snapshot can be deterministically re-evaluated under two policy versions;
  - shadow decisions create no publish, pause, block, merge, or notification side effect;
  - legal/IP/media-rights/near-duplicate uncertainty routes to `REVIEW`;
  - multiple non-blocking operational warnings do not become a hard rejection by count alone;
  - pHash similarity creates a cluster and never auto-merges/rejects;
  - one seller connection's open circuit does not affect another tenant;
  - unsafe external URLs, redirects, address ranges, response types, and oversized responses fail closed.
- Full or cross-module tests:
  - golden catalogue decisions and reason codes remain stable for the approved policy version;
  - canary activation, rollback, policy change, re-evaluation, and idempotent outbox replay;
  - storefront receives only published canonical revisions and no candidate/shadow record.
- Manual acceptance:
  - policy owner reviews the confusion/error report and approves promotion;
  - reviewer can explain every decision from evidence, source anchor, policy, and reason code;
  - exception queue has WIP limit, ownership, SLA, and escalation path.
- Data reconciliation:
  - decision, action, and audit counts reconcile;
  - no side effect exists without its decision/audit source;
  - no active rule lacks its current source/applicability record.

Run the repository's required verification commands when implementation begins. This documentation-only approval does not claim that any new runtime behavior exists.

## Supersession

This ADR does not supersede ADR-001 through ADR-008. It clarifies and strengthens the catalog decision and publication controls in [[cj-candidate-to-sals3-product-draft-implementation-spec]]. Where earlier summaries say only "yellow auto-publishes," this ADR limits that outcome to non-blocking quality or operational attention; unresolved legal, IP, safety, permit, mapping, media-rights, evidence, and near-duplicate uncertainty remains pre-publication `REVIEW`.
