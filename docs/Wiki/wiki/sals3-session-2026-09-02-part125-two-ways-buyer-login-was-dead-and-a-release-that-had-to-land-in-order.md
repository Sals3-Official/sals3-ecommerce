---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - auth
  - firebase
  - deployment
  - production-incident
  - release-order
  - session-note
aliases:
  - Part 125
  - Two Ways Buyer Login Was Dead
  - A Release That Had To Land In One Direction
created: 2026-09-02
updated: 2026-09-02
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[portal-repo-migrated-to-anythingsupplies]]"
  - "[[agent-operating-contract]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
---

# Part 125 — two ways buyer login was dead, and a release that had to land in one direction

2026-09-01/02, `sals3-ecommerce`
[#2](https://github.com/anythingsupplies/sals3-ecommerce/pull/2)/[#3](https://github.com/anythingsupplies/sals3-ecommerce/pull/3)/[#6](https://github.com/anythingsupplies/sals3-ecommerce/pull/6)/[#7](https://github.com/anythingsupplies/sals3-ecommerce/pull/7)/[#8](https://github.com/anythingsupplies/sals3-ecommerce/pull/8)/[#9](https://github.com/anythingsupplies/sals3-ecommerce/pull/9),
`sals3-portal` [#12](https://github.com/anythingsupplies/sals3-portal/pull/12),
no DDL in any of them. First real production work on both repos after the
2026-09-02 move to `anythingsupplies`.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record, and from
> [[portal-repo-migrated-to-anythingsupplies]]'s account of the migration
> itself.

## `sals3.com` was showing "Live products unavailable" for a reason that was not DNS or caching (#2/#3)

Production's home page rendered the placeholder rail rather than real
products. The cause: `SALS3_STOREFRONT_API_TOKEN` is one shared-secret value
that has to match on both the `sals3-ecommerce` and `sals3-portal` Vercel
projects, and the two Production values had diverged — the same mismatch that
was already breaking `uat` and `sit`. Fixed by setting both Production values
to one shared token by hand in the Vercel dashboard, then merging `pre-prod`
into `main` to force a fresh Production build (a Developer-role account
cannot trigger a bare redeploy; a real build was the only path with the
permissions on hand).

**This is also the answer to where that token's value actually lives**: it
was typed directly into a Vercel dashboard session, never committed to either
repository, and the PR notes on record that doing so put it in the working
transcript and recommends rotating it. Consistent with a full git-history
search across both the old and new `sals3-portal` remotes turning up zero
real values — only the test-stub literal `'secret'` and an empty
`.env.example` line.

The same PR also carries a smaller fix bundled in: `sals3-ecommerce` now
sends the Vercel protection-bypass header on Portal reads, needed so `uat`
and `sit` — which sit behind Vercel Deployment Protection — can reach the
Portal API at all. It is a no-op on Production, which is not behind that
protection.

## Buyer login answered 503 on two more environments, for an unrelated reason (#6/#7/#8)

`POST /api/auth/login` was **503 on `uat` and `sals3.com`** (sit was already
fixed and correctly answering 401 for an unknown account). The
`anythingsupplies.com` GCP organisation enforces
`constraints/iam.disableServiceAccountKeyCreation`, so no service-account
private key could be issued for any of the three Firebase projects — and
production's Firebase config was still pointing at a **retired** project
(`sals3-b82b6`) besides.

**The fix is Firebase Admin authenticated by workload identity federation
instead of a key**: Vercel's own OIDC token is exchanged at Google STS for a
token impersonating the Firebase service account, through a workload
identity pool already provisioned in all three GCP projects
(`sals3-sit`/`sals3-uat`/`sals3-caecd`), trusting
`https://oidc.vercel.com/sals-3-team` and conditioned on the Vercel project
id plus the `environment` claim.

**#6 shipped a version of this that could not work once deployed.** It read
the token from `process.env.VERCEL_OIDC_TOKEN` — populated only by
`vercel env pull`/`vercel dev`, which is exactly why it looked correct on a
developer machine. A deployed serverless function receives the same token as
the `x-vercel-oidc-token` **request header**, not an env var, so every real
signup on `sit` answered `503` the moment it shipped. **#7** switches to
`getVercelOidcToken()` from `@vercel/oidc`, which checks the header first and
only falls back to the env var for local dev — verified end to end on `sit`
(signup, session, login, and a real `displayName` written by the Admin SDK,
proving the federated credential actually ran). The same PR also stopped
both `catch` blocks in the signup route from discarding the failure's own
message — the single log line that found this bug in the first place.

**#8 repeats the fix for Production**, cut from `main` rather than from the
78-file-ahead `pre-prod`, deliberately carrying only the auth change so it
does not also drag in an unrelated feature release. Production env vars were
switched to point at `sals3-caecd` before this PR merged; the merge is what
lets the already-updated env vars and the new code agree, since deploying
the new credential path against old env vars (or vice versa) would have kept
production broken in a new way.

**Known limitation, carried into production on purpose:** the Vercel OIDC
`sub` claim distinguishes only `production`/`preview`/`development` — there
is no per-branch claim — so `sit` and `uat` are both `preview` and cannot be
told apart by GCP; a `uat` deployment could in principle obtain `sit`'s
Firebase credentials and vice versa. Production is unaffected, being the
only deployment carrying the `production` identity. Separating `sit` and
`uat` would require splitting them into two Vercel projects, not attempted
here.

**Follow-up, explicitly not done in #8:** `FIREBASE_PRIVATE_KEY` on
Production still holds the retired project's key. It is inert while the
workload-identity audience variable is set and takes precedence, but it is a
live private key left in place rather than removed — a silent fallback
target if the audience variable is ever unset by mistake.

## The coordinated release that had to land portal-first (portal #12, ecommerce #9)

Separately from the two incidents above, a real feature release — checkout
rework, free shipping, product-page and loading-state changes, new home
promo images — was ready to ship to both repositories' `main` at once. The
two halves have a real ordering dependency: `sals3-ecommerce`'s `pre-prod`
parses `CheckoutIntentResponseSchema` with `shippingQuotedAt` as a
**required** field, and only the Portal's `pre-prod` (not yet `main`)
returns it from `createCheckoutIntent`. Releasing the storefront first would
have failed that parse and taken checkout down entirely, not just the
payment step.

The safe direction only works one way: the storefront strips unknown
response keys and its own schema documentation says `.strict()` must never
be added to that schema, precisely so the Portal can ship a field ahead of
the storefront reading it. Portal #12 was verified on `uat` before opening
— `origin/pre-prod` returns `shippingQuotedAt`, `origin/main` does not, and
`uat` was internally consistent (storefront requiring it, portal supplying
it) — then merged to `main` first. Ecommerce #9 followed once the Portal
half was confirmed live: 11 commits, 73 files, +3,227/−360, both upstream
syncs (Sals3-Official #228/#230) folded in.

Both release PRs were checked, before opening, against the two production
outages this repository has already had from exactly this class of mistake
(2026-08-10, 2026-08-12): no new required env var beyond what Production
already has, no migration, no image-path change, no storefront-facing field
removed.

## What was not done

**Production Stripe is still non-functional after this release, unchanged
either way by it.** `STRIPE_SECRET_KEY` on Production holds
`mk_1U0He72MZdPfpIostmegT9OF`, which Stripe itself rejects as "the ID of an
API key rather than the key itself," and there is no live `whsec_` signing
secret — the webhook still answers `500 webhook_not_configured`. A buyer on
`sals3.com` can now browse, sign in, and reach checkout (buyer login is
fixed by this same batch of work), but cannot complete a payment. This
extends, rather than resolves, the open risk already recorded in this
vault's "`STRIPE_WEBHOOK_SECRET` is unset in production" entry — the
specific detail that the configured key is the wrong *kind* of Stripe
credential, not merely an unset one, is new information from this session.

`sit`/`uat` Firebase-credential separation (the OIDC `sub` limitation above)
was identified and explicitly deferred, not fixed.

## Lessons

- **A shared secret that has to match across two separately-managed Vercel
  projects is a drift generator with no code to catch it.**
  `SALS3_STOREFRONT_API_TOKEN` diverging silently took down three
  environments' product rails, and nothing in either codebase could have
  detected the mismatch — only a person comparing two dashboard values
  could.
- **A platform-injected credential that only exists as a request header in
  a deployed function will look correct from `vercel env pull` on a
  developer machine and then fail on every real request.** The same value
  reads differently as a local env var (populated by the CLI for
  convenience) and as production reality (a header the runtime sets per
  invocation) — #6 shipped exactly this gap, undetected by a suite that ran
  locally.
- **An org-level cloud policy can retroactively invalidate a whole class of
  credential** — `disableServiceAccountKeyCreation` made every future
  service-account key issuance impossible platform-wide, which is why the
  fix here is a federation exchange rather than a new key, on all three
  environments at once.
- **A schema's own "never add `.strict()`" rule is what makes a two-repository
  release orderable at all.** The required-field addition on one side and
  the permissive-parse rule on the other are two halves of the same release
  contract; the ordering discipline (Portal main before storefront main) is
  only safe because that contract was upheld when the field was first added.
