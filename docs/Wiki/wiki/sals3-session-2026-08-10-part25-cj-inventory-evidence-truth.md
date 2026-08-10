---
tags: [sals3, session, sals3-portal, cj, inventory, adr-013]
aliases: [CJ Inventory Evidence Truth]
created: 2026-08-10
updated: 2026-08-10
status: session-note
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-10-part24-candidate-pipeline-retry-correctness]]"
---

# Sals3 session 2026-08-10, part 25 — CJ inventory evidence truth and stocked-origin terminology

`sals3-portal` branch `codex/cj-inventory-evidence-truth`, off `develop` after PR #23 merged. Committed, pushed, and merged as [sals3-portal PR #24](https://github.com/Sals3-Official/sals3-portal/pull/24).

## 1. Problem

Two real defects in the CJ evidence layer, named by ADR-013:

1. The CJ parsing layer read `totalInventory`, `cjInventory`, and `factoryInventory` per variant/origin but collapsed them to a bare summed `totalInventory`, and silently stripped `verifiedWarehouse` because the Zod schema never declared the field — confirmed live: a real captured CJ response already contained `verifiedWarehouse: 2`, discarded at the boundary.
2. `checkShippingRoute()`/`NO_SHIPPING_ROUTE` only proved that some observed origin had stock. It never called destination freight, so its name and copy overstated what was actually proven.

## 2. What was implemented

- **Preserved raw evidence per exact variant/origin**: each variant's `stockByOrigin[]` now carries `countryCode`/`cjInventory`/`factoryInventory`/`totalInventory`/`verifiedWarehouse` (`VERIFIED | UNVERIFIED | UNKNOWN`, parsed only from CJ's literal `1`/`2`, never guessed from quantity or country), joined by `vid`. `totalInventory` stays as a derived convenience sum.
- **New pure `deriveStockEvidence()`** (`lib/cj/stock-evidence.ts`) → `CJ_WAREHOUSE_STOCK | FACTORY_BACKED_STOCK | MIXED_STOCK | ZERO_STOCK | UNKNOWN_STOCK`, kept deliberately separate from qualification decision logic — factory-backed/unverified stock is evidence, not an automatic pass or permanent block.
- **Renamed the misleading rule**: `checkShippingRoute`/`NO_SHIPPING_ROUTE` → `checkStockedOrigin`/`NO_STOCKED_ORIGIN`. The new copy says only that no observed origin currently has stock — never that a freight route was checked or confirmed. The legacy code stays valid so historical rows remain readable; no code path writes it anymore.
- **UI**: the real Ready/Needs Attention table's "Shipping origins" column is now "Stocked origins"; the evidence drawer shows the derived stock-evidence label per variant.
- Bumped `EVIDENCE_SCHEMA_VERSION` (no migration — evidence lives in an existing `jsonb` column).

## 3. What was deliberately not done

- No `freightCalculate` call, destination market, Product Catalogue, or checkout change — `FREIGHT_ROUTE_CONFIRMED` stays unimplemented until ADR-003 approves a market.
- No supplier request-correlation ID invented — none of the three CJ response envelopes this touches return one; documented as absent rather than fabricated.
- No live CJ tick and no database mutation to demonstrate the fix; verification used real historical evaluated rows already in the dev database.

## 4. Verification

- `npm run verify` (lint, format, `typecheck:clean`, build, unit tests, e2e) and `npm audit --audit-level=high` — clean.
- New tests cover: CJ-only/factory-only/mixed/zero/unknown stock; verified/unverified/absent → unknown warehouse state; per-`vid` join never by array index; raw fields surviving a JSON round-trip (snapshot serialization); factory/unverified evidence producing neither an automatic pass nor a permanent block; legacy `NO_SHIPPING_ROUTE` staying readable.
- Manually inspected the real Ready/Needs Attention tabs against 101 real dev-database candidates at desktop/mobile/tablet — correct column rename, no console errors, no horizontal overflow.
- **Stated limitation:** could not visually render the evidence drawer itself live, since it only mounts from the real `/products` CJ browser and no live CJ connection was reachable at that point in the session — covered instead by `evidence.ts`'s full round-trip unit tests plus typecheck/build.

## 5. Next smallest slice

This was immediately followed, same day, by the Portal-only country-policy separation slice — see [[sals3-session-2026-08-10-part26-portal-au-market-hardcode-remediation]].
