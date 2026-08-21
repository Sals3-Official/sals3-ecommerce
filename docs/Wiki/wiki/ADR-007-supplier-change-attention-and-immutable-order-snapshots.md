---
tags: [sals3, adr, supplier-sync, catalog, orders, notifications, audit]
aliases: [Supplier Change Handling, Immutable Ordered Item Snapshot, Supplier Anomaly Attention, Seller Edit Order Protection]
created: 2026-08-07
updated: 2026-08-21
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: partially-implemented
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-end-to-end-process-flow]]"
  - "[[sals3-implementation-phases]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
---

# ADR-007: Supplier changes, seller attention, and immutable ordered-item snapshots

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved this contract on 2026-08-07. Supplier delisting, stock loss, price anomalies, and later source changes must protect new purchases automatically, notify the seller, and never rewrite an accepted customer's order. This ADR supersedes the earlier phase-1 deferral of external email/push notifications for these supplier anomalies.

## Problem

A supplier product is mutable after Sals3 imports it. CJ or another approved provider may delist a product, remove or rename a variant, report zero stock, change price, replace media, alter material/specifications, remove freight service, or return inconsistent data.

Two different obligations must not be confused:

1. **Current listing safety:** prevent new customers from buying an unavailable, prohibited, misleading, or commercially invalid offer.
2. **Accepted-order integrity:** preserve exactly what an earlier customer bought and continue its committed fulfillment unless the order itself encounters an exception.

Deleting or overwriting the Sals3 product would destroy history. Silently changing an accepted order would misrepresent the transaction. Silently changing price or supplier routing could create margin, customer-consent, accounting, and fulfillment errors.

## Core invariants

1. A supplier change affects future purchasability; it does not automatically cancel or rewrite an accepted order.
2. Sals3 pauses or disables the smallest affected scope: variant, offer, or market. It does not permanently delete the Product.
3. Product and media changes create a new immutable `ProductRevision`; they never mutate a revision referenced by an accepted order.
4. Every accepted order line owns an immutable `OrderLineSnapshot` of the representation, terms, and supplier binding accepted by the customer.
5. Supplier media used in an order snapshot is copied to controlled Sals3 storage and checksum-addressed. A mutable external URL is not sufficient evidence.
6. A seller delist stops new sales only. Existing accepted orders stay active and retain fulfillment/tracking access.
7. Supplier substitution and rerouting are never silent. A materially different replacement requires an approved exception workflow and customer consent where applicable; otherwise cancel/refund under the approved policy.
8. Automated protective action does not wait for a notification to be delivered.
9. Every supplier anomaly produces one deduplicated, auditable attention case with an explicit system action and recovery path.

## Listing and order lifecycle separation

Example:

```text
12:00 Customer order accepted
      -> immutable OrderLineSnapshot created
      -> SupplierOrderIntent committed

13:00 Seller or supplier delists the source item
      -> new checkout blocked
      -> affected live offer auto-paused
      -> seller attention case opened
      -> accepted order remains active
      -> committed fulfillment and tracking continue
```

Valid simultaneous state:

```text
Product publication: PUBLISHED
Offer state: PAUSED_SUPPLIER_DELISTED
Customer order: ACTIVE
Supplier fulfillment: ACCEPTED
```

The customer Orders UI renders the stored order-line snapshot. It never depends on the current Product, Variant, Offer, provider page, or remote image URL.

## Order commitment boundary

An item in a cart is not permanently locked. Checkout must revalidate current variant, stock, landed cost, freight, market eligibility, and price. If a material value changed since cart creation, require the customer to review and reconfirm it before payment.

The immutable commitment begins when Sals3 accepts the order under the verified payment/order policy. In the same reliable workflow:

1. create the internal Order and OrderLine records;
2. create an immutable `OrderLineSnapshot` for each line;
3. bind the line to the exact active `OfferSupplierBinding`;
4. create an idempotent `SupplierOrderIntent` and transactional outbox event;
5. submit to the exact provider connection as soon as the trusted fulfillment state allows;
6. record the provider order reference or a recoverable fulfillment exception.

The product can change after this boundary. The accepted order cannot.

## Immutable snapshot contract

```text
OrderLineSnapshot
- id
- orderLineId
- productId
- productRevisionId
- variantId
- offerId
- offerSupplierBindingId
- sellerAccountId
- supplierConnectionId
- supplierProviderId
- externalProductId
- externalVariantId
- title
- selectedOptions
- skuShownToCustomer
- quantity
- unitPrice and currency
- discounts and price lines
- tax and shipping allocation
- promisedDeliveryWindow
- origin and fulfillment disclosure
- return/warranty terms version
- orderedAttributes
- mediaSnapshotIds
- supplierSnapshotChecksum
- acceptedAt
- snapshotChecksum
```

Store the attributes that materially described the purchased item, including size, color, material, dimensions, bundle quantity, and model where applicable. Do not depend on a later live join to reconstruct those facts.

`OrderLineSnapshot` is append-only after acceptance. A correction creates an audited `OrderAmendment` with reason, actor, timestamp, before/after values, and customer consent when required. The original snapshot remains readable.

### Media locking

Before publication, approved supplier media is copied into controlled Sals3 storage with source URL, rights basis, checksum, captured time, and revision membership. At order acceptance, the order line references the exact stored media snapshot used for that revision.

If a supplier later replaces or removes a file at the same URL, the order, receipt, return, dispute, and support surfaces continue showing the original accepted media.

## Supplier change detection

Use both signed provider webhooks where supported and scheduled reconciliation. A webhook is an early signal, not the only source of truth. Reconciliation detects missed, delayed, unsupported, or conflicting events.

Every observation records:

- provider and `supplierConnectionId`;
- external product/variant identifiers;
- old and new normalized values;
- provider event/request identifier;
- observed and effective timestamps;
- source snapshot checksum;
- detection method;
- policy/rule version;
- confidence and confirmation state.

For destructive or material changes, confirm with the provider detail/inventory/freight endpoint when possible. Checkout protection is immediate when the latest trusted evidence says purchase is unsafe; confirmation must not reopen an unsafe checkout window.

## Required anomaly behavior

| Supplier event | New-purchase action | Existing-order action | Seller attention |
|---|---|---|---|
| Product delisted/deleted/off-sale | Auto-pause all affected offers; retain Product and tombstone | Continue accepted supplier orders; exception only if provider rejects them | Critical |
| One variant zero stock | Disable exact variant and block checkout | Existing accepted line stays active | High or Medium by active-order exposure |
| All variants zero stock | Auto-pause affected offer | Existing accepted lines stay active; monitor supplier acceptance | High |
| Variant removed or identity mapping changed | Disable exact binding; require remap before new sales | Never rewrite historical variant | High |
| Material supplier-cost spike | Freeze automatic customer-price change; recompute landed cost and margin; pause when policy fails | Preserve accepted customer price and exact order economics | High/Critical |
| Small cost change within policy | Record snapshot and apply approved repricing policy | No historical change | Medium or digest |
| Freight/service disappears for one market | Pause that market's offer | Existing order enters exception only if committed service fails | High |
| Product media/specification/material changed | Create a new ProductRevision and re-run gates | Preserve old revision and media snapshot | Medium/High by materiality |
| Product becomes prohibited/unsafe | Immediately block affected market or global offer | Escalate active orders under safety/legal procedure; do not silently fulfill | Critical |
| Supplier connection degraded/reauth required | Stop unsafe new sourcing/order submission as defined by state | Preserve submitted orders and tracking; queue unsubmitted commitments for recovery | Critical when active orders are exposed |
| Supplier wallet/payment not ready | Funding-hold affected auto-fulfilled offers before new checkout | Keep accepted order active as `AWAITING_SUPPLIER_FUNDS`; deadline/recovery/refund flow | Critical when accepted orders are exposed |
| Invalid or implausible supplier response | Keep last trusted public facts, block when safety cannot be established, and reconcile | Do not rewrite order | High |

Stock restoration or issue recovery may auto-reactivate only when fresh evidence passes every current publication gate and no seller/admin hold remains. Record the transition and notify when operationally useful.

## Price anomaly policy

Do not silently copy a new supplier cost into the customer price. Evaluate:

- percentage cost change;
- absolute cost change in normalized currency;
- current destination-specific freight;
- taxes/duties and other landed-cost inputs;
- resulting contribution margin and minimum floor;
- currency, unit, pack-size, and variant-identity changes;
- recency and trust of the supplier response.

Thresholds are versioned business policy, not hard-coded assumptions. A change inside the approved band may reprice prospectively. A material spike, failed margin floor, unit/currency ambiguity, or implausible value pauses the affected offer and requires attention. Accepted orders retain their confirmed customer price; supplier-cost exposure is recorded as an order/fulfillment exception rather than rewriting the sale.

## Seller Center attention experience

Canonical surfaces:

```text
Seller Center header
  -> notification bell with deduplicated open count

My Products
  -> Live
  -> Needs Attention
  -> Auto-Paused

Issues & Tasks / Attention Center
  -> Critical
  -> High
  -> Medium
  -> Resolved
```

Each clickable attention case shows:

- what changed and when;
- old and new values;
- provider and connection;
- affected product, variants, offers, markets, and active orders;
- evidence freshness and rule version;
- automatic protection already applied;
- whether new checkout is allowed;
- whether accepted orders are affected;
- recommended next action;
- event and resolution history.

Contextual actions may include:

- view affected active orders;
- retry supplier check;
- accept and reprice under permission;
- set a new customer price;
- remap a variant;
- replace approved media/content;
- reauthorize the supplier connection;
- find a separately approved replacement source;
- keep paused;
- archive after obligations complete;
- acknowledge or resolve with evidence.

No action may silently alter an accepted order or reroute its supplier binding.

## Notification channels and deduplication

`AttentionIssue` is the canonical record. Channel delivery is downstream through a reliable notification outbox:

| Severity | In-app | Push | Email | Timing |
|---|---|---|---|---|
| Critical | Required | Immediate attempt | Immediate attempt | Immediate |
| High | Required | Immediate attempt | Immediate or policy-bounded batch | Near-real-time |
| Medium | Required | Optional by preference | Grouped digest | Daily or configured digest |
| Low/recovery | Recorded | Optional | Optional digest | Batched |

Push may use standards-based web push or a future mobile channel. Permission denial or channel failure never suppresses the in-app record or delays auto-pause.

Deduplicate by seller account, affected resource, reason code, and policy/rule version. While the issue remains open, new observations update the existing case instead of creating alert storms. Use channel cooldowns, grouped summaries, delivery attempts, retry/dead-letter handling, and per-channel audit. A newly critical escalation may bypass the cooldown.

## Active orders during seller delist or supplier disconnect

Before a seller delists an offer, show the active-order count and require clear confirmation:

```text
This product has active orders.

Delisting stops new sales. It does not cancel active orders.
[View active orders] [Delist product]
```

A normal supplier disconnect follows a drain model:

1. stop new sourcing and new checkout for affected offers;
2. preserve already submitted supplier orders and tracking synchronization;
3. continue or recover supplier submissions committed before the disconnect request;
4. display the active/unsubmitted order count before confirmation;
5. complete disconnection after obligations are drained where provider capability allows.

An emergency security revocation may stop access immediately. It creates Critical fulfillment exceptions for every exposed order. It still does not delete or rewrite order history.

## Existing-order exception behavior

If an accepted order has not yet been accepted by the supplier and the exact item becomes unavailable:

```text
Customer Order: ACTIVE
Supplier Fulfillment: ACTION_REQUIRED
Reason: exact committed item unavailable
```

The system may retry only under bounded idempotent rules when failure appears transient. It must not choose another provider, variant, product, or materially different revision automatically. A proposed substitution must show the original and proposed item and follow the approved consent/refund process.

Customer-facing order history must not say “product deleted.” It shows the stored ordered item and, only when true, a message such as: “This item is no longer available for new orders. Your order is still active.”

## Event and data model

```text
SupplierChangeEvent
- id
- supplierConnectionId
- providerProductReferenceId
- providerVariantReferenceId
- eventType
- oldValueReference
- newValueReference
- sourceSnapshotChecksum
- observedAt
- policyVersion
- confirmationState

AttentionIssue
- id
- sellerAccountId
- policyImpact: BLOCKER | WARNING | RECOMMENDATION
- notificationSeverity: CRITICAL | HIGH | MEDIUM | LOW
- reasonCode
- affectedResourceType / affectedResourceId
- notificationFingerprint
- checkoutAllowed
- acceptedOrdersAffected
- automaticAction
- state: OPEN | ACKNOWLEDGED | RESOLVED | SUPERSEDED
- openedAt / resolvedAt

NotificationDelivery
- id
- attentionIssueId
- channel: IN_APP | PUSH | EMAIL
- destinationReference
- state
- attemptCount
- lastAttemptAt
- deliveredAt

SupplierOrderIntent
- id
- orderLineId
- offerSupplierBindingId
- idempotencyKey
- committedAt
- submissionState
- externalOrderId
```

## Security and audit

- Supplier events and notification payloads are tenant-scoped and server-authorized.
- Push/email links open an authenticated Seller Center route and do not contain secrets or protected customer data.
- Notification destinations are verified and stored by reference.
- Acknowledging an issue does not reactivate an offer.
- Reactivation reruns current server-side publication, compliance, stock, freight, price, margin, connection, and policy gates.
- Manual override requires permission, reason, evidence, and audit; confirmed safety/prohibition blockers remain non-overridable under their governing policy.
- Preserve supplier snapshots, ordered-item snapshots, amendments, attention events, notification deliveries, actor, rule versions, and automatic actions under the approved retention policy.

## Acceptance tests

- Accept an order at 12:00, delist its offer at 13:00, and prove the order remains active while new checkout is blocked.
- Change the supplier product days after purchase and prove Orders, receipt, returns, dispute, and support views retain the original title, variant, attributes, terms, and controlled media.
- Replace a remote image at the same URL and prove the ordered image does not change.
- Prove a ProductRevision referenced by an accepted order cannot be mutated.
- Disable one zero-stock variant without disabling unaffected variants; pause the offer when all variants are unavailable.
- Restore stock and auto-reactivate only after every current gate passes and no manual hold exists.
- Detect a material cost spike, preserve accepted-order price, pause when margin policy fails, and show old/new landed-cost evidence.
- Deduplicate repeated events into one attention case and escalate it when severity increases.
- Attempt in-app, push, and email delivery according to severity; prove notification failure does not delay checkout protection.
- Click the Seller Center issue and show cause, scope, active-order impact, automatic action, evidence, and recovery actions.
- Preserve submitted supplier fulfillment and tracking after seller delist.
- Warn before disconnect when committed orders exist; drain normal disconnect and create exceptions on emergency revocation.
- Reject silent substitution, variant replacement, provider rerouting, and historical-order mutation.
- Revalidate a stale cart and require reconfirmation before payment when material facts changed.
- Append an audited amendment without overwriting the original order-line snapshot.

## Consequences

Benefits:

- new customers are protected quickly from stale or unsafe supplier facts;
- sellers receive actionable, multi-channel notification instead of silent delisting;
- accepted orders remain truthful and defensible through fulfillment, return, refund, and dispute;
- supplier changes cannot rewrite historical evidence;
- noisy synchronization does not create notification storms.

Costs:

- controlled media storage, immutable revisions, order snapshots, reliable outbox processing, web/email delivery, reconciliation, and active-order exception tooling are required;
- seller delist/disconnect becomes an obligation-aware workflow rather than a simple flag;
- price and anomaly thresholds require versioned business policy and calibration.

These costs are accepted because catalog freshness and order integrity are core commerce controls, not optional polish.

## Amendment — 2026-08-21: the seller is the other mutating actor, and the snapshot is one column

> [!WARNING] Extends the Problem statement and supersedes `implementation_status: not-started`
> This ADR is written entirely around one actor: *"A supplier product is mutable after Sals3 imports it."* The seller's own listing is mutable too, and by design — the Portal editor exists to make it so. Bogs ruled on 2026-08-21 that a seller edit **must apply to new orders only**, and that a customer must keep seeing the details of the thing they actually ordered even after the seller changes the name, the photos, or anything else. Same protection, different actor, and it needed saying because nothing here said it.

### Why the seller half needs no detection

`Supplier change detection` and `Required anomaly behavior` exist because a supplier changes things *behind* Sals3, asynchronously, and the platform has to notice. A seller edit is the opposite: it happens inside Sals3, by an authenticated actor, at a known moment. There is nothing to detect and nothing to notify — the order simply has to have taken its own copy already. So the seller half of this ADR is entirely a write-time obligation, and adds no queue, no polling, and no notification channel.

### What shipped

- **`sals3_order_lines.listing_snapshot`** — one nullable `jsonb` column, migration `0026_daily_blockbuster`, applied to production through the `CRON_SECRET` break-glass workflow rather than a laptop (`sals3-portal` [#166](https://github.com/Sals3-Official/sals3-portal/pull/166)).
- **Frozen at intent creation, not at acceptance.** This ADR's `Order commitment boundary` puts the snapshot at acceptance. Acceptance runs *after* payment, on a Stripe webhook, so a seller edit landing during that round trip would decide what the order says was bought. Intent creation is before payment and is already where `variant_label` and `image_url` freeze, so the capture joined them there and acceptance only copies. Recorded here because it is a deliberate departure from the text above, not an implementation detail.
- **Contents**: the option axes in the seller's own words and order, the whole gallery, the published description document, the seller's specification answers, the category path, the brand, the condition, and the physical facts. Sourced from `findPublishedProductBySlug` — the exact projection the storefront served the buyer — rather than a second set of joins that would drift from the page it is supposed to be a copy of (`sals3-portal` [#167](https://github.com/Sals3-Official/sals3-portal/pull/167)).
- **`variant_label` was never the buyer's words.** It holds the supplier's own concatenated token (`army green-L`) while the buyer chose `Colour: Army Green` / `Size: L` from the seller's mapped axes. The snapshot carries the buyer-facing pairs and the storefront prefers them; the supplier token stays on the line because CJ fulfilment matches on it.
- **Buyers can read it**: `GET /api/storefront/orders` returns an optional `listing` per line, and `sals3-ecommerce` renders a closed `Details as ordered` disclosure on each order line ([#133](https://github.com/Sals3-Official/sals3-ecommerce/pull/133)).

### Where the as-built shape differs from the contract above

The `Immutable snapshot contract` block lists an `OrderLineSnapshot` entity with its own id, two checksums, and `mediaSnapshotIds`. What exists is narrower, and the differences are choices rather than omissions in three cases and genuine gaps in the rest:

- **One column on the order line, not an entity.** No `orderLineSnapshotId`, no `snapshotChecksum`, no `supplierSnapshotChecksum`. The line already carries the identity fields (`productId`, `variantId`, `supplierConnectionId`, `externalProductId`, `externalVariantId`, `sals3Sku`), so a second row keyed to it would duplicate them to gain an id nothing dereferences yet.
- **Bytes, not `mediaSnapshotIds`.** A pointer to stored media is cheaper and was the plan here, but it makes a two-year-old order depend on a media row still existing — so a future cleanup would blank the very history this ADR protects. The snapshot copies the addresses instead.
- **`OrderAmendment` does not exist.** Corrections after acceptance are unmodelled. The snapshot is append-only in the weak sense that nothing writes it twice, not in the strong sense of an audited amendment trail with customer consent.

Not captured at all, and still to be designed: discount and price lines, tax and shipping allocation, `promisedDeliveryWindow`, `return/warranty terms version`, and the `offerId` / `offerSupplierBindingId` identity pair. Shipping and carrier facts live on `fulfillment_groups` today, which is where a buyer's page reads them from — so they are frozen, just not here.

### One open risk this amendment does not close

`Media locking` above promises that *"if a supplier later replaces or removes a file at the same URL, the order, receipt, return, dispute, and support surfaces continue showing the original accepted media."* **That is still not true for a supplier original.** Seller uploads live in Cloudflare R2 and are durable, but a `SUPPLIER_ORIGINAL` row holds a remote CJ address, and the snapshot freezes the *address*, not the bytes. If CJ deletes or replaces that file, an old order's frozen gallery breaks or silently changes — which is precisely the failure this section was written to prevent, surviving in the one case nobody notices until a dispute.

Closing it means copying approved supplier media into Sals3 storage before publication, as this ADR already specifies. That is media-pipeline work (see [[ADR-011-product-media-source-selection-and-supplier-original-preservation]]'s own open `MediaAsset` item), not order work, and it is not started.

### Status

`implementation_status` moves from `not-started` to `partially-implemented`: the immutable ordered-item snapshot exists for the seller-edit case and is served and rendered. The supplier-change half of this ADR — detection, attention queues, anomaly thresholds, notification channels, active-order exception tooling, `OrderAmendment` — remains unbuilt.
