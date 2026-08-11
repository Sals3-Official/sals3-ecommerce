---
tags: [sals3, session, admin-portal, governance, control-plane, rbac, audit, ux]
aliases: [Admin Portal Control Tower Direction, Sals3 Portal in Steroids]
created: 2026-08-11
updated: 2026-08-11
status: session-note
authority: owner-direction-record
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
---

# Sals3 session 2026-08-11, part 32 — Admin Portal as ecosystem control tower

## Status

The owner confirmed the future **Sals3 Admin Portal** is the ecosystem-level “god mode” control plane. This does **not** mean every employee has god-mode access. The platform has global capabilities; each employee is limited by role, permission, scope, approval requirement, step-up authentication, and an immutable audit trail.

The GitHub repository now exists at <https://github.com/Sals3-Official/sals3-admin-portal>. It is public, has `develop` as default branch, has Issues/Projects enabled, has Wiki/Discussions/Pages disabled, and contains only an initial README baseline. No Admin Portal application, employee auth, schema, API, UI, migration, deployment, or live integration exists yet.

This records an owner-approved expansion/clarification of the product direction in [[ADR-014-admin-portal-platform-governance-and-global-controls]]. It does not authorize an unbounded one-pass implementation or change existing Seller Portal tenancy boundaries.

## Product identity

```text
Seller Portal = one merchant’s operating workspace
Admin Portal  = platform-wide visibility, policy, incident response, and controlled intervention
Storefront    = customer experience consuming only server-enforced published state
```

The Admin Portal must feel like **“Sals3 Portal in steroids”**:

- same recognizable Sals3 information architecture and interaction language;
- same style of left navigation, workspace header, filters, operational tables, detail views, status chips, timelines, forms, confirmations, and responsive behavior;
- the same Portal layout, component system, spacing, typography, and interaction patterns, with only a distinct internal-admin color theme and persistent `Admin Portal` identity;
- a global context/scope bar that makes `All ecosystem`, selected seller, selected market, selected provider, and time range explicit;
- a visible support-context banner whenever an employee inspects/acts within a specific seller scope;
- no copy-pasted seller UI and no fabricated live dashboard totals.

The distinctive Admin UX element is a **scope bar**: each sensitive action must state whether its impact is one seller, one country/market, one provider, one listing group, or the full platform before it can proceed.

## Global domains the Admin Portal must eventually govern

1. **Operations overview** — ecosystem health, incidents, jobs/queues, provider health, alerts.
2. **Seller accounts** — global search, lifecycle, verification, support context, suspension/restore and recovery.
3. **Customers** — privacy-protected global lookup, support/risk/privacy workflows; no casual PII access.
4. **Catalogue and listings** — global catalogue/listing visibility, taxonomy, moderation, product policy, recalls/takedowns, data quality.
5. **Orders and after-sales** — global order operations, fulfillment exceptions, cancellation, refunds, replacements, returns, disputes, and chargebacks.
6. **Inventory and suppliers** — warehouse/stock health, oversell risk, provider health, supplier incidents, global kill switches.
7. **Logistics** — globally available providers/methods, country/region restrictions, delivery policy, service outages. Actual seller/customer choices remain subject to valid supplier evidence and quote.
8. **Payments and finance** — globally enabled payment rails/currencies, provider webhook health, platform fees/commissions, global ledger/reconciliation, settlements/payouts/refunds/chargebacks. Accepted historical financial records must never be silently rewritten.
9. **Markets and compliance** — seller-operating countries and buyer destination countries as separate policies; currency/locale/timezone, tax/duty/disclosures, restricted products, KYC/risk/privacy/legal holds when supported.
10. **Platform pricing governance** — reference-FX integrity, real platform costs, enabled capabilities, publication/fraud/loss guardrails.
11. **Communications** — global campaigns, announcements, seller messages, templates, targeting/approval, delivery health.
12. **Employee access** — employee identities, roles/scopes, approval policies, step-up, session revocation, break-glass access.
13. **System governance** — feature flags, integration/API/webhook health, policy publication, audit explorer, exports, retention/privacy operations, maintenance/release controls.

Not every future menu item should be implemented before its source domain exists. “Global orders”, “global finance”, and “global listings” must remain explicitly unavailable until their authoritative source, authorization, audit, and reconciliation contracts exist.

## Authority model

```text
Admin Portal has the platform capability
  -> employee role grants capability subset
  -> scope limits target entities/actions
  -> action may be view / propose / approve / execute / reverse
  -> high-impact execution needs step-up and, where configured, two-person approval
  -> server command writes immutable audit + versioned/published state
  -> consuming services enforce on their own protected server paths
```

Suggested role families are Support, Catalogue & Compliance, Finance Operations, Logistics/Supplier Operations, Risk & Trust, Platform Administrator, and time-bound Break-glass Super Admin. These names are not a final permission matrix. The final matrix must grant actions, not broad screen access.

### Controlled seller access

Platform staff need direct operational access to a seller scope, but this is **not** silent impersonation and never credential access.

- read-only inspection versus write/action scope must be distinct;
- employee records reason, seller scope, and permitted operation;
- sensitive support access is time-bound and visibly labelled;
- every access/action is auditable with actor, target, scope, time, reason, correlation ID, before/after state, and approval where required;
- seller passwords, CJ access tokens/openIDs, payment credentials, webhook secrets, database credentials, and unredacted supplier payloads remain server-only;
- finance, compliance, and destructive actions do not lose their required approval simply because the employee entered seller-support context.

## Explicit commercial boundary

Admin Portal has platform-wide financial governance, but it must not erase seller ownership.

| Admin Portal owns | Seller Portal owns |
| --- | --- |
| reference-FX provider/rate integrity and freshness | category-first target margin |
| real Sals3 fees/commissions/platform payment costs | product-specific margin override |
| enabled payment rails, currencies, logistics capabilities | exceptional variant margin override |
| legal/safety/publication/fraud/loss guardrails | merchant FX adjustment/funding buffer |
| global finance ledger/reconciliation/settlement controls | merchant commercial and category PIC decisions |

The Sals3 Official Dropshipper remains a seller tenant under this boundary. Platform controls validate and can block unsafe/illegal behavior, but ordinary merchant pricing is not a hidden Admin Portal edit.

## Required non-negotiable safeguards

1. Deny by default on every server read/write; seller identities cannot access Admin Portal routes/actions.
2. No cross-tenant IDOR or browser-supplied target/actor/policy/price authority.
3. Every consequential action has scope, reason, actor, before/after, time, correlation ID, and immutable audit history.
4. Versioned policy publication and rollback; never rewrite accepted orders, settled finance, supplier evidence, or prior audit history.
5. Step-up confirmation and two-person approval for high-blast-radius, financial, legal, or irreversible actions.
6. No secret/credential/PII overexposure in UI, URLs, analytics, or logs.
7. No fake global KPIs or placeholder “live” data.
8. Global country controls keep seller-operating-country eligibility separate from buyer destination eligibility.
9. Global logistics availability does not claim a product can ship; supplier/warehouse/destination/quote evidence remains required.
10. Payment-method configuration is a platform capability; it does not authorize unverified payments, taxes, payout, or order mutation.

## Recommended delivery sequence

### Gate 0 — architecture and dependency audit

Before code, inspect `sals3-portal` and `sals3-ecommerce`; determine authoritative sources, cross-repository boundary strategy, employee identity source, first permissions matrix, audit design, migration ownership, event/publication mechanism, rollback, and what is still unavailable. Owner/AJ confirmation is required before shared data access or schema work.

### First credible slice after approval

1. Admin repository bootstrap aligned to supported Sals3 stack and quality rules.
2. Employee-only, deny-by-default authentication/authorization boundary.
3. Familiar Admin shell, distinct theme, global scope bar, audit contract, and truthful empty/unavailable states.
4. One authoritative global domain end-to-end: versioned market governance or provider incident control, including server enforcement, audit, publish, rollback, and consumer contract tests.
5. Read-only global/seller drill-down only where real backing data and authorization exist.

Then build global domains one at a time: seller lifecycle/support, catalogue moderation, providers/logistics, orders/after-sales, payments/finance, communications, risk/compliance, and platform integrations.

## No implementation claim

The repository setup is complete. The Admin Portal product itself remains `not-started`. No live provider, payment, logistics, database migration, deployment, or cross-repository data contract was created from this decision.
