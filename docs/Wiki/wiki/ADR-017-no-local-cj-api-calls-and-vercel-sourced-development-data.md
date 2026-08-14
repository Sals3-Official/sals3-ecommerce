---
tags: [sals3, adr, cj-dropshipping, cost-control, points, development-environment, compliance]
aliases:
  - ADR-017
  - No Local CJ Calls
  - Vercel-Sourced Development Data
  - CJ Points Protection Rule
created: 2026-08-12
updated: 2026-08-12
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: db-write-guard-built-cj-runtime-guard-not-built
related:
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[hot]]"
---

# ADR-017 — No local CJ API calls; development data is sourced from Vercel

## Status

`approved`

> [!DANGER] Hard compliance rule, not a preference
> Owner decision, 2026-08-12, given during the `sals3-portal` local-environment
> recovery session. **A CJ Dropshipping API call must never originate from a
> local development machine.** CJ traffic belongs to the deployed Vercel
> environment only. Local development obtains catalogue data by copying it from
> the Vercel/Neon database.
>
> This is a spend control on a metered external resource. Treat a violation the
> same way this project treats a fabricated price or an invented stock number:
> a correctness failure, not a style disagreement.

## Relationship to policy that already exists

This ADR is deliberately narrow, because most of the CJ spend discipline is
**already approved and must not be re-legislated here**:

- **[[agent-operating-contract]] §9** (owner decision 2026-08-12, Bogs) is the
  constitutional rule: CJ points and QPS are a finite shared reserve, held first
  for checkout, order acceptance, final freight/inventory/order confirmation,
  live-product operations, and approved recovery. Every proposed call must first
  be answerable from persisted data, a webhook/event, a bounded cache, or human
  review. No UI render, search keystroke, pagination, drawer open, poll, or
  freshness timer may create a CJ request by default.
- **[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §1a** and its
  `CJ call-budget principle` section carry the product-level detail: the lean
  **All Supplier Products** intake, the 5,000 new-PID intake ceiling, the
  one-time backlog drain, and manual stock review.

Read both before this one. §9 already answers "may I add this call?" better than
a restatement would, including the point most cost rules miss — *"a call with no
listed point deduction can still have QPS and rate-limit impact."*

**What this ADR adds, and all it adds:**

1. An **environment boundary**. §9 forbids calls that happen *by default*; it
   does not say where CJ traffic may originate. This ADR does: CJ is a deployed
   environment's job, and a developer machine makes no product calls at all,
   deliberately or otherwise.
2. A **data-sourcing protocol**. How a local environment gets a realistic
   catalogue without CJ — the scoped restore from Neon, its table exclusions, its
   foreign-key remap, and its safety rules.
3. A **verified cost table**, with source anchors and the three corrections
   below, so future decisions argue from published figures instead of memory.

Nothing here weakens §9 or ADR-013 §1a. Where this ADR and either of those
appear to conflict, they win.

## Problem

CJ charges API points per endpoint against a documented daily allowance. A local
development machine that calls CJ spends the *same shared account budget* that
production depends on for order-critical work — and it spends it to reproduce
data the production database already holds.

The concrete case that produced this decision: a local `sals3` database was lost
and rebuilt empty. Making the local portal *look* like production would have
required rediscovering the catalogue through CJ:

Costed against CJ's published points table (verified 2026-08-12, see
*Source anchors* below — points are charged **per call, not per item**, so one
`/product/list` at `pageSize=200` costs 50 whether it returns 1 row or 200):

| Work | Calls | CJ cost |
|---|---|---|
| Discovery of ~1,411 PIDs at `pageSize=200` | 8 × `/product/list` @ 50 | 400 |
| Evidence per candidate, **as the code calls it today**: `/product/query` @ 10 + `/product/stock/getInventoryByPid` @ 10 + `/product/productComments` @ 0 | 3 | **20** |
| 1,405 candidates × 20 | 4,215 | 28,100 |
| **Total to rebuild one local environment** | | **≈ 28,500 points** |

Against the documented 50,000 points/day base allowance that is roughly **57% of
a day's budget**; because replenishment is `total / 1440` per minute (≈ 35/min,
≈ 2,080/hour) it takes about **14 hours to earn back**. All of it to reproduce
data that already sits in Neon and can be copied for nothing.

### Three costing corrections recorded here

Each of these was wrong in this project's own notes, or in mine, before the
points table was read line by line.

1. **Evidence capture is 20 points per candidate, not 30.**
   [[cj-candidate-to-sals3-product-draft-implementation-spec]] §26 says "roughly
   30 points per candidate". `/product/productComments` does not appear in CJ's
   points table at all, so the third call is free.

2. **Discovery is the cheap part, not the expensive part.** `/product/list` is
   the priciest *routine* endpoint per call (50 vs 10), which is what [[hot]]
   records — but a full catalogue sweep is only ~400 points, about **1.4%** of a
   rebuild. The per-candidate evidence fetch is the other 98.6%. A rule aimed
   only at "don't run discovery locally" would miss almost the entire cost.

3. **Half the remaining cost may be removable.** CJ documents
   `GET /product/query` (§1.5 *Product Details*) as returning the full variant
   array **with inventory already nested per country and warehouse**. If that
   holds at runtime, the separate `/product/stock/getInventoryByPid` call is
   redundant and evidence capture drops from 20 to **10 points per candidate** —
   halving a full pass from ~28,500 to **~14,450**.

   `sals3-portal` still makes that second call today
   (`src/modules/suppliers/providers/cj/cj-adapter.ts:209`), and it must not be
   deleted on the strength of a documentation reading alone: this repository has
   already been burned once by an inventory-shape assumption, when the
   product-level `totalInventoryNum` and per-variant `totalInventory` field
   names silently produced null stock for every variant while 36,338 real units
   existed ([[hot]]). Confirm against a real captured response first, then
   remove. This is the single largest points saving currently identified in the
   catalogue path, and it is a Vercel-side change, not a local one.

Worse, the failure mode is silent and cumulative: nothing in the code refuses a
local CJ call today, so any tick, script, test, or exploratory page load can
quietly spend production's budget, and the only symptom is an HTTP `429` for
someone else later.

## Evidence

Verified against CJ's official points documentation on 2026-08-12:

- **Daily allowance is `Base Points + Order Conversion`.** Every user gets
  50,000 points/day, reset at 00:00 UTC, plus `$1 USD = 100 points` earned from
  order conversion. Base points are deducted first. Per-minute replenishment is
  `total / 1440`.
- **Points are charged per call, not per returned item.** One
  `/product/list` at `pageSize=200` costs 50 points whether it returns 1 row or
  200.
- **Published per-call costs**, verbatim from the table:

  | Endpoint | Points |
  |---|---:|
  | `/product/queryProductsByImage` | **1000** |
  | `/product/list`, `/product/listV2` | 50 |
  | `/product/query` | 10 |
  | `/product/variant/query`, `/product/variant/queryByVid` | 10 |
  | `/product/stock/getInventoryByPid` | 10 |
  | `/product/stock/queryByVid`, `/product/stock/queryBySku` | 10 |
  | `/product/stock/privateInventory/*` | 10 |
  | `/logistic/freightCalculate`, `freightCalculateTip`, `partnerFreightCalculate` | 10 |
  | `/logistic/getSupplierLogisticsTemplate` | 10 |
  | `/webhook/product/subscribe`, `/webhook/product/unsubscribe` | 10 |

- **Every product endpoint CJ documents, cross-referenced against the charging
  table** (product API §1.1–6.1, fetched the same day). The free column is the
  useful half: these are what a developer may reach for instead of a charged
  call.

  | Documented endpoint | Points |
  |---|---:|
  | `GET /product/getCategory` — category tree, 3 levels | **0** |
  | `GET /product/globalWarehouseList` — warehouses + country codes | **0** |
  | `GET /product/productComments` — reviews | **0** |
  | `POST /product/addToMyProduct` | **0** |
  | `GET /product/myProduct/query` | **0** |
  | `POST /product/sourcing/create`, `/sourcing/query` | **0** |
  | `POST /product/queryVideosByProductId` | **0** |
  | `POST /authentication/getAccessToken` | **0** |
  | `GET /product/list`, `/listV2` — max 200 rows/page | 50 |
  | `GET /product/query` — detail **incl. variants with nested inventory** | 10 |
  | `GET /product/variant/query`, `/variant/queryByVid` | 10 |
  | `GET /product/stock/queryByVid`, `/queryBySku`, `/getInventoryByPid` | 10 |
  | `GET /product/queryProductsByImage` | **1000** |

  "Free" here means *absent from the charging table* — that is the only evidence
  available either way, and §9 warns that an uncharged call still consumes QPS.
  If CJ adds any of these later, this ADR's §4 exception and the costing above
  must both be redone.

- **The list endpoints do not include variants or inventory.** CJ documents the
  variant array with nested per-country `inventories` on the *detail* response
  (§1.5), not on `/product/list` or `/listV2`. That is why a candidate needs a
  second call at all — and why the third call may be redundant (correction 3
  above).
- **`/product/queryProductsByImage` is a 1000-point trap** — 20× a catalogue
  page and 100× a detail call. It is not used anywhere in Sals3 today and must
  not be introduced casually.
- Exhausted points return HTTP `429`. CJ can also suspend API access after 30
  consecutive days with zero transaction amount
  ([[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §5).
- Points are per **CJ account**, and ADR-006/ADR-008 make the credential
  seller-owned. Local and production currently resolve the *same* Sals3 Official
  Dropshipper connection, so there is no separate development quota to spend.
- The production database already holds the discovered catalogue. Copying it
  costs zero CJ points and yields *more* faithful local data than a fresh
  partial rediscovery would.
- ADR-013 §1a already establishes the principle for a narrower case: the raw
  **All Supplier Products** catalogue must not spend a CJ inventory call merely
  because a row was viewed. This ADR generalises that posture to the whole local
  environment.

## Decision

### 1. Local machines make no CJ product calls, ever

The following must never be invoked from a developer machine, a local test run,
a local script, or a locally rendered page:

```text
50    /product/list, /product/listV2            (discovery)
10    /product/query                            (detail + embedded variants)
10    /product/variant/query, /variant/queryByVid
10    /product/stock/getInventoryByPid          (inventory)
10    /product/stock/queryByVid, /queryBySku
10    /product/stock/privateInventory/*
10    /logistic/freightCalculate + freight variants
10    /webhook/product/subscribe, /unsubscribe
1000  /product/queryProductsByImage             (never used in Sals3; keep it that way)
0     /product/productComments                  (free today, still forbidden - see below)
```

`/product/productComments` costs nothing today, and is still on this list. Two
reasons: it is only ever called as the third leg of an evidence capture whose
first two legs cost 20 points, so permitting it locally invites the expensive
pair alongside it; and a "free" classification rests entirely on the endpoint's
absence from CJ's charging table, which CJ can change without telling us.

There is no "just once to check" exemption. If a developer needs to see what a
response looks like, they read a persisted `supplier_snapshots` row or a stored
fixture.

### 2. CJ traffic is a deployed-environment responsibility

Discovery, evidence capture, evaluation, webhook subscription, reconciliation,
and freight quoting run **only** in the Vercel environment, against Neon, under
the existing points governance in
[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §5 and
[[ADR-010-catalog-decision-governance-and-shadow-enforcement]] §12.

Production continues to call CJ normally. Nothing in this ADR reduces
production capability; it removes a second, unbudgeted caller.

### 3. Local catalogue data is a scoped copy of the Vercel database

The approved way to populate a local environment is a **scoped, data-only
restore** from Neon:

```text
copy      supplier_candidates
          candidate_evaluations
          supplier_snapshots
          discovery_* coverage state when a scenario needs it

never     auth_users, auth_accounts, auth_sessions, auth_two_factors
          supplier_connection_secrets
          supplier_webhook_secrets
          any table holding a credential, session, or 2FA secret
```

Rules that make the copy safe:

- **Never copy the whole database.** Real accounts, password hashes, live
  session tokens, 2FA secrets, and encrypted supplier credentials have no
  business on a laptop, and none of them are needed to reproduce a catalogue
  screen.
- **Remap tenant foreign keys.** A local `supplier_connections.id` differs from
  production's. `supplier_candidates.supplier_connection_id` and every other
  tenant reference must be rewritten to the local row, inside one transaction,
  before the data is considered restored.
- **Verify schema parity first.** Confirm the production dump's columns match
  the local migration state before applying it. A dump taken from an
  older-migrated environment must not be restored over a newer local schema.
- **Never commit a dump.** Add the artefact to `.gitignore` *before* creating
  it. A catalogue dump is business data, and a full dump would be a credential
  leak.
- **Copied data is read-only evidence.** It carries production's capture
  timestamps and checksums. It must not be presented as freshly observed, and a
  copied snapshot never satisfies a freshness gate.

### 4. The one narrow exception, and its conditions

`npm run bootstrap:cj` performs exactly one CJ call —
`POST /authentication/getAccessToken` — to create the local
`supplier_connections` row. It touches no product endpoint, and that endpoint
**does not appear in CJ's points table, so it costs 0 points.**

It is therefore permitted locally, subject to:

1. it remains the *only* CJ call the run makes — if the script ever grows a
   product call, this exception dies with it;
2. the run is reported afterwards, naming the endpoint and the zero cost;
3. an agent still asks first, because "free" is inferred from absence in CJ's
   charging table rather than from a positive statement, and because a rule with
   one silent exception is a rule nobody trusts.

Prior approval is not standing approval. Re-verify the cost against the points
table if CJ revises it.

### 5. Guards that must exist, and their current state

These are the enforceable controls. Only the first two are true today; the rest
are approved and **not yet implemented**, and this ADR must not be read as a
claim that they are.

| Guard | State |
|---|---|
| `CRON_SECRET` unset in `.env.local`, so `evaluate-tick` returns `401` | ✅ true today |
| Discovery control routes gated by their own secret | ✅ true today |
| An automated check that fails when local test/script code imports the CJ adapter | ❌ not built |
| A runtime refusal in the adapter when a product endpoint is called outside a deployed environment | ❌ not built |
| A points-spend assertion in CI | ❌ not built |

Until the runtime refusal exists, this rule is enforced by discipline and
review. That is a real weakness and is recorded here rather than papered over:
**the current protection is a convention, not a mechanism.** Building the
adapter-level refusal is the recommended next unit of work under this ADR.

## Strict compliance checklist

Before writing, changing, or running anything that could reach CJ, an agent or
developer must be able to answer all of these:

1. Does this code path call a CJ endpoint? If unsure, trace it to the adapter
   rather than assuming.
2. Can it execute on a local machine — through a page render, a Server Action, a
   test, a script, a tick, or a queue consumer?
3. If yes to both: stop. Source the data from the database instead, or move the
   work to the deployed environment.
4. Does the change add a new caller of `CjSupplierAdapter`? Name it explicitly
   in the completion report.
5. Does any new test or fixture require a live response? Use a stored snapshot.
6. If a local CJ call is genuinely unavoidable, request owner approval, state
   the exact endpoint and expected point cost, and wait.

A completion report for work touching this surface must state, explicitly,
either **"no CJ call was made"** or the exact endpoints called and why they were
approved. Silence is not an acceptable answer.

## Strongest objection

Forbidding local CJ calls makes some development slower and some debugging
harder. A developer investigating a supplier-response bug may genuinely need to
see a live response, and a stored snapshot can be stale or missing the field in
question.

A second, sharper objection: once costed honestly, one full local rebuild is
~28,500 points — a bit over half a day's base allowance, recovered in about 14
hours. That is not ruinous, so is a hard prohibition proportionate?

Yes, for three reasons the headline number hides. The allowance is **shared with
production**, where the same points cover order submission, accepted-order
protection, and live-offer reconciliation — work that cannot wait 14 hours.
Nothing bounds the number of local rebuilds, so the cost is not 28,500 once but
28,500 per incident, on every machine. And the spend buys nothing: the identical
data is one `pg_dump` away. A control is proportionate when the benefit is zero,
regardless of how modest the cost looks in isolation.

The first objection is real but narrow, and the remedies are cheaper than the
risk.
Persisted `supplier_snapshots` already retain normalised evidence with checksums
and capture times; the deployed environment can capture a fresh snapshot on
demand and the developer can copy it down; and §4 leaves a supervised path open
for the rare case where nothing else will do. Against that, an unbudgeted local
caller can exhaust a shared daily allowance and stall order-critical production
work, which is a materially worse failure than a slower debugging session.

## System impact

- **Cost:** strictly lower. Removes an entire class of unbudgeted spend against
  a metered external account.
- **Security and privacy:** improves, provided §3's exclusions hold. The scoped
  copy deliberately keeps credentials, sessions, and 2FA secrets out of
  development environments.
- **Data:** local catalogue data becomes a copy of production evidence rather
  than an independent partial rediscovery. Capture timestamps and checksums
  travel with it and must be respected.
- **Modules:** future work in the `CjSupplierAdapter` boundary (the runtime
  refusal), the discovery control routes, and CI.
- **Workflow:** local environments are populated by a documented restore step
  rather than by running discovery.
- **Rollback:** none needed; this ADR removes behaviour rather than adding it.

## Required verification

- A local test run completes with zero outbound requests to a CJ host.
- The `evaluate-tick` route refuses to run without `CRON_SECRET`, and
  `.env.local` does not define it.
- Discovery control routes refuse an unauthenticated call.
- A scoped restore populates the catalogue screens with no CJ request.
- A restore that omits the FK remap fails loudly rather than partially applying.
- No dump artefact is tracked by git.
- Copied evidence is never counted as fresh by a freshness or publication gate.

## Supersession

None. This generalises [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]
§1a and §5 from "do not spend inventory calls on catalogue browsing" and
"reserve points for order-critical work" into an environment-level boundary. It
does not change qualification rules, evidence semantics, publication gates, or
the seller-owned credential model in ADR-006/ADR-008.

## Source anchors

Fetched and costed on 2026-08-12. Re-verify before relying on any figure above;
CJ has revised this table before.

- API points rules and the full per-endpoint charging table:
  <https://developers.cjdropshipping.com/en/api/api2/standard/points.html>
- Access frequency limits:
  <https://developers.cjdropshipping.com/en/api/api2/standard/limit.html>
- Product endpoints:
  <https://developers.cjdropshipping.com/en/api/api2/api/product.html>
- Logistics endpoints:
  <https://developers.cjdropshipping.com/en/api/api2/api/logistic.html>
- Webhooks:
  <https://developers.cjdropshipping.com/en/api/start/webhook.html>

## Corrections owed to other notes

The costing above contradicts two existing vault statements. Both should be
fixed where they live:

- **[[cj-candidate-to-sals3-product-draft-implementation-spec]] §26** — "Roughly
  30 points per candidate" is wrong; it is 20 today, because
  `/product/productComments` is not a charged endpoint.
- **[[hot]]** — "`/product/list` costs more points than common detail/variant/
  freight operations" is true per call (50 vs 10) but reads as though discovery
  is the dominant cost. For a full catalogue it is ~1.4% of the total; the
  per-candidate evidence fetch is the rest.

## Recommended follow-up, outside this ADR's scope

**Drop `/product/stock/getInventoryByPid` from evidence capture, on Vercel.**
CJ documents `/product/query` as already returning per-variant, per-country
inventory. Confirming that against one real captured response and then removing
the second call halves evidence capture from 20 to 10 points per candidate —
roughly **14,050 points saved per full catalogue pass**, and a permanent
reduction in every future refresh.

Preconditions before touching it, because the downside is silent bad stock data:

1. Read one stored `supplier_snapshots` row's raw `/product/query` response and
   confirm the nested `inventories` carry the same per-country quantities the
   separate call returns.
2. Keep `cjInventory`, `factoryInventory`, `totalInventory`, and
   `verifiedWarehouse` intact — ADR-013 §1 requires all four preserved, and the
   detail response must be checked to actually carry them.
3. Watch the field-name trap from [[hot]]: product-level entries use
   `totalInventoryNum`, per-variant entries use `totalInventory`. One shared Zod
   schema across both silently produced null stock for every variant once
   already.
4. Add a regression test asserting the parsed per-variant totals are non-null for
   a fixture with known stock, so the failure cannot recur silently.

This is deliberately not decided here. It is an evidence-path change governed by
ADR-013 §1, and it belongs to whoever next works the Vercel-side capture code.

## Cross-references still owed

These notes should point here, and were **not** edited when this ADR was
written because a concurrent `sals3-portal` task held them in the vault working
tree. Applying them is outstanding work, not a decision:

- **[[hot]]** — add this rule to the current-state cache, next to the CJ points
  entries under "Corrected external facts", and to `related`.
- **[[index]]** — list this ADR under *Catalog and supplier pipeline*.
- **[[agent-operating-contract]]** — add a one-line hard rule to §3's refusal
  list: an agent must refuse to make a local CJ call, and must report either
  "no CJ call was made" or the exact endpoints called.
- **[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]** — note in
  §5 that the environment boundary now lives in this ADR.
- **[[cj-candidate-to-sals3-product-draft-implementation-spec]]** — note in §26
  that local environments are populated by restore, not discovery.

## Amendment — 2026-08-12: the database half is now a mechanism

> [!IMPORTANT] Supersedes one row of §5's guard table
> §5 listed every enforcement control as either "true today" or "not built", and
> said plainly that *"the current protection is a convention, not a mechanism."*
> That is now half wrong, in the good direction. This section is the correction;
> where it and §5 disagree, this section is current.

### What was built

A **remote-write guard** now refuses any database-writing command whose
`DATABASE_URL` does not resolve to this machine.

```text
src/lib/db/remote-write-guard.ts   pure decision logic, 21 unit tests
scripts/guard-remote-db.mts        thin CLI, runs before the guarded process
```

It prefixes six commands in `package.json`:

```text
db:migrate · seed:taxonomy · seed:taxonomy-presets
bootstrap:cj · create:portal-user · approve:portal-user
```

`db:generate` (offline, writes only files) and `db:studio` (a read/browse UI
where connecting to a remote host on purpose is legitimate) are deliberately
left unguarded.

### Why a prefix rather than a check inside each script

Two reasons that a per-script check could not satisfy. It covers `drizzle-kit`,
a third-party binary this repository cannot add a check to. And it refuses
*before the guarded process starts*, so there is no window in which a partially
run command has already written.

### The hazard it closes

Every write script here — and `drizzle.config.ts` — reads exactly one file:
`process.loadEnvFile('.env.local')`. Paste a production connection string there
to run a single read-only query and **all of them silently repoint at
production**: `db:migrate` alters the live schema, `seed:taxonomy` inserts 1,345
rows, `bootstrap:cj` creates a supplier connection and spends a CJ call,
`create:portal-user` provisions a real account. None of them ask first, and
`db:migrate` succeeds quietly when there is nothing new to apply — so the
mistake need not announce itself.

Verified against a deliberately faked remote `DATABASE_URL`:

| Case | Result |
|---|---|
| `localhost` → `seed:taxonomy` | ran normally |
| fake Neon host → `db:migrate` | **exit 1**, never reached `drizzle-kit` |
| fake Neon host → `bootstrap:cj` | **exit 1**, and no CJ call |
| `ALLOW_REMOTE_DB_WRITE=1` | allowed, with a warning naming the remote target |
| `ALLOW_REMOTE_DB_WRITE=true` | still refused — only the exact string `1` opts in |

A refusal prints the host and database name only, **never the connection
string**. The password lives in that string, and a guard that leaks the
credential it protects into a terminal, a CI log, and a screenshot would be
worse than no guard. There is a test asserting exactly that.

It also fails closed on inputs it cannot read: a missing `DATABASE_URL` and an
unparseable one are separate refusal reasons, and any unrecognised host is
treated as remote rather than assumed local.

### The operator-side pattern this depends on

Keep a production URL **out of `.env.local`**. Put it in `.env.prod-readonly`:
covered by `.gitignore`'s `.env*`, and read by nothing — not Next.js (which
loads only `.env`, `.env.local`, `.env.$(NODE_ENV)`), not `drizzle.config.ts`,
not any script here. Use it solely for an explicit read-only `pg_dump`.

Do **not** name it `.env.production`; `next build` and `next start` load that
one. This is documented in the portal `README.md`.

### Corrected §5 state

| Guard | State |
|---|---|
| `CRON_SECRET` unset locally, so `evaluate-tick` returns `401` | ✅ |
| `DISCOVERY_CONTROL_SECRET` unset locally, so discovery control **and** AJ's new `recheck-policy-version` route return `401` | ✅ |
| Database-writing npm commands refuse a non-local `DATABASE_URL` | ✅ **built 2026-08-12** |
| A check that fails when local test/script code imports the CJ adapter | ❌ not built |
| A runtime refusal in the adapter for product endpoints outside a deployed environment | ❌ not built |
| A points-spend assertion in CI | ❌ not built |

### What this still does not fix

The guard protects the **database**, not CJ. `bootstrap:cj` is blocked only when
the *database* is remote; against a local database it still makes its one
(zero-point) auth call, and nothing prevents newly written code from calling a
charged CJ endpoint from a developer machine.

So the honest position after this amendment: **the database is protected by a
mechanism; CJ is still protected only by convention.** The adapter-level runtime
refusal remains the recommended next unit of work under this ADR, and it is the
one that would make §1 self-enforcing.
