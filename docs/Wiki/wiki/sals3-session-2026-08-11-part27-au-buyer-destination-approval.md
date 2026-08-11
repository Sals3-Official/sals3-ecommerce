---
tags: [sals3, session, market, australia, buyer-destination, product-readiness]
aliases: [AU Buyer Destination Approval, Australia Buyer Market Decision]
created: 2026-08-11
updated: 2026-08-11
status: approved
authority: owner-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-session-2026-08-10-part26-portal-au-market-hardcode-remediation]]"
---

# 2026-08-11 — AU buyer destination approval

## Owner decision

Bogs approved Australia (`AU`) as the initial country where buyers may purchase and receive delivery.

This is separate from Sals3's Australian business/seller registration even though both initial values are `AU`:

```text
seller operating-country eligibility: ['AU']
buyer destination-country eligibility: ['AU']
supplier stock origin: independent evidence such as CN/US
display/checkout/accounting currency: separate policies
```

Future Admin Portal market governance will publish and control the seller-operating and buyer-destination allowlists independently, with separate versions, effective periods, reasons, and audit history. It must never infer one from the other or rewrite a merchant's historical/legal registration record.

## What this approval permits

- Replace the temporary disabled/empty Portal buyer-destination resolver with an explicitly enabled, separately versioned `['AU']` policy through a reviewed code change.
- Evaluate candidates and product/offer eligibility for AU scope.
- Design and implement AU-specific freight, restriction, compliance, and landed-contribution evidence in later approved slices.

## What this approval does not prove

- that a supplier stock origin can ship to Australia;
- nationwide delivery or coverage of metro, regional, and remote postcodes;
- an exact freight method, amount, delivery estimate, quote lifetime, or checkout authorization;
- category/product legality, permits, media rights, mapping completeness, or pricing viability;
- checkout/display/accounting currency;
- `Ready`, publication, storefront availability, or permission to sell a particular product.

Until required AU evidence and gates exist, destination approval is an evaluation scope—not a successful readiness decision.

## Current implementation gap

At approval time, the uncommitted `sals3-portal` country-policy branch still returns a disabled buyer-destination policy with an empty allowlist. A follow-up implementation/review must enable `AU`, bump the buyer policy version/source, update tests/audit expectations, preserve historical PH rows, and verify that destination approval alone does not bypass freight or other gates.
