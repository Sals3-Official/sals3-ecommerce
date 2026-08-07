---
tags: [session, sals3-portal, catalog, cj-integration, preflight]
aliases: [Automated Candidate Evaluation Pipeline Session]
created: 2026-08-07
updated: 2026-08-07
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-skills]]"
  - "[[sals3-implementation-phases]]"
---

# Session: automated candidate-evaluation pipeline

Historical record of what happened. Current verified state lives in
[[hot]] and spec section 26 — read those for "what's true now," this note
for "how it got there."

## Takeover and turnover correction

The session opened as a takeover from a prior agent's turnover prompt. The
prompt claimed two open PRs — `sals3-portal#6` and `sals3-ecommerce#48` —
that had to land together. Investigation found this was stale: `#6` had
already merged 2026-08-06, and a second PR (`#7`, same branch reused *after*
`#6` merged — a violation of the team's own PR checklist, later written up as
[[sals3-skills]] lesson 57) had merged that same morning carrying the naming/banner
fix. Only `#48` (the vault reconciliation) was genuinely still open. Verified
with `gh pr view`/`gh run list` rather than trusting the prompt, per
[[agent-operating-contract]]'s evidence hierarchy.

## The scope correction and the reopened decision

Bogs then gave a corrected, narrower turnover prompt: fix and automate the
existing CJ Candidate Explorer now, explicitly deferring Shopify-style
per-seller CJ connections, Supplier Apps, and AliExpress to later — see
[[parked-ideas-backlog]]'s new entry for that deferral.

The new scope asked for exactly the preflight decision engine that
[[parked-ideas-backlog]] had recorded, *hours earlier that same day*, as
parked pending an ADR-002 pilot rule pack. A challenge review was run before
touching any code — [[sals3-skills]] lesson 54 has the full sequence. Bogs confirmed
two resolutions before implementation started:

1. The three inputs needing real business/legal approval (prohibited
   category, destination market, price/margin floor) ship as **labelled
   placeholders** — spec §14.1's own exclusion list, the existing
   `PLACEHOLDER_MARKET_CODE`, and new versioned env-configured thresholds —
   never invented numbers, never presented as approved policy.
2. The missing scheduler infrastructure is closed with a `vercel.json` Vercel
   Cron entry calling a new protected route, rather than left unaddressed.

## What got built

Full architecture, rule-by-rule mapping (real vs. placeholder vs. not
implementable), and file list: spec
[[cj-candidate-to-sals3-product-draft-implementation-spec#26. Verified implementation status — updated 2026-08-07 (automated evaluation pipeline)]].
In short: CJ feed ingestion replaces the manual "Check for Sals3" click,
cheap screening runs before any CJ evidence call to save points, the existing
CJ evidence fetch is unchanged, a real qualification rule set produces one of
seven decision states with reason codes, and five new/changed screens display
the result automatically. Postgres `FOR UPDATE SKIP LOCKED` provides
job-lease semantics with no new infrastructure, matching the project's
no-Redis, no-paid-service defaults.

## Notable incidents this session

- A generated Drizzle migration was never applied to the local dev database,
  producing a generic "Failed query" error in the e2e suite that looked like
  a query-shape bug rather than a missing table. [[sals3-skills]] lesson 53.
- Editing the `/products` banner copy broke a pre-existing, unrelated
  Playwright spec's exact-substring locator — caught only by running the
  *full* e2e suite, not just the new spec file. [[sals3-skills]] lesson 56.
- File deletion (`rm`, `git rm`) was denied outright by the coding
  environment's own sandbox classifier, for tracked and fully reversible
  operations. Six superseded files were stubbed to `export {}` with
  explanatory comments instead of removed, and one retired route redirects
  rather than 404ing. [[sals3-skills]] lesson 55 — **these still need a real
  deletion pass from whoever/whatever has that permission**; see the PR
  description for the exact file list.
- The working branch (`feat/catalog-candidate-drizzle-persistence`) was the
  same branch this session had just finished flagging as twice-merged
  already. A fresh branch was cut from `origin/develop` instead of reusing
  it a third time. [[sals3-skills]] lesson 57.

## Verification

`npm run verify` (lint + format + typecheck + build×2 + 166 unit tests + 37
Playwright) all green in `sals3-portal`. `npm audit --audit-level=high`
passes — only the same pre-existing moderate `drizzle-kit`/`esbuild`
dev-dependency advisories already known and accepted. Confirmed Prisma was
not reintroduced (checked both `sals3-portal` and, on request, `sals3-ecommerce`
— the latter's `node_modules/@prisma` is an empty, unreferenced leftover
directory from the earlier Prisma-to-Drizzle migration, not an active
dependency).

## Still open

- The ADR-002/ADR-003 approval this whole feature is provisional on has not
  happened. Every placeholder-driven decision the pipeline produces should be
  read as "the engine works," not "the policy is approved."
- Category-required-attribute validation and image-dimension checks are not
  implemented — the former needs the ADR-002 taxonomy mapping wired up
  (separate task), the latter is not possible from CJ's current API surface.
- The scheduler is built but not deployed: `CRON_SECRET` needs setting as a
  real Vercel project env var, and the cron cadence/batch size are untuned
  starting values.
- Seven files need real deletion once that capability is available — see
  [[sals3-skills]] lesson 55.
