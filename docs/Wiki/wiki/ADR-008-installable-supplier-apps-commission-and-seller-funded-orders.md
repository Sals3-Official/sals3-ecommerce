---
tags: [sals3, adr, supplier-apps, dropshipping, payments, commission, cj, integrations]
aliases: [Supplier Apps Architecture, Dropshipper Money Flow, Seller-Funded Supplier Orders]
created: 2026-08-07
updated: 2026-08-07
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[sals3-implementation-phases]]"
  - "[[hot]]"
---

# ADR-008: Installable supplier apps, Sals3 commission, and seller-funded supplier orders

> [!IMPORTANT] Approved architecture; commercial values and providers pending
> Bogs approved the architecture on 2026-08-07. Each Dropshipper connects its own supplier account/API. CJ or another supplier charges that seller for fulfillment; it does not pay the seller's Sals3 sales proceeds. Sals3 collects its marketplace commission from the customer-sale payment/payout rail. Exact commission rates, calculation basis, payment provider, reserve, payout timing, and refund allocation remain explicit business/legal/accounting decisions and are not invented here.

## Problem

Three concepts were being mixed together:

1. installing or connecting a dropshipping provider;
2. paying CJ/AliExpress or another supplier for product and fulfillment;
3. collecting customer money, Sals3 commission, and seller payout.

The CJ API exposes supplier order creation, balance inquiry, and balance payment. That makes CJ a supplier purchasing and fulfillment rail. It is not the Sals3 seller-payout system. A seller may connect both CJ and AliExpress, but each connection remains the seller's own account, credentials, wallet/payment setup, orders, and liability.

## Decision summary

1. Seller Center provides an install-like **Apps & Integrations** experience, with **Supplier Apps** as one category.
2. Phase 1 uses Sals3-curated native adapters. It looks like an app/plugin system to sellers but does not load arbitrary third-party code into the Sals3 runtime.
3. Each installation belongs to one `DROPSHIPPER` `SellerAccount` and creates or references one tenant-owned `SupplierConnection`.
4. Installing CJ means authorizing that seller's own CJ account/API; it never grants access to a shared Sals3 or another seller's account.
5. One seller may install multiple different approved supplier apps. Each offer/order line binds to one exact connection and provider variant.
6. Customer payment/seller payout and seller-to-supplier payment are separate money rails and ledgers.
7. Sals3's phase-1 revenue mechanism is a transparent marketplace commission on successful Sals3 sales. Exact values and fee allocation remain pending approval.
8. Supplier product, freight, and order cost are paid through the seller's own supplier account/wallet/payment method. Sals3 does not advance supplier cost in phase 1.
9. Sufficient CJ balance is not required for catalog browsing/import. It is required for automatic CJ balance payment.
10. When no verified supplier-payment path can fund new orders, affected offers enter a funding hold before accepting more checkouts. Accepted orders remain active and enter an explicit funding exception.

## Seller Center experience

```text
Seller Center
  -> Apps & Integrations
      -> Supplier Apps
          -> CJdropshipping        [Connect]
          -> AliExpress            [Unavailable until verified]
          -> Printful              [Coming soon]
          -> Printify              [Coming soon]
```

Use **Supplier Apps** in seller-facing copy. Internally, use provider definitions, installations, connections, capability declarations, and adapters.

Connection flow:

1. Seller selects an approved Supplier App.
2. Sals3 shows requested access and operational capabilities.
3. Seller authorizes or submits credentials for the seller's own provider account through a protected flow.
4. Sals3 validates the connection and declared capabilities.
5. Store an encrypted credential reference; never expose the secret to the browser.
6. Create a tenant-owned installation/connection record.
7. Enable Product Sourcing only after the connection is healthy.

Shopify is an experience reference for install, authorization, access scopes, review, and distribution. It is not a dropshipping supplier and must not appear in Supplier Apps. A separately approved Shopify storefront integration belongs under Sales Channels.

## Phase rollout

### Phase 1: Curated native Supplier Apps

- CJ is the first adapter, using Aj's verified integration behind `CjSupplierAdapter`.
- AliExpress remains unavailable until official account access, catalog, ordering, payment, cancellation, tracking, webhook, commercial, and policy capabilities are verified end to end.
- Sals3 owns and reviews all adapter code.
- No arbitrary JavaScript, npm package, executable upload, custom base URL, callback URL, or webhook handler supplied by a seller is loaded into the main application.

### Later: Approved partner apps

A future Partner Portal may support app registration, manifest/capability declarations, sandbox credentials, OAuth/scopes, contract tests, security review, webhook verification, versioning, suspension, and approval. This requires a separate activation decision.

### Later: Sals3 App Marketplace

Public listings, third-party developer distribution, reviews, paid app plans, installation billing, developer revenue share, and app analytics are future candidates. Do not build them as part of the two-developer phase-1 supplier connection slice.

## App and adapter model

```text
SupplierAppDefinition
- id
- providerCode
- displayName
- iconReference
- description
- distributionState
- authenticationMode
- requestedScopes
- capabilities
- policyVersion

SupplierAppInstallation
- id
- sellerAccountId
- supplierAppDefinitionId
- supplierConnectionId
- installationState
- grantedScopes
- installedAt
- disconnectedAt

SupplierConnection
- id
- sellerAccountId
- supplierProviderId
- externalAccountId
- encryptedCredentialReference
- connectionStatus
- lastVerifiedAt

SupplierProviderAdapter
- connect / authorize
- testConnection
- listProducts / getProduct / getVariants
- getInventory / calculateFreight
- createOrder
- paySupplierOrder when supported
- cancelOrder when supported
- getTracking
- processWebhook when supported
```

Capabilities are explicit. The UI and order worker must not assume CJ and AliExpress support identical actions.

## Tenant boundary

```text
Seller A
  -> CJ Installation A
      -> CJ Connection A
      -> CJ credentials/wallet/orders A

Seller B
  -> CJ Installation B
      -> CJ Connection B
      -> CJ credentials/wallet/orders B
```

An API operation must be authorized against `sellerAccountId + supplierAppInstallationId + supplierConnectionId`. A connection cannot be read, refreshed, charged, disconnected, or used for fulfillment by another seller account.

The Sals3 Official Dropshipper Account follows the same rules. Its CJ connection is not a platform-global credential and is never shared with third-party sellers.

## Two independent money rails

### Rail A: Customer payment, Sals3 commission, and seller payout

```text
Customer
  -> Sals3 checkout / approved marketplace payment provider
      -> Sals3 commission entry
      -> payment/refund/chargeback/reserve entries
      -> seller payable balance
      -> seller payout
```

### Rail B: Seller payment to supplier

```text
Seller's own CJ/AliExpress/provider account
  -> supplier product cost
  -> supplier freight and applicable supplier charges
  -> supplier order acceptance
  -> fulfillment and tracking
```

CJ does not calculate or release the Sals3 seller payout. The Sals3 payment/ledger system does not become the seller's CJ wallet.

## Sals3 charging model

Approved mechanism:

- Sals3 earns a marketplace commission from a successful Sals3 customer sale.
- Calculate and record commission at order-line level so one checkout can split across CJ, AliExpress, or other fulfillment groups.
- Deduct/allocate commission through an approved marketplace payment provider or seller payout ledger; do not charge it through the supplier API.
- Keep payment processing, tax, supplier cost, freight, reserve, refund, chargeback, and commission as separate ledger entries.
- Show the seller a transparent payout statement and supplier-cost view.

Phase-1 defaults at the architecture level:

- no listing fee;
- no supplier-connection installation fee;
- optional subscriptions, premium automation, paid apps, payout fees, and developer revenue share remain future commercial candidates;
- no percentage, fixed fee, reserve, or payout schedule is approved by this ADR.

Example format only, with no approved values:

```text
Customer product payment
- Sals3 commission
- allocated payment fee
- reserve/adjustments
= seller payable

Seller payable
- supplier cost paid separately from seller's provider account
= seller's estimated contribution
```

Sals3 recognizes estimated, pending, and final commission according to the approved settlement/refund policy. It does not label reserves, supplier spend, processing fees, or taxes as revenue.

## Required financial records

```text
FeeRuleVersion
SellerBalanceAccount
OrderLineLedger
CommissionEntry
PaymentFeeEntry
SupplierCostEntry
ReserveEntry
RefundEntry
ChargebackEntry
Payout
PayoutStatement
```

Each entry stores amount in integer minor units, ISO currency, calculation basis, responsible party, rule version, order/order-line, source event, state, and reversal linkage.

## CJ balance behavior

CJ currently documents:

- `GET /shopping/pay/getBalance` for the connected CJ account;
- `POST /shopping/pay/payBalance` and V2 for balance payment;
- order creation behavior where page payment returns `cjPayUrl`, balance payment deducts from the account, and create-only leaves the order unpaid.

Therefore:

- CJ balance is optional for connection, catalog browsing, shortlist, import, and synchronization.
- Sufficient balance is required when the seller selects automatic CJ balance payment.
- Page/manual payment can be an explicit fallback where supported; it is not silent auto-fulfillment.
- The real connected-account response and payment result are authoritative. Cached balance is advisory.

### Funding readiness

```text
READY
LOW_BALANCE
PAYMENT_REQUIRED
FUNDING_HOLD
UNKNOWN
```

Check funding readiness:

- after connection and reauthorization;
- on a bounded schedule;
- after supplier payments or payment failures;
- when a seller-defined/approved low-balance threshold is crossed;
- immediately before supplier-order payment;
- before reactivating funding-paused offers.

Do not invent a formula from `amount`, frozen amount, or bonus/non-withdrawable fields. Validate the actual CJ account response and payment result. A final balance/payment check occurs immediately before payment.

## Zero or insufficient balance

### Before a new customer order

For an offer that promises automatic fulfillment, no sufficient CJ balance and no verified payment fallback means:

```text
Offer: AUTO_PAUSED_SUPPLIER_FUNDING_REQUIRED
Checkout: BLOCKED
Attention: High/Critical by exposure
```

Show:

```text
Automatic fulfillment is unavailable.
Fund your CJ account before you accept new orders.
[Open CJ payment page] [View affected products]
```

The provider may return a payment URL for supported page-payment flows. Sals3 does not claim that it can automatically top up a provider wallet unless a separately verified and approved provider capability exists.

### After Sals3 accepted a customer order

```text
Customer Order: ACTIVE
Supplier Fulfillment: AWAITING_SUPPLIER_FUNDS
Affected Offers: FUNDING_HOLD
```

Required behavior:

1. preserve the immutable accepted order and price;
2. block new affected checkout;
3. create one Critical actionable attention issue;
4. attempt in-app, push, and email delivery;
5. show the exact supplier account, order, amount, deadline, and funding/payment action;
6. retry idempotently after funding or confirmed seller action;
7. if the deadline expires, start explicit customer communication and cancellation/refund handling;
8. never use another seller's wallet, silently reroute to another supplier, or retry without bounds.

Phase 1 does not let Sals3 advance supplier funds or secretly deduct supplier cost from a seller payout. Any future managed funding, prefunding, credit, automatic top-up, or payout-to-supplier product requires separate legal, accounting, risk, provider, and owner approval.

## Uninstall and disconnect

Uninstalling a Supplier App:

1. stops new sourcing and checkout for affected offers;
2. preserves catalog, order, ledger, snapshot, and audit history;
3. drains or explicitly exceptions committed active orders under ADR-007;
4. preserves submitted fulfillment and tracking access where possible;
5. revokes provider credentials when supported;
6. never cancels accepted orders or reroutes them silently.

## Security requirements

- Server-only encrypted credential references; no supplier token in client storage, logs, catalog records, or notifications.
- Fixed allow-listed callback and provider hosts; OAuth state/PKCE where supported.
- Declared scopes/capabilities and least privilege.
- Tenant ownership on every installation, connection, offer binding, order, webhook, and balance/payment action.
- Signed webhook verification, schema validation, idempotency, rate/QPS limits, no-store sensitive responses, retry bounds, circuit breaking, and audit.
- Provider/app kill switch that stops unsafe new effects while preserving active-order recovery.
- Paid app or subscription billing, if later approved, remains separate from supplier payment and marketplace commission.

## Acceptance tests

- Install CJ for Seller A and Seller B and prove their tokens, balances, catalogs, and orders are isolated.
- Connect CJ and a second verified provider to one Dropshipper account; bind each offer/order line to its exact connection.
- Prove Retailer accounts cannot install Supplier Apps.
- Prove installing/connecting a supplier never creates or controls a Sals3 seller payout.
- Record Sals3 commission from the customer-sale rail while the seller separately pays supplier cost through the seller-owned provider account.
- Split one customer checkout into provider fulfillment groups without mixing supplier payments or credentials.
- Browse/import CJ products with zero balance but block automatic fulfillment checkout when no verified payment path exists.
- Query current CJ balance before payment; handle stale cache, low balance, frozen/bonus fields, and payment rejection without false success.
- Create an unpaid supplier order, show `AWAITING_SUPPLIER_FUNDS`, send in-app/push/email attention, and recover idempotently after seller payment.
- Expire the funding deadline and enter customer communication/refund handling without rewriting the order snapshot.
- Prove Sals3 never advances supplier funds, uses another seller's wallet, or silently deducts supplier cost from payout.
- Uninstall/disconnect with active orders and preserve/drain committed fulfillment and tracking.
- Reject arbitrary plugin code, seller-controlled hosts/callbacks, undeclared capabilities, and cross-tenant webhooks.

## Official references checked 2026-08-07

- CJ Shopping order, balance, and payment APIs: <https://developers.cjdropshipping.com/en/api/api2/api/shopping.html>
- Shopify app authentication/authorization pattern: <https://shopify.dev/docs/apps/build/authentication-authorization>
- Shopify app distribution and approval models: <https://shopify.dev/docs/apps/launch/distribution>
- Stripe Connect marketplace application fees and payouts: <https://docs.stripe.com/connect/marketplace/essential-tasks>
- Adyen marketplace payment splitting and settlement: <https://docs.adyen.com/marketplaces/process-payments/>

These references prove capability patterns, not that a provider, country, commercial agreement, merchant-of-record model, fee value, or AliExpress integration is approved for Sals3. Reverify before implementation.

## Consequences

Benefits:

- Shopify-like installation UX without unsafe arbitrary plugins;
- strict ownership of every seller's supplier account and wallet;
- unambiguous separation of supplier spend, Sals3 revenue, and seller payout;
- no dependency on CJ to pay Sals3 sellers;
- funding failures become visible and recoverable instead of silent fulfillment failures;
- provider expansion stays behind one reviewed capability/adapter contract.

Costs:

- marketplace payment onboarding, ledger, commission, payout, refund, and reconciliation infrastructure remain required;
- supplier balance/payment behavior differs by provider and must be implemented by capability;
- automatic fulfillment requires funding-readiness monitoring and exception operations;
- a true third-party app marketplace is intentionally deferred.

These costs are accepted because mixing supplier payment with customer settlement would produce incorrect payouts, unsafe cross-tenant access, and unfulfilled paid orders.
