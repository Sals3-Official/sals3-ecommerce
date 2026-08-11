---
tags:
  [
    sals3,
    session,
    admin-portal,
    governance,
    control-plane,
    architecture-audit,
    bootstrap,
    accessibility,
  ]
aliases:
  [Admin Portal Gate 0, Admin Portal Bootstrap, Sals3 Admin Portal First Build]
created: 2026-08-11
updated: 2026-08-11
status: session-note
authority: implementation-record
owner_approved: true
implementation_status: bootstrap-only
related:
  - '[[ADR-014-admin-portal-platform-governance-and-global-controls]]'
  - '[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]'
  - '[[ADR-003-international-availability-shipping-and-pricing]]'
  - '[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]'
  - '[[sals3-session-2026-08-11-part32-admin-portal-control-tower-direction]]'
  - '[[hot]]'
---

# Sals3 session 2026-08-11, part 33 — Admin Portal Gate 0 and repository bootstrap

## Status

Gate 0 (architecture and dependency audit) is **complete and owner-confirmed**. The `sals3-admin-portal` repository is **bootstrapped and verified**, on a feature branch, awaiting PR review.

There is still **no** employee authentication, permission model, database, schema, migration, policy publication, or ecosystem data connection. `ADR-014`'s `implementation_status` should remain `not-started` for every governed capability; only the repository scaffold exists.

## Gate-0 findings

### Repository state before this session

`github.com/Sals3-Official/sals3-admin-portal` — public, default branch `develop`, created 2026-08-11T14:52Z. One commit (`4d18376 chore: initialize admin portal`), one file (`README.md`, 22 bytes, containing only the title). No root instructions, no `.gitignore`, no CI, nothing hidden. Cloned to `E:\sals3-admin-portal` as a sibling of `E:\sals3-portal` and `E:\sals3-ecommerce`.

### Which domains actually have an authoritative source today

Verified by reading `sals3-portal`'s real schema and server code, not inferred:

| Domain                                                   | Authoritative source                                                                                                   | Verdict                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Seller-account lifecycle                                 | `seller_accounts` (`PENDING/ACTIVE/SUSPENDED/CLOSED` + `PENDING/VERIFIED/REJECTED`), enforced in `src/lib/auth/session.ts` | **Real.** Suspension already blocks seller sessions server-side. |
| Supplier providers / connections                         | `supplier_providers`, `supplier_connections`, `supplier_connection_secrets` (AES-256-GCM)                               | **Real.** Provider incident control is buildable.                |
| Country policy                                           | `src/lib/country-policy/` resolvers, already carrying `policyVersion` / `source` / `effective`                          | **Real seam, purpose-built for ADR-014.**                        |
| Candidate pipeline                                       | `supplier_candidates`, `candidate_evaluations`, `supplier_snapshots`, `audit_events`, `idempotency_records`             | Real, but candidate-scoped — not a catalogue.                    |
| Discovery operations                                     | `discovery_*`, `work_outbox`, `webhook_inbox`, `supplier_request_budgets`, `product_subscriptions`                     | Schema real; live-DB application not verified this session.      |
| Pricing policy                                           | `src/lib/db/schema/pricing-policy.ts`, `src/modules/pricing/`                                                          | Uncommitted/unmigrated, and **ADR-015 assigns it to Seller Portal**. |
| Product / Variant / Offer / Media                        | —                                                                                                                      | **Does not exist.**                                              |
| Orders, checkout, payments, finance, ledger, payouts     | —                                                                                                                      | **Does not exist.**                                              |
| Customers, logistics, communications, taxes              | —                                                                                                                      | **Does not exist.**                                              |
| Employee identity                                        | — (only `scripts/approve-portal-user.mts`, a CLI)                                                                      | **Does not exist.**                                              |

Of the 13 capability domains in the owner's control-tower direction, exactly **three** have a real backing service. Everything else must render an honest unavailable state.

### Cross-repository boundary

The existing house pattern, found twice in `sals3-portal`, is **HTTP plus a server-only shared secret, never a database reach-in**: `/api/storefront/*` gated by `SALS3_STOREFRONT_API_TOKEN`, and `/api/internal/catalog/discovery/*` gated by `DISCOVERY_CONTROL_SECRET` with constant-time SHA-256 comparison and fail-closed behaviour when unset.

**Confirmed decision: Admin Portal owns its own database; no shared database boundary.** Three concrete reasons, not convenience:

1. `drizzle.config.ts` points at a single schema barrel with `strict: true`. Two repositories generating migrations against one `drizzle/` directory is a real corruption hazard.
2. ADR-014's enforcement diagram requires consuming services to enforce published decisions on their own protected server path. Direct cross-repository table writes would bypass exactly that.
3. Audit provenance: an admin action written straight into `audit_events` becomes indistinguishable from a seller action, with no separate actor namespace.

Policy therefore reaches Portal as **versioned published state, pulled** through the existing `src/lib/country-policy/` resolver seam with a server-side cache and fail-closed fallback to last-known-good. Pull was chosen over an event bus because ADR-014 explicitly defers the cross-repository event-transport choice, and pull requires no new infrastructure.

### Owner decisions confirmed 2026-08-11

1. Separate database plus published policy over a secret-protected endpoint. **Confirmed.**
2. First end-to-end domain: **versioned market governance** — seller-operating and buyer-destination country policy, independently versioned. **Confirmed.**
3. The Portal-side consumer change is a **separate PR in `sals3-portal`, approved separately**. **Confirmed.**
4. Clone approved, then scaffolding approved.

Market governance was chosen as the first slice because it is the only domain where an owner decision is already blocked on missing machinery: `AU` was approved as buyer destination on 2026-08-11 (see [[sals3-session-2026-08-11-part27-au-buyer-destination-approval]]), while the live resolver still returns `countryCodes: []`, `effective: 'DISABLED'`, version `buyer-destination-country-v1-disabled`. Closing that gap is the slice's own acceptance test.

## Boundary defect found in `sals3-portal` (open, not fixed)

`PORTAL_ROLES` in the tenant-facing Seller Portal contains `admin` and `catalogue_reviewer`, and `ownsProduct()` grants both roles cross-seller access. That is platform authority living inside the seller application — precisely what ADR-014's rejected Option A describes.

Not changed in this session; it needs its own slice and its own approval. Recorded because the first slice's "seller identities cannot access Admin capabilities" test is only half the boundary if the reverse leak stays unnamed.

## What was built

Repository scaffold only, in `sals3-admin-portal`.

### Stack

Matched to `sals3-portal` deliberately, no invented tooling: Next.js 16.3.0, React 19.2.8, TypeScript 5, Tailwind v4, ESLint 9 (airbnb + next core-web-vitals + next/typescript), Prettier, Vitest 4, Playwright, Husky/lint-staged. Dev port **3002**, Playwright port **3102**, so all three Sals3 applications can run simultaneously (ecommerce 3000, portal 3001).

`.npmrc` carries `legacy-peer-deps=true` for the same reason `sals3-portal` does: `eslint-config-airbnb@19` declares a peer range of ESLint 7–8 and has shipped no ESLint 9 release, while the flat config adapts it through `@eslint/compat` + `@eslint/eslintrc`.

### Files

```text
AGENTS.md, CLAUDE.md          mandatory rules gate + Admin-specific rules
README.md                     setup, verification, structure, limitations
.env.example                  variable names only, no values
.gitignore .npmrc .prettier*  tooling
eslint.config.mjs             ported from sals3-portal, vault ignores dropped
next.config.ts                security headers on every route + X-Robots-Tag
playwright.config.ts          port 3102
vitest.config.mts tsconfig.json postcss.config.mjs
scripts/typecheck-clean-next.mjs
test/setup.ts
src/app/globals.css           Admin theme tokens
src/app/layout.tsx            noindex metadata, Portal's type stack
src/app/page.tsx              honest bootstrap landing, no dashboard
src/app/page.test.tsx
src/components/admin/UnavailableNotice.tsx
src/components/admin/UnavailableNotice.test.tsx
src/lib/utils.ts
e2e/home.spec.ts
```

**No migrations exist, and none were generated or applied.** No database was created or connected.

### UI and system boundary

The theme is **not a redesign**. Radius scale, spacing scale, font stack (Plus Jakarta Sans + Outfit), focus-ring rule, and reduced-motion rule are the same values `sals3-portal` uses, so layout rhythm and interaction feel stay identical between the two products. Only the colour layer diverges: graphite/ink surfaces, deep indigo `#1e1b4b` navigation, restrained electric-violet `#5b34cc` accent.

Danger, warning, and success keep the **same semantic meaning** they have in `sals3-portal`, so an operator reading both products never re-learns what red means. Every status also carries a written label; colour is never the only signal.

**Accessibility verified numerically, not assumed.** All 26 foreground/background pairs were checked against WCAG 2.1 AA relative-luminance before adoption — 4.5:1 for text, 3:1 for UI and focus indicators. All 26 pass; lowest text pair 5.02:1, lowest UI pair 6.83:1.

One deliberate divergence: `--destructive` is `#b42318` rather than the Portal's `#d92d20`. The Portal value measures **exactly 4.50:1** against its own page background — it passes, but the AA boundary is the wrong place for destructive actions in a control plane.

### Honest unavailable states

`src/components/admin/UnavailableNotice.tsx` is the single approved way to render a capability with no backing service, with three reasons that have genuinely different owners:

| Reason                    | Meaning                                        | Who unblocks it               |
| ------------------------- | ---------------------------------------------- | ----------------------------- |
| `NOT_IMPLEMENTED`         | Approved plan exists, no code yet              | Engineering                   |
| `NOT_CONNECTED`           | Code exists, this deployment has no connection | Operations                    |
| `NO_AUTHORITATIVE_SOURCE` | Nothing in the ecosystem owns this data yet    | Product/architecture decision |

The landing page uses it instead of tiles or totals. A regression test asserts the page renders **no digits at all** (after removing the brand token `Sals3`, which contains one) — the cheap, reliable tell that someone later "filled in" the screen with a fabricated seller count or a green live pill.

## Permissions matrix — proposed for slice 1 only, not implemented

| Action                          | Support | Catalogue & Compliance | Platform Admin | Break-glass |
| ------------------------------- | ------- | ---------------------- | -------------- | ----------- |
| View market policy and history  | yes     | yes                    | yes            | yes         |
| Propose policy version          | —       | yes                    | yes            | yes         |
| Approve proposal (≠ proposer)   | —       | —                      | yes            | yes         |
| Execute publish (step-up)       | —       | —                      | yes            | yes         |
| Reverse / roll back             | —       | —                      | yes            | yes         |

Seller-operating and buyer-destination are **separate permissions**, never one `market:*`. Two-person approval is enforced server-side as proposer ≠ approver. Employee authentication will use its own Better Auth instance, **invite-only with no public signup path**, with mandatory 2FA reusing the Portal's proven `twoFactor` pattern.

## Audit and rollback behaviour — designed, not implemented

Every consequential action must record actor, reason, scope, before/after, correlation ID, and time. Rollback republishes a prior valid version and never rewrites history. None of this exists in the bootstrap; it lands with slice 1.

## Test evidence

`npm run verify` — all six stages pass:

| Stage              | Result                    |
| ------------------ | ------------------------- |
| `lint`             | pass, no warnings         |
| `format:check`     | pass                      |
| `typecheck:clean`  | pass                      |
| `build`            | pass, 3 static routes     |
| `test:run`         | pass, 8/8 tests           |
| `test:e2e`         | pass, 2/2 tests           |

`npm audit --audit-level=high` — **0 vulnerabilities** across 474 packages.

The E2E suite asserts the security headers **from the actual response** rather than by reading `next.config.ts`, because a header that is configured but not sent is the failure mode worth catching. Browser verification confirmed every theme token computes to its designed value in both light and dark mode, radius 8px, and zero console errors.

Deliberately omitted, and why: **Drizzle ORM and Better Auth are not installed.** Installing database and authentication packages with zero call sites would ship dependencies no test can exercise. They arrive with the slice that uses them. Consequently `shadcn/ui` primitives are not vendored either, so `globals.css` omits `@import 'shadcn/tailwind.css'`; the README records that it must be added with the first component.

## Deferred domains

Every capability below remains unavailable, with the reason recorded rather than a placeholder screen:

- **No authoritative source yet:** global orders and after-sales, global finance/ledger/settlement/payout, global catalogue and listings, customers and PII lookup, logistics providers and delivery policy, communications and campaigns, tax/duty/compliance rules, KYC/risk/legal holds.
- **Not implemented, source exists:** seller lifecycle and support context, supplier/provider incident control, catalogue moderation, audit explorer, feature flags, exports, retention and privacy operations.
- **Explicitly out of scope for Admin Portal:** merchant category margins, merchant product and variant prices, merchant category PIC assignments, and merchant FX adjustments — all tenant-owned under ADR-015.

## No implementation claim

No commit was made to `sals3-portal`. No live provider, payment, or logistics call was made. No database migration was generated or applied. No deployment occurred. No repository settings were changed. No seller or customer data was accessed.

`sals3-portal`'s working tree changed during this session from concurrent work by another session — `permissions.ts`, `market-rules/page.tsx`, `drizzle/0010_*.sql`, and new pricing-action files. **Nothing in this session wrote to that repository**; it was read from and copied outward only. Worth confirming ownership before anyone commits there.
