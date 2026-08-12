---
tags: [sals3, sals3-portal, session-note, database, recovery, guards, cj-points, honest-degradation]
aliases:
  - Local Environment Recovery
  - Remote Write Guard
  - Dropped Database Recovery
created: 2026-08-12
updated: 2026-08-12
status: implemented-uncommitted
authority: implementation-state
owner_approved: false
related:
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-portal-canonical-product-catalog-backend]]"
  - "[[hot]]"
---

# `sals3-portal` local environment recovery and database guards

> [!WARNING] Implemented but NOT committed
> Every code change below sits uncommitted in the `sals3-portal` working tree on
> branch `fix/degrade-honestly-when-database-unreachable`, at `HEAD f180114`
> (level with `origin/develop`). Nothing was pushed and no PR was opened, by
> owner instruction. Sixteen files.

## What happened

The local `sals3` PostgreSQL database was dropped. The portal did not degrade —
it red-screened. Overview, All Supplier Products, Candidate Pipeline, and
Supplier Apps all threw `read ECONNRESET` from inside a Server Component.

The database was genuinely gone, not unreachable: the cluster was up with 16h45m
uptime, listening on `5432`, the `sals3_app` role intact, but `pg_database` held
only `postgres`, `template0`, `template1`. A direct connection returned
`3D000 — database "sals3" does not exist`. No backup existed anywhere.

Production was never affected. `sals3-portal.vercel.app` runs against its own
Neon database and kept serving 1,411 candidates throughout — `localhost` inside
a Vercel function is that function's own container, never a developer laptop.

## Recovery, and why it needed a privilege nobody had

`CREATE DATABASE` requires `CREATEDB`. `sals3_app` had `rolcreatedb = false` and
was not a superuser, so the application credential could not rebuild its own
database — verified by attempting it and receiving
`42501 permission denied to create database`. The `postgres` superuser password
was unknown: set during an install nobody recorded, absent from pgAdmin (never
opened, no `pgadmin4.db`), and absent from every session transcript searched.
`pg_hba.conf` was `scram-sha-256` on all lines, so no trust path existed.

The resolution was PostgreSQL's documented recovery, run by the owner in an
elevated shell: back up `pg_hba.conf`, set the two loopback rules to `trust`,
restart, create the database, **grant `CREATEDB` to `sals3_app` so this can
never recur**, then restore `pg_hba.conf` and restart again. The restore ran
from a `finally` block, which mattered — the first attempt failed on a real bug
in the script (`.Trim()` on a `null` from a zero-row `psql` query) and
authentication was still put back correctly before it exited.

Afterwards: 16 migrations applied for the first time against real Postgres
(55 tables), 1,345 taxonomy rows seeded, a `dev-user` seller account created,
the CJ provider row seeded, and `bootstrap:cj` run — **one CJ call**, the
zero-point `authentication/getAccessToken`. No discovery, no evaluation.

## Four fixes, and two bugs they exposed

### 1. Honest degradation when the database is unreachable

`isDatabaseConfigured()` only ever answered a narrower question than its callers
assumed: *is `DATABASE_URL` a non-empty string?* A URL pointing at a stopped
server or a dropped database sails past it.

New `src/lib/db/availability.ts` classifies genuine unavailability — socket
errnos, Postgres connection class `08`, `3D000`, `57P0x`, `53300`, and
`postgres.js`'s own `CONNECTION_*` codes — walking the `cause` chain because
Drizzle wraps every driver error, exactly as `constraint-errors.ts` already has
to.

What it refuses to match matters more than what it matches:

- **`42P01 undefined_table` still throws.** The database answered; a table is
  missing, which means migrations were not applied. Rendering a tidy empty page
  there would hide an unmigrated deployment behind a state that looks
  deliberate.
- **`28P01` authentication failures still throw.** A wrong credential is a
  configuration defect someone must see.
- **`PermissionError` still throws.** An infrastructure guard must never soften
  an authorization decision.

`readOrUnavailable()` wraps the authorization call *together with* the reads it
guards. Wrapping only the reads was the actual gap: resolving the seller account
is itself a query, so the page still crashed one line before the part that had
been carefully protected.

### 2. The sidebar was lying

The rail footer read **"Connect a Supplier App to start sourcing"** whenever the
database was unreachable — telling a seller with a healthy CJ connection to go
and connect one. `ConnectionSummary` collapsed "no connection" and "could not
find out" into the same `null`. They are now different values, and the unknown
case reads **"Cannot check supplier connections right now"** in muted styling,
not the amber that this rail uses for a genuinely degraded connection.

### 3. Wrong log level, five times per page

The first version logged at `console.error`, which Next's dev overlay elevates
into a red *Console Error* panel — on a page that had recovered correctly. It
now logs at `warn` and throttles to one line per surface per minute. An
unreachable database fails every read, so one page load was emitting the same
line five times; in production a short outage would have buried the log.

A red overlay on a page that handled its failure teaches a developer to dismiss
the overlay, which is precisely when it stops protecting them.

### 4. Two bugs the new guard surfaced

Both had been hidden behind a bare `catch {}` in `shell-data.ts`.

**`sellerId: 'seller-001'`** — the dev bypass session hard-coded a non-UUID left
over from before seller accounts were UUID-keyed. Every nav badge query and the
footer connection health, on *every* portal page, was sending `'seller-001'`
where Postgres expected a `uuid` and failing with `22P02`. The rail simply
rendered empty forever and looked like a design choice. `getSession()` now
resolves the real seller-account UUID for the bypass path, falling back to
`'system'` rather than throwing — it runs before every page's own database
guard.

**A UTF-8 BOM in `.env.local`** — the first key was literally
`"﻿CJ_API_KEY"`, so `process.env.CJ_API_KEY` was `undefined` while the file
plainly showed the key with a 46-character value. `bootstrap:cj` reported
`CJ_API_KEY is not set` and was correct. Three bytes removed; no value changed.

## The remote-write guard

The larger hazard, once a production connection string enters the picture: every
write script here — and `drizzle.config.ts` — reads exactly one file,
`process.loadEnvFile('.env.local')`. Paste a production URL there for one query
and **all of them silently repoint at production**.

`src/lib/db/remote-write-guard.ts` (pure, 21 unit tests) plus
`scripts/guard-remote-db.mts` (thin CLI) now prefix six commands:

```text
db:migrate · seed:taxonomy · seed:taxonomy-presets
bootstrap:cj · create:portal-user · approve:portal-user
```

A prefix rather than a check inside each script, for two reasons a per-script
check cannot satisfy: it covers `drizzle-kit`, a third-party binary this repo
cannot modify, and it refuses *before the guarded process starts*, so no
partially-run command has already written.

Verified against a deliberately faked remote URL:

| Case | Result |
|---|---|
| `localhost` → `seed:taxonomy` | ran normally |
| fake Neon host → `db:migrate` | **exit 1**, never reached `drizzle-kit` |
| fake Neon host → `bootstrap:cj` | **exit 1**, no CJ call |
| `ALLOW_REMOTE_DB_WRITE=1` | allowed, warning names the remote target |
| `ALLOW_REMOTE_DB_WRITE=true` | refused — only the exact string `1` opts in |

Refusals print host and database only, **never the connection string** — the
password is in it, and a guard that leaks the credential it protects into a
terminal, a CI log, and a screenshot would be worse than no guard. There is a
test asserting that. It also fails closed: missing and unparseable URLs are
distinct refusal reasons, and any unrecognised host is treated as remote.

`db:generate` (offline) and `db:studio` (read/browse) are deliberately
unguarded. Full detail in
[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]'s 2026-08-12
amendment.

## Two script papercuts

**`seed:taxonomy` and `seed:taxonomy-presets` never read `.env.local`.** Both
threw `DATABASE_URL is not set.` on a machine where it was correctly configured
all along — `tsx` runs them outside Next.js and neither called
`process.loadEnvFile`. The other three scripts and `drizzle.config.ts` always
had. Three lines each, matching the existing pattern.

**Missing local auth configuration.** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
and `AUTH_EMAIL_CONSOLE_FALLBACK` were absent and are now set.
`CRON_SECRET` was deliberately **left unset** — it arms `evaluate-tick`, and
this machine must not evaluate. Vercel keeps its own.

Also noted, not changed: `.env.local` contains duplicate
`SUPPLIER_CREDENTIAL_MASTER_KEY_BASE64` and `SALS3_STOREFRONT_API_TOKEN` keys.
Deduplicating a secrets file requires knowing which value is authoritative, so
it was flagged rather than guessed at.

## A shared-tooling break, fixed in passing

`npm run lint` began failing with **1,016 errors across 320 files**, none of them
real and none in this work. Another agent's locked git worktree at
`.claude/worktrees/orders-parcel-workspace` is a full second checkout of the
repository; ESLint linted every source file twice and then failed the copy,
which has no `node_modules`, so every devDependency import resolved as
extraneous. This broke `npm run lint` — and therefore `npm run verify` — for
everyone. `.claude/**` added to the ESLint global ignores.

## CJ points: three corrections, verified against the published table

The costing in this session was wrong twice before it was right, and the record
matters more than the conclusion.

| Claim | Source | Correct |
|---|---|---|
| ~30 points per candidate | [[cj-candidate-to-sals3-product-draft-implementation-spec]] §26 | **20** — `/product/productComments` is not a charged endpoint |
| `/product/list` is the dominant cost | [[hot]] | true **per call** (50 vs 10), but ~1.4% of a full rebuild; evidence capture is 98.6% |
| 20 is the floor | — | possibly **10**: CJ documents `/product/query` as already returning variants with nested per-country inventory, making `getInventoryByPid` redundant |

Points are charged **per call, not per item** — one `/product/list` at
`pageSize=200` costs 50 whether it returns 1 row or 200.

**The largest identified saving:** dropping `/product/stock/getInventoryByPid`
from evidence capture would halve it, ~14,050 points per full catalogue pass. It
is a Vercel-side change and must not be made on a documentation reading alone —
`cj-adapter.ts:209` still calls it, and this repository has already shipped a
silent null-stock bug from an inventory-shape assumption. Preconditions are
listed in ADR-017.

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 |
| `npm run lint` | ✅ 0 (from 1,016) |
| `npm run format:check` | ✅ |
| `npm run test:run` | ✅ **1,158 passed**, 4 skipped |
| `npm run build` | ✅ |
| 6 portal routes | ✅ all render |
| Browser console | ✅ zero errors |
| `evaluate-tick` · `discovery/start` · `recheck-policy-version` | ✅ all `401` |
| `candidate_evaluations` | **0** — nothing evaluated locally |

`npm run typecheck:clean` and `npm run test:e2e` could **not** run: both need the
`.next` directory or a second dev server, and the owner's dev server holds both.
Plain `tsc --noEmit` passes, so this is an environment conflict, not a type or
test failure.

## Still open

- **Local has no catalogue data.** 0 candidates against production's ~1,411. The
  approved route is a scoped `pg_dump` restore from Neon (ADR-017 §3), pending
  the Vercel `DATABASE_URL` from AJ. Fabricating candidate rows to make the UI
  match was refused — that is supplier data, and ADR-013 §1a forbids it.
- **CJ is still protected only by convention.** The adapter-level runtime
  refusal is unbuilt.
- **An unpushed commit exists elsewhere:** `7605776 fix(pricing): prove policy
  ownership in the mutating statement` sits on the local-only branch
  `fix/pricing-policy-authorization-and-revision-history`, 12 files,
  +1,053/−210, with no remote. If that branch is deleted the work is gone.
- **`hot.md` and `index.md` still owe entries** for this note and ADR-017. Both
  were held by a concurrent task in the vault working tree and deliberately left
  untouched.
