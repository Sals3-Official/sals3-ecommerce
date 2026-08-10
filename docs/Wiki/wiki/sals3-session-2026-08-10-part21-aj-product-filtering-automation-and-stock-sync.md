---
tags: [session, sals3, aj, product-filtering, catalog-automation, cj, inventory, webhooks]
aliases: [AJ Product Filtering Q&A, Product Filtering Automation and Stock Sync Discussion]
created: 2026-08-10
updated: 2026-08-10
status: historical
authority: session-note
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-end-to-end-process-flow]]"
  - "[[sals3-implementation-phases]]"
  - "[[parked-ideas-backlog]]"
---

# Session: AJ product filtering, automation, and CJ stock synchronization Q&A

Historical discussion record. Current implementation truth remains in [[hot]];
approved architecture remains in the related ADRs and
[[cj-candidate-to-sals3-product-draft-implementation-spec]]. This note keeps
AJ's product questions and their agreed solutions together so a future agent
does not reconstruct the conversation from fragments.

## 1. Is the product filtering design solid enough to code quickly?

**Question:** Are the filtering settings solid, are the blockers addressed,
and can implementation now accelerate?

**Answer:** The structural design is ready for implementation, but `Ready`
must not be confused with a live/published product. Real CJ fixtures and a
golden pilot catalogue can still reveal category-specific cases; the design is
considered ready because every unknown now has an explicit decision state,
recovery path, evidence boundary, and activation trigger instead of requiring a
system redesign.

Approved coding order:

1. queue/retry/reconnect correctness;
2. persistent hot/backfill discovery coverage;
3. material fingerprint and evidence freshness;
4. policy-version re-evaluation;
5. append-only linked evidence/findings/decisions;
6. connection isolation, fairness, budgets, heartbeat, and safe delisting;
7. approved pilot rule pack plus golden/shadow/canary;
8. freight, landed-cost, media-rights, and near-duplicate review gates;
9. canonical Product/Variant/Revision/Offer and Product Catalogue handoff;
10. truthful trend V0.

The team may move fast by implementing these as small verified units. It must
not skip units 1-8 and build a public catalogue on provisional evidence.

## 2. How does All Supplier Products reach Evaluating automatically?

**Question:** Is movement from **All Supplier Products** to **Evaluating**
automatic, and what selects a product?

**Answer:** Yes. **All Supplier Products** is a raw supplier browser, not an
approval list. A protected scheduler runs bounded discovery for each workable,
seller-owned Supplier Connection. Browsing or opening a row does not create a
curated Product.

A candidate enters/re-enters `QUEUED` only for an explainable admission reason:

```text
NEW_PRODUCT
MATERIAL_SOURCE_CHANGE
EVIDENCE_EXPIRED
POLICY_VERSION_CHANGED
RETRY_DUE
CONNECTION_RESTORED
```

An unchanged row or a row outside the positive pilot allowlist remains
discoverable with a reason and next recheck; it does not consume a full CJ
evidence fetch merely because it appeared again.

The approved discovery target uses persistent per-connection category/listing-
time checkpoints, a non-starving hot lane and backfill lane, overlap windows,
and `pid` deduplication. It splits a partition only after the observed query
reaches CJ's documented 6,000-record ceiling. The current first-five-page tick
does not yet satisfy this target.

## 3. What are the actual filtering settings?

**Question:** What exactly is filtered before a candidate may be `Ready`?

**Answer:** The matrix separates pilot admission, objective blockers,
uncertainty, temporary conditions, technical failures, non-blocking attention,
and ranking-only signals.

| Filter | Approved setting | Failure result |
|---|---|---|
| Pilot market | Positive enabled-market allowlist; current `PH` code value is a labelled placeholder, not final approval | `NOT_IN_PILOT` / `HOLD` |
| Pilot category | Positive category allowlist before expensive evidence | `NOT_IN_PILOT` / `HOLD` |
| Product mode | Only CJ modes whose order, inventory, content, and fulfillment path are implemented and tested | `NOT_SUPPORTED_IN_PILOT` |
| Prohibited product | Versioned objective prohibited/regulated rule | `BLOCKED` when objective; `REVIEW` when uncertain |
| Brand/counterfeit | Exact protected-brand evidence and conservative counterfeit signals | objective `BLOCKED`; uncertain `REVIEW` |
| Identity | Stable Sals3 identity with CJ `pid`/`vid` as provider references | incomplete `HOLD`; ambiguous `VARIANT_MAPPING_CONFLICT` |
| Exact duplicate | Same Supplier Connection plus CJ `pid` reuses the existing candidate | reuse; no duplicate candidate |
| Near duplicate | Similar title/image under another provider identity | reviewable cluster; never automatic merge/reject |
| Price/currency | Positive parseable source price/currency; final commercial rules remain versioned | invalid/outlier `HOLD`; commercial gate before publish |
| Inventory | Exact variant evidence; preserve CJ, factory, total, and verification facts separately | zero/unknown `HOLD` |
| Factory/unverified inventory | Policy input, never an automatic clean pass or permanent block | accepted-risk `PASS_WITH_ATTENTION` or `HOLD` |
| Stocked origin | Evidence that an origin has stock | `NO_STOCKED_ORIGIN`; never claim freight confirmation |
| Destination freight | Exact market, variant, quantity, origin, method, amount, time, and expiry | publication/checkout `HOLD` without a valid quote |
| Variant consistency | SKU/options/stock/price/media/measurements agree | `REVIEW` / `VARIANT_MAPPING_CONFLICT` |
| Product information | Required identity, category, attributes, logistics facts, and truthful copy | non-blocking gap `PASS_WITH_ATTENTION`; required gap `HOLD`/`REVIEW` |
| Media | Rights-known controlled set; explicit variant-to-media truth | `NEEDS_MEDIA_REVIEW` / `NO_USABLE_PICTURES` |
| Reviews | Supplier-platform evidence only, separate from future verified Sals3 purchases | never an automatic sales/quality pass |
| Popularity | CJ trending and `listedCount` are ranking-only | cannot change qualification |
| Evidence freshness | Evidence must be fresh under the current enforced policy version | requeue to `Evaluating` |
| Supplier connection | One canonical workable-status rule across ingestion/evaluation | recoverable temporary state |
| Technical failure | Bounded retry with visible recovery/dead-letter state | `EVALUATION_FAILED`, then **Exception Queue** when exhausted |

The system does **not** use CJ listing count, trending membership, arbitrary
sales counts, arbitrary review thresholds, factory stock alone, Google channel
rules, supplier rating alone, or perceptual similarity alone as hard-pass
filters.

## 4. What is the technical filtering path to Ready?

**Question:** How does the code execute those filters?

**Answer:**

```text
protected scheduler
  -> list workable tenant-owned Supplier Connections
  -> CjSupplierAdapter bounded discovery
  -> material fingerprint + admission reason
  -> upsert SupplierCandidate by connection + CJ pid
  -> candidate_evaluations = QUEUED
  -> bounded worker claim with FOR UPDATE SKIP LOCKED + lease
  -> EVALUATING
  -> cheap positive-allowlist/objective screening
  -> Zod-validated CJ detail/variant/inventory/review evidence
  -> versioned qualification findings
  -> decision precedence
  -> short transaction: evidence + findings + decision + audit/current pointer
  -> server-owned queue projection
```

Decision precedence:

```text
objective permanent blocker -> BLOCKED
unresolved legal/IP/safety/media/mapping/duplicate uncertainty -> REVIEW
temporary stock/data/connection condition -> HOLD / TEMPORARILY_INELIGIBLE
technical execution failure -> EVALUATION_FAILED
non-blocking quality/operational warning -> PASS_WITH_ATTENTION
no remaining finding -> PASS
```

Portal projection:

```text
PASS -> Qualified Products -> Ready
PASS_WITH_ATTENTION -> Qualified Products -> Needs Attention
REVIEW/HOLD/TEMPORARILY_INELIGIBLE/BLOCKED -> review or Blocked / Rejected surface
exhausted EVALUATION_FAILED -> Exception Queue
```

Every nonterminal candidate must appear in exactly one queue/projection. Every
timed temporary state needs `nextRetryAt`; every event-driven temporary state
needs a named recovery trigger. A decision binds the candidate, exact evidence
snapshot/checksum, reason codes, policy/algorithm version, affected scope, and
evaluation time.

`Ready` means only **qualified candidate under current fresh-enough evidence**.
It does not mean live or published. The next flow is **Customize & List ->
Product Editor -> publication gates -> Product Catalogue -> ecommerce**.

## 5. What is the disconnect/reconnect fallback?

**Question:** What happens to queued products when the owner disconnects a
Supplier App, especially during development?

**Answer:** Intentional **Supplier Apps -> Disconnect** is an event-driven
pause, not a technical failure.

- stop new ingestion/evidence calls and do not consume a technical attempt;
- preserve the last completed evidence/decision as history;
- set effective customization/publication/checkout eligibility false;
- show affected rows as **Blocked / Rejected -> Temporarily unavailable** with
  stable reason `SUPPLIER_CONNECTION_DISCONNECTED` and recovery trigger
  `ON_CONNECTION_RESTORED`;
- do not poll CJ while intentionally disconnected;
- **Reconnect and resume evaluation** verifies credentials, records
  `CONNECTION_RESTORED`, and requeues bounded idempotent batches through
  **Evaluating** before any row may return to **Ready**;
- accepted orders retain immutable product, variant, media, price, terms, and
  supplier binding; they never receive a silent substitute.

An exhausted failure can reopen on a material source change, applicable policy
change, or connection restoration while preserving old attempts and decisions.

## 6. How do own pictures and supplier pictures work?

**Question:** Can the seller upload their own pictures while still seeing the
supplier originals, with automatic supplier fallback and a catalogue status?

**Answer:** Yes; ADR-011 governs the unimplemented target.

- Product Editor always shows read-only **Original supplier pictures** with
  provenance and review/rights state.
- Seller uploads appear under **Your pictures**.
- Revision preference is `SELLER_FIRST | SUPPLIER_ONLY`.
- `SELLER_FIRST` with no eligible seller upload resolves only to an approved
  supplier set and exposes `SUPPLIER_FALLBACK` to the seller.
- Public pages use Sals3-controlled, rights-known revision media, never mutable
  supplier URLs.
- Product Catalogue separates listing status from
  `OWN_PICTURES | SUPPLIER_PICTURES | MIXED_PICTURES | SUPPLIER_FALLBACK |
  NEEDS_MEDIA_REVIEW | NO_USABLE_PICTURES`.
- Variant picture, option label, included quantity, and required measurements
  must agree; mismatch becomes `NEEDS_MEDIA_REVIEW`.

## 7. Can CJ data identify hot products?

**Question:** Can Sals3 detect hot CJ items and show them on ecommerce?

**Answer:** Yes, only as qualified merchandising. Portal owns CJ trend/listing
snapshots and the ranking; ecommerce never calls CJ directly. V0 uses bounded
daily official-trending/category-relative `listedCount` snapshots with expiry,
after all normal publication gates. `listedCount` means listings, not units
sold; it cannot justify `Best seller` or `Deals`. Advanced velocity,
saturation, and first-party outcome weighting remain later triggers.

## 8. Are Google requirements core product rules?

**Question:** Why was a Google source used; does it make Google requirements
part of Sals3 filtering?

**Answer:** No. Google Merchant/Search documentation is optional future
channel-compatibility evidence only if Sals3 later exports a Google feed or
structured product data. It is not Sals3 core catalogue authority and creates
no phase-1 requirement.

## 9. Which recommendations were deliberately parked to avoid overreaction?

**Question:** Are the gap recommendations hallucinated or excessive?

**Answer:** The verified core gaps remain, but unused enterprise machinery is
triggered rather than launch-blocking. Parked items include:

- product-safety incident/recall case-management automation;
- GTIN/MPN and external channel feeds;
- automated physical sample-inspection software;
- external search-index repair before an independent index/cache exists;
- advanced trend statistics;
- complex per-product return-policy rules.

One approved versioned store-wide return/refund/warranty policy per enabled
pilot market is sufficient initially. Parking recall software never authorizes
unsafe products or removes the obligation to stop sale/respond to a real
incident.

## 10. Which automation is cost-effective, secure, and fast?

**Question:** Should the core filtering use Vercel or n8n?

**Answer:** Keep the core decision engine, tenant authorization, evidence,
retry state, and audit inside Sals3 code plus PostgreSQL. Do not make n8n the
catalogue source of truth.

Approved lean rollout:

```text
Development/pilot:
GitHub Actions schedule
  -> protected Vercel route
  -> bounded discovery/evaluation
  -> PostgreSQL leases, retry, audit, and Exception Queue

Production target after explicit beta/cost readiness review:
Vercel Pro Cron
  -> discovery producer
  -> Vercel Queue evaluation messages
  -> internal queue consumer
  -> PostgreSQL evidence/decision/audit source of truth
```

Vercel facts verified on 2026-08-10:

- Hobby Cron runs at most once per day and is not precise enough for frequent
  catalogue discovery; Pro supports per-minute schedules:
  <https://vercel.com/docs/cron-jobs/usage-and-pricing>.
- Vercel Queues is public beta, provides durable at-least-once delivery,
  retries, visibility leases, concurrency controls, idempotency keys, and an
  internal/non-public consumer option. It has no built-in DLQ, so the Sals3
  database **Exception Queue** remains required:
  <https://vercel.com/docs/queues>.

Queue payloads contain IDs and versions only:

```text
candidateId
supplierConnectionId
evidenceVersion
policyVersion
admissionReason
```

They never contain CJ tokens, refresh tokens, raw supplier payloads, database
credentials, or seller personal information. At-least-once processing requires
an idempotent database transaction. CJ calls remain limited per Supplier
Connection while different connections may progress independently.

n8n remains useful for peripheral, non-authoritative automation such as
Slack/Teams alerts, daily reports, email reminders, manual approval reminders,
and later CRM/accounting exports. It does not own filtering rules, publication
eligibility, inventory decisions, tenant authorization, evidence, or retry
truth. As verified 2026-08-10, n8n itself estimates a five-minute scheduled
workflow at roughly 8,600-8,900 executions/month; its current cloud pricing is
execution-based, making it a poor default for this frequent core loop:
<https://n8n.io/pricing/>.

Vercel Queues must still pass a production beta/reliability/pricing review
before adoption. Until then the existing PostgreSQL lease/retry worker remains
the authoritative queue; no platform migration is a prerequisite for fixing
the current correctness blockers.

## 11. Will a CJ stock change update the Sals3 listing through webhooks?

**Question:** When CJ inventory changes, should the Sals3 listing change too?

**Answer:** Yes after the approved synchronization work is implemented, but a
webhook never directly mutates public truth without validation.

```text
CJ stock webhook
  -> signature/authenticity verification
  -> messageId deduplication
  -> resolve exact Supplier Connection + CJ product + CJ variant
  -> append inventory observation
  -> compare with current evidence
  -> re-evaluate affected exact variant/offer/market
  -> atomically update Product Catalogue availability/current pointer
  -> invalidate/update ecommerce read model
```

Behavior:

- one variant reaches zero: only that variant becomes unavailable;
- all purchasable variants reach zero: offer/product becomes out of stock or
  `AUTO_PAUSED` for future checkout, never deleted;
- inventory returns: re-enable only after current price, connection,
  orderability, policy, media, and applicable freight gates still pass;
- CJ warehouse stock disappears but factory stock remains: versioned policy
  chooses `PASS_WITH_ATTENTION` or `HOLD`; `totalInventory > 0` alone cannot
  make a customer-facing in-stock claim;
- accepted orders preserve their immutable binding and enter an explicit
  fulfillment exception if needed; never silently substitute a variant.

Defense in depth:

```text
CJ webhook for selected/imported/live products
+ scheduled reconciliation for missed/delayed events
+ checkout-time exact variant/stock/cost/freight validation
```

Do not subscribe the raw **All Supplier Products** candidate pool. Subscribe
selected imports, live products, and accepted-order protection subjects. This
stock-to-listing synchronization is approved design and is **not yet fully
implemented**.

## Final implementation boundary

The conversation does not authorize a large rewrite or an n8n/Vercel Queue
migration before the correctness unit. The immediate product code unit remains:

1. real timed and event-driven retry/recovery invariants;
2. visible pre-dead-letter failures and exactly-one-queue projection;
3. one workable Supplier Connection rule;
4. intentional disconnect/reconnect recovery;
5. tests and honest portal copy.

After that foundation passes, implement discovery coverage, evidence fidelity,
policy/history, resilience, publication gates, Product Catalogue, stock sync,
and trend V0 in the approved order.
