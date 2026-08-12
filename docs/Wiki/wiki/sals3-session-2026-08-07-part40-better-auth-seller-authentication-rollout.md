---
tags: [sals3, sals3-portal, session-note, auth, better-auth, 2fa, security]
aliases:
  - Better Auth Seller Rollout
  - Portal Authentication
created: 2026-08-07
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[nextjs-component-security-code-rules]]"
  - "[[hot]]"
---

# The Seller Center's real authentication stack — `sals3-portal` PRs #13, #14, #15, #20

This documents a foundational feature that shipped 2026-08-07/10 with no vault
entry at all until this note — `hot.md`'s own "Current build priorities"
list still carried "Implement real authentication..." as an open item five
days after it merged, unstruck, while every other completed priority around
it had been marked done. Four PRs, all `aj-garrigues` (AJ), all merged.

## PR #13 — Better Auth signup, login, and 2FA (merged 2026-08-07)

Built the Seller Center's actual authentication stack on Better Auth: email/
password signup with mandatory verification, TOTP two-factor, password reset,
and session gating. Public signup creates a **pending** seller application —
it does not grant access. An owner approves with
`npm run approve:portal-user -- --email … --role seller_manager`.

**Two defects found bringing the flow up locally, both fixed in the same PR:**

1. **`auth_rate_limits` had no `id` column.** Better Auth's Drizzle adapter
   factory injects an `id` into every model before insert; with
   `rateLimit.storage: 'database'` this threw
   `BetterAuthError: The field "id" does not exist in the "rateLimit" Drizzle schema`
   on the very first auth call. Every request hit the rate limiter, so signup
   failed 100% of the time. `id` is now the primary key, `key` a unique index
   — migration `0006_bouncy_dorian_gray`.
2. **The failure was invisible.** `signupSellerAction` deliberately catches
   every error and still returns the generic success message — real,
   unchanged anti-enumeration behavior — but that meant the 500 above
   surfaced to a real user as "Check your email," with nothing to check. The
   local email fallback now logs the verification link so the flow can be
   completed and observed end to end without a Resend account.

Six new `auth_*` tables (migrations `0005`, `0006`). Verified against a real
Postgres: `auth_users` row created, `seller_accounts` row written as
`PENDING/PENDING` by the `databaseHooks` user-create hook, `auth_rate_limits`
row with a populated `id`. `npm run verify` green: 199 unit tests, 36 E2E.

## PR #14 — Better Auth's hosted dashboard, via the `dash()` plugin (merged 2026-08-07)

Registers `@better-auth/infra`'s `dash()` plugin so Better Auth's own hosted
dashboard can reach `https://sals3-portal.vercel.app/api/auth`, gated on a
production-only `BETTER_AUTH_API_KEY`. With no key set, it logs one warning
and stays inert — CI and a fresh clone still boot.

**Worth knowing:** `dash()` is not a read-only console. It forwards
authentication events — sign-ins, sign-ups, verification, session activity,
and request location — to Better Auth's own servers. That is a real outbound
data flow, documented next to the key in `.env.example`.

**`activityTracking` deliberately left off (the default).** Turning it on
makes the plugin write `user.lastActiveAt`, and `auth_users` has no such
column — the Drizzle adapter would reject the unknown field outright, the
identical failure mode that took signup down in #13. Needs its own migration
first. Plugin order matters too: `dash()` sits before `nextCookies()`, which
must stay last or Better Auth warns that later plugins won't see its cookie
handling.

## PR #15 — Owner tooling to provision and unblock portal logins (merged 2026-08-07)

Production email was unconfigured — `RESEND_FROM_EMAIL` was malformed and the
Resend account had no verified domain — so with
`requireEmailVerification: true`, nobody could complete signup and nobody
could log in. Approving a pending user didn't help either:
`approve-portal-user` set the role and activated the account but never
touched `emailVerified`, so an approved user still bounced off the
verification check.

- **`approve-portal-user --verify-email`** — marks the address verified
  without a clicked link. Opt-in, never implied by ordinary approval.
- **`create-portal-user`** (new, `npm run create:portal-user`) — provisions a
  working login outright in one transaction: user, credential account, and
  an `ACTIVE`/`VERIFIED` seller account. Generates a password when none is
  given, refuses to overwrite an existing email. Passwords go through Better
  Auth's own `hashPassword`, verified to round-trip against `verifyPassword`
  before being relied on.

Both are owner-only shell tools — they grant nothing an operator with
`DATABASE_URL` couldn't already do via raw SQL, but they skip real checks, so
every account they touch should be treated as temporary. Neither script is
imported by `src/`, so neither ever enters the Next.js bundle. **Follow-up
flagged by the PR itself, not yet built:** there is still no
`delete:portal-user` script, and a `temp.access@sals3.local` account existed
in production at the time of writing pending Resend actually working.

## PR #20 — Verified seller entry flow (merged 2026-08-10)

Adds the post-signup/sign-in continuation flow: gates real Seller Center
entry behind email verification and TOTP setup, keeping the same generic auth
copy throughout while routing an already-verified user straight to whatever
setup step remains. `/auth/pending` is the shared `AuthShell` route this flow
lands an unverified session on.

## What this means for `hot.md`'s own tracker

`hot.md`'s "Current build priorities" section still lists item #2,
"Implement real authentication plus separate Retailer/Dropshipper
registration...", without the strikethrough every other completed item in
that list carries — even though this note's four PRs shipped a real,
production-verified authentication system three to five days before that
list's own `updated:` date. That line should read as done for the
authentication half specifically; separate Retailer/Dropshipper registration
is a distinct, still-open concern this rollout does not address.

## Verification

Each PR reports `npm run verify` green independently (lint, format,
typecheck, build, unit tests, E2E — 199 unit/36 E2E through PR #14; PR #15
adds real sign-in checks against both local and production databases, plus
one flagged-as-environmental Playwright flake, 6 failures that reproduced as
36/36 passing on an identical re-run).

`sals3-portal` [PR #13](https://github.com/Sals3-Official/sals3-portal/pull/13),
[PR #14](https://github.com/Sals3-Official/sals3-portal/pull/14),
[PR #15](https://github.com/Sals3-Official/sals3-portal/pull/15),
[PR #20](https://github.com/Sals3-Official/sals3-portal/pull/20), all merged.
