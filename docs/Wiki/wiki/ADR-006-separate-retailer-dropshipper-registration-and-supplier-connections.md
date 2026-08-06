---
tags: [adr, seller, registration, dropshipping, supplier-connections, multi-tenant, sals3]
aliases: [Seller Business Model Registration, Dropshipper Supplier Connections, Supplier Provider Architecture]
created: 2026-08-07
updated: 2026-08-07
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-global-seller-center-ux-blueprint-proposal]]"
  - "[[sals3-implementation-phases]]"
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
---

# ADR-006: Separate Retailer and Dropshipper registration with supplier connections

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved this architecture on 2026-08-07. It supersedes the earlier suggestion that one login could switch between Retailer and Dropshipper organizations. No signup, authentication, supplier-connection persistence, credential vault, provider registry, or multi-provider UI is implemented yet.

## Problem

The current `sals3-portal` CJ integration is a single-account prototype:

- one global server environment variable, `CJ_API_KEY`;
- one shared in-memory CJ token cache;
- one fixed CJ base URL and CJ-specific service;
- `/products` directly renders `CjCatalogueView` and CJ-specific copy;
- the development session returns `userId=dev-user` and `sellerId=seller-001`;
- no real registration, authentication, tenant, `SupplierConnection`, encrypted per-account credential, or provider selector exists.

That implementation is valid discovery work by Aj, but it cannot safely serve independent Dropshipper accounts. If reused unchanged, every seller would operate through the same CJ account and supplier authority.

## Decision summary

1. Retailer and Dropshipper use completely separate registrations and accounts.
2. One seller account has exactly one immutable business model: `RETAILER` or `DROPSHIPPER`.
3. A person or business that wants both models must create two separate accounts and complete both registrations. Phase 1 has no shared login, organization switcher, or automatic conversion.
4. A Retailer account manages its own products, inventory, warehouse/shipping setup, and orders. It does not see Supplier Connections by default.
5. A Dropshipper account can connect one or more Sals3-approved supplier providers and can source only through active connections it owns.
6. Sals3 itself uses the same model. Its existing CJ credential becomes a connection owned by a separate **Sals3 Official Dropshipper Account**, not a global platform credential. A future Sals3 retail operation requires a separate Retailer account.
7. CJ is the first provider adapter. Aj's current code is preserved and moved behind the generic provider boundary.
8. Shopify is neither an active Sals3 implementation path nor a dropshipping supplier. Do not show it in Supplier Connections. A future Shopify-store integration, if separately approved, belongs to Sales Channels.

## Registration contracts

Entry page:

```text
Become a Seller
  -> Register as a Retailer
  -> Register as a Dropshipper
```

Initial route contract:

```text
/seller/register/retailer
/seller/register/dropshipper
```

### Retailer registration

1. Account and contact information
2. Business/legal information
3. Store identity
4. Identity/business verification
5. Payout setup
6. Warehouse or pickup address
7. Shipping setup
8. Review and activation

Retailer Seller Center capabilities include My Products, Add Product, Inventory, Orders, Shipping, Returns, Finances, and Payouts.

### Dropshipper registration

1. Account and contact information
2. Business/legal information
3. Store identity
4. Identity/business verification
5. Payout setup
6. Intended enabled markets
7. Supplier setup
8. Sourcing/auto-publication policy acknowledgement
9. Review and activation

Dropshipper Seller Center capabilities include Supplier Connections, Product Sourcing, Imported Products, Needs Attention, Supplier Orders, Sync Status, Market Rules, Finances, and Payouts.

A verified Dropshipper may enter Seller Center without a connected supplier, but cannot source, import, or route supplier orders until at least one connection is healthy.

## Account invariant

```text
SellerAccount
- id
- businessModel: RETAILER | DROPSHIPPER
- sellerOrganizationId
- verificationState
- accountState
```

- `businessModel` is immutable after account creation.
- Do not implement a Retailer/Dropshipper toggle.
- Do not implement an account or organization switcher between business models in phase 1.
- Do not share products, inventory, supplier connections, order routing, or financial ledgers between separate accounts.
- A business-model change requires a new registration or a future explicitly designed, audited migration. It is not a profile edit.
- Authentication, sessions, authorization, and every resource key carry `sellerAccountId`/tenant scope.

The registration business model and per-offer fulfillment mode are separate facts. The former controls onboarding, entitlements, and operating model. The latter records how a specific offer is physically fulfilled and remains required for truthful order routing.

## Sals3-owned seller accounts

Initial first-party setup:

```text
Sals3 Official Dropshipper Account
  -> businessModel: DROPSHIPPER
  -> Supplier Connection: CJdropshipping
```

Do not grant platform-administrator authority merely because the seller is Sals3-owned. Platform administration and seller ownership remain separate permissions. If Sals3 later sells owned inventory, create a separate **Sals3 Official Retailer Account** with its own registration, inventory, orders, and ledger scope.

## Supplier Connections experience

Navigation for a Dropshipper account:

```text
Product Sourcing
  -> Supplier Connections
  -> Connected Catalogs
  -> Shortlisted
  -> Exception Queue
```

Empty state when no healthy connection exists:

```text
No supplier connected

Connect a supplier to find products and fulfill orders.

[Connect a supplier]
```

The button opens a registry of Sals3-approved providers only. Sellers cannot enter arbitrary provider base URLs, callback URLs, or adapter code.

Seller-facing navigation may present this registry as **Apps & Integrations -> Supplier Apps**, using a Shopify-like install/authorize/scopes experience. Shopify remains only an UX/authorization reference and is not a Supplier App. Phase 1 adapters are curated and operated by Sals3; an open third-party app marketplace is deferred under ADR-008.

Connection flow:

1. Select an approved provider.
2. Create or sign in to an account with that provider outside Sals3 when required.
3. Complete provider-specific OAuth/authorization or submit a credential through a protected server flow.
4. Sals3 validates the callback/state or credential, exchanges tokens when applicable, and tests the provider account.
5. Store only an encrypted credential reference plus non-secret account metadata.
6. Record granted capabilities, expiry, verification time, terms/policy version, and audit event.
7. Run an initial bounded catalog/account sync.
8. Mark the connection `CONNECTED` only after the server test succeeds.

Connection lifecycle:

```text
NOT_CONNECTED
AUTHORIZING
CONNECTED
DEGRADED
REAUTH_REQUIRED
DISCONNECTED
REVOKED
```

Phase 1 permits at most one connection per provider per Dropshipper account, while allowing multiple different approved providers. Expanding to multiple accounts for the same provider requires a later explicit need and new routing UX.

## Provider architecture

```text
SupplierProvider
- id
- code
- displayName
- providerType
- authenticationMode
- enabledState
- capabilities
- policyVersion

SupplierConnection
- id
- sellerAccountId
- supplierProviderId
- externalAccountId
- status
- encryptedCredentialReference
- grantedCapabilities
- tokenExpiresAt
- lastVerifiedAt
- lastSuccessfulSyncAt
- createdAt / createdBy
```

Adapter contract:

```text
SupplierProviderAdapter
- authorize or connect
- testConnection
- refreshCredentials
- disconnect
- listProducts
- getProduct
- getVariants
- getInventory
- calculateFreight
- createOrder
- getOrder
- getTracking
- register/process webhooks when supported
```

Capabilities are declared per provider. Do not pretend every provider supports the same catalog, inventory, freight, order, cancellation, tracking, or webhook behavior.

## Product and offer identity correction

Provider-level product identity is separate from a seller's connection and fulfillment authority:

```text
ProviderProductReference
- id
- supplierProviderId
- externalProductId
- sourceStatus
- lastObservedAt

ProviderVariantReference
- id
- providerProductReferenceId
- externalVariantId
- externalSku

OfferSupplierBinding
- id
- offerId
- supplierConnectionId
- providerVariantReferenceId
- connectionSpecificStatus
- lastObservedCost
- lastObservedInventory
- lastObservedAt
```

Constraints:

- `ProviderProductReference` is unique on `(supplierProviderId, externalProductId)`.
- `ProviderVariantReference` is unique on `(providerProductReferenceId, externalVariantId)`.
- Phase-1 `SupplierConnection` is unique on `(sellerAccountId, supplierProviderId)`.
- A supplier-dropship Offer has exactly one active `OfferSupplierBinding`.
- Product/variant references never contain credentials.
- Order routing resolves the exact `OfferSupplierBinding`; it never chooses another provider silently.

This replaces treating `(supplier, externalProductId)` as sufficient fulfillment authority. Two Dropshipper accounts may source the same global provider product while using separate credentials, wallets, orders, and account-specific availability.

## CJ migration from Aj's implementation

Current:

```text
/products
  -> CjCatalogueView
  -> CJ-specific service
  -> global CJ_API_KEY
```

Target:

```text
/sourcing
  -> authenticated Dropshipper account
  -> active SupplierConnection
  -> Supplier Provider Registry
  -> CJ adapter
```

Migration order:

1. Wrap existing CJ token/list/detail behavior behind `CjSupplierAdapter`; preserve verified search, pagination, rate-limit, cache, schema-validation, and error behavior.
2. Create the Sals3 Official Dropshipper account.
3. Migrate the current `CJ_API_KEY` into its encrypted CJ `SupplierConnection`; environment configuration may be used for a one-time bootstrap only, not normal multi-tenant runtime lookup.
4. Replace CJ-specific page ownership with Product Sourcing driven by the authenticated account and selected connection.
5. Keep CJ-specific UI inside its provider adapter/view boundary. Generic pages consume provider contracts and capability flags.
6. Bind candidates, imports, offers, supplier orders, synchronization, rate/points accounting, and webhooks to `supplierConnectionId`.
7. Prove a seller cannot read, use, refresh, disconnect, or spend through another seller's connection.

## Provider rollout

### Approved first provider

- **CJdropshipping** — first adapter and migration target. CJ documents API-key token exchange and backend-only token storage. Its API index also lists authorize-URL and access-token-exchange endpoints, but the production account flow must be verified before Sals3 promises one-click OAuth.

### Candidate providers; not enabled by this ADR

- **Printful** — strong technical candidate for print-on-demand. Official documentation supports public-app OAuth for multi-merchant platforms, catalog/order operations, and webhooks. POD products require a separate design/mockup workflow.
- **Printify** — technical POD candidate. Official documentation supports OAuth 2.0 or personal access tokens, products, merchant shops, orders, and webhooks.
- **BigBuy** — general dropshipping candidate with catalog, order, shipping-cost, and tracking APIs. Its Europe focus, commercial/API plan, target-market freight, customs, returns, and margin require evaluation.
- **Syncee** — business candidate only. Current public material describes its marketplace and supported platform integrations, but a custom Sals3 retailer integration may require commercial enablement or partnership. Do not show it as connectable until a real contract and end-to-end API path are verified.

Adding a provider requires an approved capability/economics/compliance review, adapter contract tests, sandbox or test-account evidence, order and refund recovery, credential revocation, and an operational owner. A logo card alone is not an integration.

## Disconnect and failure behavior

Disconnecting or revoking a provider connection:

- stops new sourcing/imports and supplier-order creation;
- pauses affected supplier-backed offers or marks them Action Required under current policy;
- does not delete Product, Variant, Offer, Order, evidence, snapshot, or audit history;
- does not silently reroute an existing order or offer to another provider;
- attempts provider-side token revocation when supported;
- clears active local tokens/credential references under the secret-retention policy;
- preserves non-secret identifiers needed for reconciliation and dispute history.

Normal seller-requested disconnect must also honor committed active orders: stop new sales/sourcing, preserve submitted fulfillment and tracking access, drain recoverable pre-disconnect `SupplierOrderIntent` work, and show the seller the affected active-order count. Emergency security revocation may stop access immediately but must create Critical fulfillment exceptions. See ADR-007.

## Security requirements

- Credentials and refresh tokens are never stored in browser storage, client components, logs, Product, Variant, or public catalog records.
- API keys that must be reused require encrypted secret storage; hashing alone is insufficient because the server must present the credential upstream.
- OAuth-style flows use server-generated, expiring, single-use state and PKCE where the provider supports/requires it.
- Callback destinations are fixed allow-listed routes; sellers cannot supply redirect destinations.
- Every connection mutation requires real authentication, seller-account ownership, permission, CSRF protection where applicable, rate limiting, idempotency, no-store responses, and audit.
- Provider hosts, redirects, webhook secrets/signatures, response schemas, timeouts, QPS/points, retries, and circuit breaking are enforced per adapter/connection.
- A connection's credential cannot authorize another seller account, even when both use the same provider product.

## Acceptance tests

- Register a Retailer account and prove Supplier Connections/Product Sourcing are unavailable.
- Register a Dropshipper account and prove Retailer inventory onboarding is not substituted for supplier setup.
- Prove `businessModel` cannot be changed through profile or client input.
- Prove a second business model requires a separate account/registration and no phase-1 account switcher exists.
- Create the Sals3 Official Dropshipper account without granting seller sessions platform-admin authority.
- Connect, validate, refresh/re-authorize, degrade, disconnect, and revoke a provider connection.
- Reject invalid credentials without storing them or leaking upstream detail.
- Prove cross-account connection access and order routing are denied.
- Connect two different providers to one Dropshipper account and route each offer/order through its exact binding.
- Reject a second same-provider connection in phase 1.
- Show the no-connection empty state and disable sourcing/import until a connection is healthy.
- Preserve Aj's verified CJ search, pagination, caching, validation, and rate-limit behavior behind the adapter.
- Migrate the Sals3 CJ credential without exposing it to the browser or another seller.
- Disconnect a provider and pause affected offers without deleting catalog/order/audit history.
- Prove no automatic rerouting occurs.

## External references checked 2026-08-07

- CJ authentication: <https://developers.cjdropshipping.com/en/api/api2/api/auth.html>
- CJ API v2 interface list: <https://developers.cjdropshipping.com/en/api/api2/>
- Printful API/OAuth/orders/webhooks: <https://developers.printful.com/docs/>
- Printify API: <https://developers.printify.com/>
- BigBuy API: <https://www.bigbuy.eu/en/api_bigbuy.html>
- Syncee marketplace: <https://www.syncee.com/>
- Syncee custom-platform supplier webhook note: <https://help.syncee.com/en/articles/12960517-order-synchronization-for-custom-platforms-as-a-supplier>

External documentation proves capability shapes, not commercial access, supported Sals3 markets, profitability, legal suitability, or production approval. Reverify before implementation.

## Consequences

Benefits:

- strict business-model and tenant isolation;
- no global CJ credential shared across sellers;
- Aj's work remains useful as the first adapter;
- additional providers can be added without rewriting Seller Center;
- exact offer-to-provider routing and recoverable disconnect behavior.

Costs:

- real authentication, separate registrations, tenant enforcement, encrypted credential storage, provider adapters, connection lifecycle, and order routing must exist before third-party Dropshipper onboarding;
- every provider adds commercial, security, compliance, support, reconciliation, and test obligations;
- separate accounts intentionally duplicate onboarding when one business operates both models.

This added work is accepted because mixing business models or supplier authority inside one account would create larger security, accounting, inventory, and fulfillment errors.
