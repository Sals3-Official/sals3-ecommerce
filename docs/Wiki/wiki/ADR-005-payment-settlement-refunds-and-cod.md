---
tags: [sals3, adr, payments, settlement, refunds, cod, risk]
aliases: [ADR-005, Payment Settlement and COD, COD Decision]
created: 2026-08-06
updated: 2026-08-07
status: approved
authority: architecture-decision
owner_approved: true
related:
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[parked-ideas-backlog]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
---

# ADR-005 - Payment settlement, refunds, and Cash on Delivery

> [!IMPORTANT] Phase-1 decision
> Online prepaid may proceed only through verified server-side payment events and reconciliation. Cash on Delivery is disabled and out of phase 1 until its courier, remittance, refusal, return, fraud, and geographic controls are approved and verified.

## Decision

### 1. Model payment, settlement, supplier spend, and delivery separately

Do not collapse these moments:

```text
T1 - payment gateway confirms/captures customer payment
T2 - gateway settles funds to Sals3
T3 - Sals3 pays or commits supplier funds
T4 - parcel is delivered or fails/returns
```

The exact order of T2 and T3 depends on gateway payout timing and supplier operations. A valid T1 can authorize fulfillment when business risk controls allow it; the checkout screen cannot.

Store separate payment, settlement, supplier-payment, refund, and fulfillment records. Never append gateway metadata to the customer's name or identity fields.

### 2. Make payment and refund transitions idempotent

- Verify gateway signatures and event identity.
- Deduplicate repeated events.
- Reconcile gateway state against internal state.
- Keep immutable financial event history and explicit reversals rather than destructive edits.
- Prevent fulfillment when the order amount, currency, quote version, or payment status does not match.
- Support partial and full refunds with reason, actor, source event, and order-line allocation.

### 3. Recognize both exposure windows

Online prepaid carries:

- settlement/chargeback exposure between gateway confirmation and final settlement;
- delivery/refund exposure after supplier funds are committed but before successful delivery.

Pricing and operational reserves must account for payment fees, expected refunds/returns, failed delivery, and unrecoverable supplier cost. The system must not describe these reserves as seller commission.

### 4. Disable COD in phase 1

COD is not prepaid with a delay. Sals3 may have to pay CJ before collecting anything, while customer refusal, failed delivery, and return-to-sender charges remain possible.

COD stays disabled until all of these exist:

- approved courier and country coverage;
- remittance timing and reconciliation contract;
- refusal, return-to-sender, and damaged-return cost model;
- address/phone verification and fraud controls;
- order-value, product, and geographic eligibility policy;
- support and collections workflow;
- verified accounting, tax, and consumer-disclosure treatment;
- pilot metrics and a stop-loss rule.

Possible future controls such as partial deposit, order cap, or restricted zones are candidates, not approved defaults.

### 5. Keep commission separate

Supplier costs, payment fees, tax, refunds, reserves, chargebacks, and fulfillment liabilities are not seller commission. ADR-008 approves the mechanism for real Dropshipper accounts: Sals3 records a transparent marketplace commission on the Sals3 customer-sale rail, while the seller separately funds its own supplier account/order. Exact commission rate, fee basis, payment provider, responsible party for processing/refund costs, reserve, and payout schedule remain pending explicit commercial and legal/accounting approval.

Never ask CJ or another supplier to calculate or release the Sals3 seller payout. Never treat a supplier wallet as the Sals3 seller balance. Use separate immutable ledger entries and reversals for commission, seller payable, supplier spend, payment fees, reserves, refunds, and chargebacks.

## Verification required

- Confirm actual gateway capture, settlement, refund, dispute, and payout behavior for chosen providers.
- Duplicate/out-of-order webhook and reconciliation tests.
- Ledger review covering fees, refunds, chargebacks, supplier spend, tax, and delivery exceptions.
- Market-specific legal/accounting review before real money moves.
- COD requires a separate owner-approved activation record after the prerequisites above pass.
