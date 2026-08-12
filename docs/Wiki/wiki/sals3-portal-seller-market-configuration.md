---
tags:
  [
    sals3,
    sals3-portal,
    seller-center,
    market-configuration,
    country-policy,
    tenancy,
    audit,
  ]
aliases:
  [Seller Market Configuration, Market Rules Profile, Seller Market Profile]
created: 2026-08-12
updated: 2026-08-12
status: implemented-pending-migration
authority: implementation-note
owner_approved: false
implementation_status: code-complete-migration-unapplied
related:
  - '[[hot]]'
  - '[[ADR-003-international-availability-shipping-and-pricing]]'
  - '[[ADR-014-admin-portal-platform-governance-and-global-controls]]'
  - '[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]'
  - '[[nextjs-component-security-code-rules]]'
---

# Seller market configuration (`sals3-portal` `/market-rules`)

## Status

`implemented-pending-migration` — code complete on branch
`feat/seller-market-configuration`. Migration `0012_flashy_penance` is
**generated and not applied to any database**. Not committed, not pushed, no
PR. Not owner-approved.

## Problem this solved

Deployed `/market-rules` said "Market configuration is not available" to
every signed-in seller. Its only data source was
`src/lib/seller-center/market-config.ts`, an imported design mockup of PH /
ID / SG markets whose `getActiveMarket()` deliberately returns `null` in
production so that invented carrier, tax, payout, and cutoff figures never
reach a real seller. The real signed-in identity (`session.sellerId`) existed
but nothing read it for market context.

## The four concepts, kept separate

Collapsing these into one field called "market" is the specific mistake this
work exists to prevent. Each is independently resolved and independently
versioned, and the screen states them separately.

| Concept                            | Source                                              | Current value                           | What it does **not** mean                                                          |
| ---------------------------------- | --------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Global catalogue buyer destination | `lib/country-policy/buyer-destination-country.ts`     | `AU`, `PH` (`...-v2-au-ph`), ENABLED    | Not a seller preference, operating country, checkout currency, tax rule, or freight promise. Not seller-editable. |
| Sals3 business/seller operating    | `lib/country-policy/seller-operating-country.ts`      | `AU` (`seller-operating-country-v1`)    | Never implies a buyer destination. AU appearing in both lists is a coincidence of two separate owner decisions, never a derivation. |
| Portal reference/display currency  | `lib/country-policy/currency.ts`                      | `AUD`                                   | Not a checkout, settlement, or FX-conversion contract; not a browser-side rate calculation. |
| Seller's own market profile        | `modules/market-config/` + `seller_market_profiles`   | Per account, nothing by default         | Not a launched market — see pilot limits.                                          |

Candidate evaluation is unchanged: a candidate still needs an explicit
intended destination that the **global** policy allows. The new capability
module is deliberately unreachable from `rules/screening.ts`, enforced by a
test, so a seller-facing setup change can never move
`candidate_evaluations.policy_version` and requeue historical decisions.

## Capability boundary

`src/modules/market-config/capabilities.ts`, version
`seller-market-capability-v1-au-ph-bounded-pilot`, is the server-owned
allow list for setup. It is fail-closed against the global policy:

- offerable = listed here **AND** currently permitted globally;
- narrowing the global policy narrows setup automatically;
- widening the global policy can **never** silently widen setup — that stays
  an explicit, re-versioned edit here;
- a `DISABLED` global policy offers nothing.

`authorizedSellingCurrencyCodes` is empty for both destinations on purpose.
No per-destination selling currency has been authorized; AUD is the portal's
display dimension and the storefront is USD, so recording either as a
seller's selling currency would fabricate a commercial contract. The schema
columns for currency, locale, and time zone are therefore nullable and
currently always null.

## Profile lifecycle and tenancy

`DRAFT → ACTIVE → SUSPENDED`. Every transition requires the new
`market_profile:manage` permission (admin, seller_manager only —
`market_rules:read` is deliberately broader, held by staff and viewer, and
does not grant it), a business reason of at least 10 characters, and a
compare-and-set on the exact `(status, version)` the page rendered from.
Authorization, state change, and the `audit_events` row share one
transaction.

Tenancy model:

- the seller always comes from `session.sellerId`; no action has a field for
  a seller or owner id, so there is nothing to forge;
- every repository call folds the authenticated `sellerAccountId` into the
  SQL, including read-one-by-id;
- a cross-tenant id, a missing row, a wrong state, and a replayed submit all
  return the same `not_found` with no mutation and no audit event, so the
  result cannot be used to probe another account's configuration.

Nothing activates implicitly. The AU+PH global policy makes a destination
*offerable*, never *configured*.

## UX states

Six, deliberately distinguished: backend-unavailable (notice, **no** setup
control, because offering a write on a read that failed invites a duplicate);
successful-empty (account-specific setup state, may offer setup to an
authorized role); draft/pending; active-but-capabilities-incomplete;
suspended; forbidden (handled by `requirePermission` on the page).

An active pilot destination is labelled "Active — pilot, capabilities
incomplete" and lists what is outstanding. It is never presented as a
finished market.

## Pilot limits — explicitly deferred

AU and PH are a bounded evidence pilot. Not proven and not implemented for
either: payments onboarding, logistics/freight quoting, tax treatment,
payouts. Also out of scope and untouched: customer checkout, real FX
fetching/conversion, DDP/IOSS, carrier booking or delivery promises, a
seller-editable global allowlist, Admin Portal work, and AJ's canonical
Product/Variant/Offer model.

## Migration

`drizzle/0012_flashy_penance.sql` — creates the
`seller_market_profile_status` enum and the `seller_market_profiles` table
with a partial unique index on `(seller_account_id,
destination_country_code) WHERE status IN ('DRAFT','ACTIVE')` and a
seller-scoped lookup index. Purely additive; it writes no existing data.

**Not applied.** Until an owner runs `npm run db:migrate`, `/market-rules`
renders the backend-unavailable state. Local unit and E2E runs pass in that
condition because the section degrades honestly rather than throwing; the
scoped `WHERE` clauses have therefore **not** been exercised against real
Postgres.

## Fixture status

`/market-rules` no longer imports `market-config.ts` at all (enforced by an
import-graph test). `MarketRulesTable` and `buildMarketRules()` were removed
as provably unused — they rendered invented commission, tax, payout, and
carrier rows.

Still fixture-only, unmigrated, and documented as such in the portal README:
`/orders`, `/finances`, `/payouts`, and the blank listing wizard
(`getActiveMarket()`); the catalog destination filters (`getAllMarkets()` /
`SELLER_CENTER_MARKET_CODES`). Note the filter vocabulary is `PH`/`ID`/`SG`,
which does **not** match the real approved destinations `AU`/`PH` —
reconciling that is open follow-up work.

## Verification

`npm run verify` green: lint, format check, clean typecheck, production
build, 862 unit/component tests passing (4 skipped), 56 E2E passing (2
skipped). `npm audit --audit-level=high` clean; 4 moderate advisories remain
in the `drizzle-kit` dev dependency chain, pre-existing.
