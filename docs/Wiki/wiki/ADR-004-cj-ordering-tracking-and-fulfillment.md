---
tags: [sals3, adr, cj-dropshipping, orders, tracking, fulfillment, webhook]
aliases: [ADR-004, CJ Order Fulfillment, CJ Tracking and Webhooks]
created: 2026-08-06
updated: 2026-08-07
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
---

# ADR-004 - Direct CJ ordering, tracking, and fulfillment

> [!IMPORTANT] Approved direction; integration not implemented
> The supplier order path will use CJ's current API directly from a trusted worker. No Zapier or browser-triggered supplier order is allowed in the critical path.

## Decision

### 1. Trigger fulfillment only from trusted order state

The browser success page is display-only. A verified payment capture/webhook moves an internal order to `PAID`; an idempotent worker then queues supplier fulfillment. The exact CJ order endpoint/version and request contract must be selected from current official documentation and verified with the actual Sals3 CJ account before implementation.

### 2. Use an explicit state machine

Primary states:

```text
DRAFT
CHECKOUT_PENDING
PAYMENT_PENDING
PAID
FULFILLMENT_QUEUED
CJ_ORDER_CREATED
CJ_PAYMENT_PENDING
FULFILLING
SHIPPED
DELIVERED
```

Exception states:

```text
PAYMENT_FAILED
FULFILLMENT_FAILED
AWAITING_SUPPLIER_FUNDS
CANCEL_REQUESTED
CANCELLED
DELIVERY_EXCEPTION
REFUND_PENDING
REFUNDED
RETURN_IN_PROGRESS
RETURNED
```

State transitions are server-authorized, idempotent, auditable, and never inferred solely from a customer redirect.

### 3. Design for retries and reconciliation

Minimum controls:

- internal order and order-line identifiers independent of CJ IDs;
- idempotency key per fulfillment action;
- transactional outbox or equivalently reliable job handoff;
- bounded retry with backoff and dead-letter/manual review;
- raw supplier request/response references with secrets and personal data redacted;
- webhook signature verification against the raw request body;
- CJ webhook `messageId` deduplication and fast acknowledgement;
- scheduled reconciliation for stuck or conflicting states;
- explicit support for split orders, supplier failures, price changes, and makeup bills where applicable.

### 4. Check wallet balance before supplier payment

CJ documents `GET /shopping/pay/getBalance`. Monitor usable, frozen, and non-withdrawable balance values and alert before funds are insufficient. A paid customer order that cannot be funded enters `AWAITING_SUPPLIER_FUNDS`; it must not fail silently.

The connected CJ account and wallet belong to the Dropshipper seller. Catalog access does not require wallet balance, but automatic CJ balance payment requires sufficient current funds. With no verified funding path, place affected offers on funding hold before new checkout. If a customer order was already accepted, keep it active, notify the seller through all required channels, and recover or expire through the explicit deadline/refund workflow in ADR-008. Sals3 does not advance supplier funds in phase 1.

Shopping API reference: <https://developers.cjdropshipping.com/en/api/api2/api/shopping.html>

### 5. Reconcile multiple tracking sources

CJ's logistics webhook documents tracking status values, including `12 = Delivered`, as well as exception and return statuses. CJ webhook/API data is therefore a real tracking source, not merely a tracking-number notification.

An independent carrier or aggregator may be added after coverage, cost, SLA, and Philippine/launch-market last-mile tests. It is not automatically authoritative.

Recommended source priority:

1. direct carrier event, when reliably available;
2. CJ logistics webhook/API;
3. evaluated tracking aggregator;
4. audited operations override.

Store every source event. Do not automatically downgrade a terminal delivered state. Conflicts enter `TRACKING_CONFLICT` for reconciliation under a documented source-priority policy.

Webhook reference: <https://developers.cjdropshipping.com/en/api/start/webhook.html>

### 6. Abstract supplier logistics names

Map raw supplier logistics names to truthful customer-facing service levels using versioned data. The customer promise should include meaningful delivery timing and origin information; raw internal supplier line names must not leak by accident.

### 7. Lock the accepted item, not the live listing

At the trusted order-acceptance boundary, create an immutable `OrderLineSnapshot` and idempotent `SupplierOrderIntent` bound to the exact `OfferSupplierBinding`. The snapshot preserves the accepted product revision, variant, price, terms, attributes, controlled media, supplier identifiers, and evidence checksum.

A later seller delist, supplier delist, stock loss, cost change, product edit, media replacement, or variant rename blocks or changes future sales only. It does not rewrite or automatically cancel an accepted order. Already accepted supplier fulfillment and tracking continue. An unavailable unsubmitted commitment enters an explicit fulfillment exception; no provider, product, or variant substitution is silent. [[ADR-007-supplier-change-attention-and-immutable-order-snapshots]] is the detailed contract.

## Verification required

- Sandbox/test order using the exact chosen CJ order contract.
- Duplicate payment and duplicate webhook tests prove one supplier order is created.
- Invalid HMAC, replayed `messageId`, timeout, partial failure, and insufficient-wallet tests.
- Reconciliation test for a job that succeeds at CJ but times out before Sals3 receives the response.
- Tracking conflict and return/exception tests.
- Operational runbook for manual recovery and customer communication.
- Order-at-12:00/delist-at-13:00 test proving new checkout is blocked while the accepted order, snapshot, fulfillment, and tracking remain active.
- Supplier product/media modification test proving historical Orders, receipt, return, dispute, and support views do not change.
