---
tags: [sals3, adr, admin-portal, governance, platform-controls, audit]
aliases: [Sals3 Admin Portal, Platform Control Plane, Global Platform Governance]
created: 2026-08-10
updated: 2026-08-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[hot]]"
  - "[[sals3-ux-build-specification]]"
  - "[[agent-operating-contract]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
---

# ADR-014 — Admin Portal platform governance and global controls

## Status

`approved`

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved the future product boundary and the name **Admin Portal** on 2026-08-10. This ADR does not authorize implementation now. Current work remains focused on correcting `sals3-portal`; the Admin Portal starts only through a separately approved implementation slice.

## Problem

Sals3 needs one trusted internal surface to govern platform-wide decisions that must apply consistently across the Seller Portal and customer website. These decisions cannot live as scattered frontend constants, seller-editable fields, or client-side switches.

Examples include deciding which countries may host authorized sellers, which countries may receive buyer purchases/deliveries, suspending a seller account, disabling a supplier/provider during an incident, and publishing platform-wide marketing. Seller operating-country eligibility and buyer destination-country eligibility are different policy dimensions: enabling one must never imply the other. Without a separate authority, Portal and website behavior can drift, high-impact actions can bypass review, and historical decisions become difficult to explain or audit.

The Seller Portal is tenant-facing. A seller must never gain the authority to change global market policy, platform campaigns, another seller's status, or platform-wide provider availability.

## Evidence

- Current `sals3-portal` candidate ingestion and evaluation still contain labelled Philippine market placeholders. The owner identified Australia as Sals3's business/seller operating country, but explicitly clarified that countries allowed to sell and countries allowed to buy/receive delivery must be governed separately. No buyer destination-country allowlist is approved merely by the Australian registration decision.
- `sals3-portal` has seller authentication and tenant-owned Supplier Connections, but no secure employee administration system.
- `hot.md` already lists secure employee administration as unimplemented.
- ADR-003 requires explicitly enabled markets rather than an unverified worldwide claim.
- ADR-007 and ADR-010 require audited, explainable system actions and preservation of history.
- Product Catalogue, finance, orders, payouts, and global marketing backends are not yet complete; the Admin Portal must not claim control over features that do not exist.

## Options considered

### Option A — Put global controls in the Seller Portal

This reuses an existing app, but it blurs employee/platform authority with tenant authority. It increases broken-authorization risk and makes it easier for a seller-facing route or role to acquire global privileges accidentally.

### Option B — Hard-code platform settings in Portal and website deployments

This is initially fast, but changes require code deployment, values can drift between repositories, and there is no reliable actor, reason, schedule, approval, or rollback history.

### Option C — Separate Admin Portal with a published control-plane boundary

This adds a future internal surface and security boundary, but provides one platform authority that Portal and website can consume through versioned, audited published state. This is the approved direction.

## Strongest objection

A separate Admin Portal can become premature enterprise infrastructure while the canonical Product/Variant/Offer model, publication, checkout, orders, and fulfillment are still unfinished. Building a broad internal console now would consume time without real downstream systems to govern.

The objection is valid. The Admin Portal is therefore **approved but deferred**. Current Portal work may introduce narrow server-side resolver/provider boundaries so future published Admin Portal policy can replace temporary configuration without a rewrite, but must not build fake admin screens or global mutations now.

## Decision

Sals3 will call the future internal platform-governance product **Admin Portal**.

It will be separate from seller accounts and the Seller Portal. It will become the authoritative control plane for approved platform-wide capabilities, while operational domain services remain responsible for enforcing published decisions server-side.

### Initial capability domains

1. **Market governance**
   - independently enable, disable, schedule, and version **seller operating-country eligibility**: where a seller/business may be registered, verified, and authorized to operate on Sals3;
   - independently enable, disable, schedule, and version **buyer destination-country eligibility**: where customers may purchase and receive delivery;
   - publish both through separate typed policies/allowlists with separate versions, effective periods, reasons, and audit trails; never collapse them into one ambiguous `marketCode` or infer one list from the other;
   - preserve the distinction between a platform-level country permission and future seller-specific access, product/offer eligibility, and destination-specific evidence;
   - Australia (`AU`) is the owner-stated current business/seller operating country. This does not automatically enable AU or any other buyer destination;
   - globally enabling a buyer destination only permits evaluation for that country. A product/offer still requires destination-specific freight, restrictions, compliance, and other required evidence before becoming Ready or sellable;
   - supplier stock-origin countries such as `CN` or `US` remain evidence only and never grant seller or buyer-country eligibility;
   - currency, locale, and timezone are explicit configuration dimensions and must not be used as proxies for either country policy.

2. **Seller-account governance**
   - review, suspend, disable, and restore a seller account through explicit lifecycle states;
   - require a reason, affected scope, actor, time, and recovery path;
   - block future protected activity consistently without deleting products, evidence, audit history, or accepted orders;
   - never use a client-hidden button as enforcement.

3. **Global marketing and communications**
   - create versioned, scheduled platform campaigns, banners, announcements, and seller messages;
   - separate editorial content from targeting, eligibility, placement, schedule, and approval;
   - prevent unpublished, expired, unapproved, or market-inapplicable content from appearing;
   - never fabricate prices, discounts, scarcity, sales, reviews, or qualification claims.

4. **Supplier/provider governance**
   - enable or disable an approved provider integration globally;
   - provide an audited incident kill switch that protects future supplier calls/sales at the smallest affected scope;
   - preserve seller-owned Supplier Connections and historical evidence rather than deleting them;
   - never expose supplier credentials to Admin Portal clients.

5. **Policy publication and operational oversight**
   - publish versioned policy records rather than silently changing code constants;
   - expose decision/audit/exception visibility appropriate to employee roles;
   - support rollback to the last valid published version without rewriting historical decisions.

### Authority and enforcement boundary

```text
Admin Portal employee action
  -> authenticated and authorized server command
  -> validation + reason + step-up/approval where required
  -> versioned decision and immutable audit event
  -> published control-plane state/event
  -> Seller Portal and website domain services enforce server-side
```

The Admin Portal does not directly trust or mutate browser state in the Seller Portal or website. Each consuming domain validates the current published policy and enforces it on its own protected server path.

### Required security posture

- real employee identity, separate from seller identity;
- least-privilege roles and explicit permissions by capability and scope;
- deny-by-default server-side authorization on every read and mutation;
- step-up authentication and confirmation for high-impact actions;
- two-person approval where risk, law, finance, or blast radius justifies it;
- immutable audit containing actor, reason, before/after state, scope, correlation ID, and time;
- optimistic concurrency/idempotency for commands and publication;
- no provider secrets, access tokens, database credentials, or unnecessary seller personal data in client payloads or logs;
- safe session revocation and immediate enforcement for suspended/disabled accounts;
- rate limiting, CSRF protection, generic production errors, and no public caching for sensitive surfaces.

### Explicitly deferred

- Admin Portal UI, routes, repository, deployment, or employee-auth implementation;
- final role matrix and approval thresholds;
- seller suspension legal/appeal policy;
- global marketing attribution/experimentation backend;
- AU tax, payment, pricing, freight, returns, and regulatory rules;
- cross-repository event transport choice;
- any claim that Portal or website already consume Admin Portal state.

## System impact

- Data and schema: future employee identities/roles, global policy versions, seller-governance decisions, campaign publications, provider controls, audit/outbox events, and consumer checkpoints. No schema is authorized by this ADR alone.
- Modules: future Admin Portal plus narrow published-policy consumers in `sals3-portal` and `sals3-ecommerce`.
- User workflow: sellers continue to use Seller Portal; authorized Sals3 employees use Admin Portal. Seller-visible consequences must explain the status and recovery path without exposing sensitive internal details.
- Financial or compliance effect: global actions can affect many sellers/customers, so approval, audit, rollback, and smallest-scope enforcement are launch gates.
- Migration and rollback: replace temporary Portal constants through provider/resolver boundaries one domain at a time. Rollback republishes a prior valid policy; it never rewrites audit, candidate, listing, or accepted-order history.

## Required verification

- Focused tests:
  - every command denies missing/wrong employee permissions;
  - seller identities cannot access Admin Portal capabilities;
  - seller suspension/restore is idempotent and enforced server-side;
  - market/provider/campaign publication respects version, effective time, concurrency, and rollback;
  - client requests cannot choose actor, tenant, policy version, or protected scope without server validation.
- Full or cross-module tests:
  - Portal and website agree on one published version;
  - seller operating-country and buyer destination-country publications remain independently versioned and neither can populate or enable the other;
  - seller registration, supplier stock origin, currency, locale, or timezone cannot make a product destination-ready;
  - disabling a seller/provider blocks future protected actions at the required scope while history remains readable;
  - stale consumers fail safe and reconcile without duplicated actions;
  - audit/action counts reconcile and no global side effect lacks an authoritative decision.
- Manual acceptance:
  - employee roles see only authorized controls;
  - high-impact actions show scope, consequence, reason, approval, and recovery before confirmation;
  - seller-facing states are clear on desktop/mobile without exposing internal security data.
- Security review:
  - broken authentication/authorization, IDOR, CSRF, injection, open redirects, session revocation, sensitive-data exposure, audit tampering, and privilege escalation.

## Supersession

None. This ADR names and bounds the future Admin Portal. It does not supersede ADR-003, ADR-006, ADR-007, or ADR-010; their market, tenancy, immutable-history, and decision-governance rules remain controlling.
