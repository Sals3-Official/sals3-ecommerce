---
tags: [sals3, session, sals3-portal, country-policy, adr-003, adr-014, market]
aliases: [Portal AU Market Hardcode Remediation, Country Policy Separation]
created: 2026-08-10
updated: 2026-08-10
status: session-note
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-session-2026-08-10-part25-cj-inventory-evidence-truth]]"
---

# Sals3 session 2026-08-10, part 26 — Portal-only country-policy separation and hardcode correction

`sals3-portal` branch `codex/portal-au-market-hardcode-remediation`, off `develop` after PR #24 merged. Not yet committed/pushed at the time this note was written - see [[hot]] for current PR state.

## 1. Problem

Bogs confirmed Australia as Sals3's business/seller-registration country, then explicitly clarified that seller operating-country eligibility, buyer destination-country eligibility, supplier stock origin, and display currency are four separate things that must never be collapsed into one ambiguous value. `sals3-portal`'s real candidate pipeline hardcoded a single Philippine `'PH'` market code as if it were an approved buyer destination, and several real seller-facing screens presented PHP as if it were Portal's own operating currency.

## 2. What was implemented

- **`src/lib/country-policy/`** — three independent, typed, server-only resolvers (ADR-014): `resolveSellerOperatingCountryPolicy()` (`AU`, enabled), `resolveBuyerDestinationCountryPolicy()` (empty, **disabled** — no ADR-003 market approved), `resolvePortalDisplayCurrency()` (`AUD`).
- Deleted the dead `PLACEHOLDER_MARKET_CODE`; `ingestion.ts` now sources `intended_market_codes` from the buyer-destination resolver instead of a literal `['PH']`.
- **Real `/products` seller browser decoupled from the storefront checkout pricing function** — it no longer calls `resolveUsdToPhpRate()` for decoration; it shows only an AUD reference estimate through an isolated resolver.
- `PORTAL_DEV_MARKET` (the illustrative Seller Center PH/ID/SG fixture switch) gated to non-production only, matching the existing dev-role pattern.
- A repository guard fails the build if a bare `'PH'`/`'AU'` market-code literal is reintroduced into the candidate-pipeline runtime.

**Review correction, same day** (Codex found three merge-blocking defects before this reached commit):

1. **Policy version/audit** — the buyer-destination policy is now resolved exactly once per evaluation (never re-resolved inside the rule itself), composed with the catalog policy version into one deterministic stored identity (`candidate_evaluations.policy_version`, no migration — an existing text column), and both screening/evaluation audit events now record the catalog version, the buyer-destination version/source/effective state/enabled codes, and the candidate's own intended destination codes.
2. **Production fixture leak** — `getActiveMarket()` previously fell back to the `PH` fixture in production as if it were real. It now returns `null` in production; the five real callers (`/orders`, `/finances`, `/payouts`, `/market-rules`, the blank listing wizard) render a new honest "Market configuration is not available" notice instead.
3. **Missing per-candidate destination check** — `checkValidMarket` previously only asked "is any buyer-destination policy enabled globally." It now also reads each candidate's own persisted `intended_market_codes` and requires every one of them to already be inside the enabled allowlist — a historical `['PH']` candidate stays blocked under an enabled `['AU']` policy rather than silently passing, and enabling `['AU','SG']` never retroactively qualifies a stored `['PH']`-only row. The rule never mutates the candidate's stored destinations.

## 3. Real consequence to flag

Because the buyer-destination policy is genuinely disabled today, **no new candidate can currently reach `Ready`** — every new evaluation fails closed at screening with a recoverable `NO_VALID_MARKET`/`TEMPORARILY_INELIGIBLE`, before any CJ evidence-fetch call. This is the intended fix for the previous silent `'PH'` assumption, but it is a real, live behavior change on the next production ingestion/evaluation tick once merged and deployed. Existing historical `PASS`/`PASS_WITH_ATTENTION` rows are untouched.

## 4. What was deliberately not done

- No Admin Portal UI, commercial pricing governance, freight, checkout, publication, or Product/Variant/Offer model.
- No change to the live cross-repository storefront pricing contract (`fx.ts`/`feed.ts` stay PHP, explicitly labelled as the deferred `sals3-ecommerce` checkout concern) and no reinterpretation of `priceMinor`.
- No commit, push, merge, deploy, live CJ tick, live supplier call, or database mutation.
- The re-evaluation job that would use the new composed policy identity to re-queue stale-policy decisions is not built — only the identity itself, so a future job can detect staleness by string comparison.

## 5. Verification

- `npm run verify` (lint, format, `typecheck:clean`, build, 396 unit tests / 4 skipped, 51 e2e / 1 skipped) and `npm audit --audit-level=high` — clean (same pre-existing moderate `esbuild`-via-`drizzle-kit` advisory as prior sessions, unrelated).
- New tests prove: one resolver call per evaluation; the stored policy identity changes deterministically when the buyer-destination version changes; both audit payloads carry the full field set; `['AU']` passes only under an enabled `['AU']` policy; `['PH']` blocks under enabled `['AU']` without rewriting the candidate; mixed destinations block if any one is unauthorized; production returns `null` regardless of the dev override.
- Manually inspected the real Ready/Needs Attention tabs (historical rows correctly unaffected) and the real `/products` browser's AUD-only estimate against a live CJ connection, at desktop and mobile.
- **Stated limitation:** could not browser-verify the production-mode "Market configuration is not available" render live — a pre-existing, unrelated local gap (`BETTER_AUTH_SECRET` unset) makes `next start` fail before reaching any application code. Verified instead by strict TypeScript null-checking (every `market.` access in the five affected files is provably guarded) plus the dedicated resolver unit test asserting `null` under `NODE_ENV=production`.

## 6. Next smallest slice

Per the owner's standing instruction not to start the next slice unless asked: the country-policy separation and its review corrections are code-complete and verified. The real next gate is an owner-approved ADR-003 pilot market/category rule pack — until one exists, `Ready` correctly stays empty for new candidates.
