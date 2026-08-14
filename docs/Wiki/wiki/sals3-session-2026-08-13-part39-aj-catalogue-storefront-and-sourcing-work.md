---
tags:
  [
    sals3,
    sals3-portal,
    session-log,
    reconstructed,
    aj,
    storefront,
    catalogue,
    candidate-detail-drawer,
    curated-lanes,
    live-cj-browse,
    images,
  ]
aliases:
  [
    AJ Session Log 2026-08-13,
    Storefront Catalogue Fix Session,
    Candidate Detail Drawer Session,
  ]
created: 2026-08-13
updated: 2026-08-13
status: current-state
authority: reconstructed-session-log
owner_approved: false
implementation_status: mixed-see-per-item-status
related:
  - '[[hot]]'
  - '[[team-profile-and-collaboration-preferences]]'
  - '[[agent-operating-contract]]'
  - '[[ADR-003-international-availability-shipping-and-pricing]]'
  - '[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]'
  - '[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]'
  - '[[sals3-portal-canonical-product-catalog-backend]]'
  - '[[sals3-portal-category-price-outlier-detection-plan]]'
---

# AJ's session work, 2026-08-13 — reconstructed from git history

> [!WARNING] This is a reconstructed record, not AJ's own first-person account
> AJ (git identity `MacBook@MacBook-Pro.local` on his machine, merges show
> under his GitHub handle "AJ NOCOLAI GARRIGUES") had **not logged any of this
> in the Obsidian vault** as of 2026-08-13 evening — confirmed by searching
> the vault for "candidate-detail-drawer" and "storefront-catalogue-api" and
> finding nothing. Bogs asked for this work to be documented anyway, so this
> note was built by an agent reading `sals3-portal`'s git log and commit
> messages directly (PRs #52, #53, #56, #57, #59, #61, #62, #64, #65, #66,
> #69, plus one un-PR'd chore commit), not by AJ describing his own work.
> Every commit carries `Co-Authored-By: Claude Opus 5`, so this was AJ working
> with an AI agent, not solo — the commit messages themselves are unusually
> detailed (verification notes, explicit "not verified" caveats) and this note
> largely consolidates rather than re-derives that content.
>
> AJ should review this note and correct anything wrong or add reasoning this
> agent could not infer from the commits alone.

## Summary of what shipped today (AJ's side)

Ten PRs across four workstreams, in this rough order: candidate detail drawer
(foundation → wiring → perf) → capacity-consume bugfix → image CDN fix →
one-way curated lanes → live CJ browse for All Supplier Products → Product
Catalogue bulk-add → rich catalogue restore → **reverted at owner request** →
data purge → storefront catalogue API fix. All ten `npm run verify` clean
(lint/format/typecheck/build/unit/e2e/audit) per their own commit messages.
Every commit is explicit about what was and was NOT verified against real
data — the local database was empty throughout this whole session, so a
recurring caveat across nearly every PR is "rests on unit tests, never
clicked/seen against a real row."

---

## 1. Candidate detail drawer (PRs #61, #62)

Clicking a Product Sourcing row did nothing before this — no way to see one
candidate's full record (evaluation mechanics, screening findings, stock
attestation history, discovery signals, CJ evidence when it exists).

- **Foundation** (`c980020`): `?candidate=<uuid>` query param, a tenant-scoped
  `resolveCandidateDetail` (filters on `supplier_connections.seller_account_id`
  per ADR-008, never the legacy `intended_seller_id` — a cross-tenant or
  unknown id costs exactly one statement, asserted by test), a shared
  `CandidateRow` component that guards against interactive-descendant clicks
  hijacking row-level controls like "Recheck now".
- **Wiring** (`9aa9d11`): five read-only tabs (Overview, Stock, Supplier
  evidence, Screening & queue, History), grouped by the question a reviewer
  asks rather than by which table a field lives in. `page.tsx` shrank 237 →
  148 lines. Three deliberate honesty decisions: absence is never silent (a
  "never fetched" section gets a dashed border and no timestamp; a real zero
  from CJ gets a solid border and always a timestamp — only 19 of 87,966
  candidates have a captured CJ snapshot, so most sections are empty by
  default and must not be misread as "confirmed zero stock"); a manual stock
  attestation outranks CJ evidence in the Stock tab (ADR-013); `score` is
  never rendered at all rather than showing a misleading dash (the column is
  reserved and always null).
- **Perf + photo** (`005e804`): opening the drawer dropped from 19 open/12
  close DB statements to 4 (warm cache) via `React.cache` memoization of
  session/seller-account reads plus a 30s tagged `unstable_cache` for status
  counts — found that `seller_accounts` was read 3× per render and
  `countCandidateStatusSummary` ran twice (nav badges + tab bar) for no
  reason. Also added the one product photo this database can show
  (`feed_snapshot.imageUrl` — the only image address stored anywhere; no
  gallery exists and can't until a re-fetch is funded).
- **Known consequence documented in the README**: the 30s count cache means a
  tab can briefly read one row-count higher/lower than what's actually served,
  and a page boundary can clamp a seller back one page — both self-heal, and
  this is called out as the deliberate trade for the short TTL rather than an
  oversight.
- **Not verified**: no real candidate row was ever clicked — local DB was
  empty. Rests on unit tests (47, then more added per PR) and honestly-skipped
  e2e cases.

## 2. Real production bug fix: capacity-consume date-bind (`168ff96`)

Root-caused a live production incident, not a hypothetical: `tryConsumeNewPidCapacity`
interpolated a raw JS `Date` inside a raw SQL `CASE` expression. A value inside
a raw `sql` template reaches `postgres.js` as an untyped bind, and the driver
throws `ERR_INVALID_ARG_TYPE` on a raw `Date` there — this is the *first*
statement any genuinely new PID reaches, so the first real product of the
first 600-product wave hit it, the whole ingest transaction rolled back, and
the queue redelivered forever with the wave stuck at `admitted_count=0`,
starving every discovery lane behind it. Confirmed against a real production
log line, 2026-08-12 16:04:33 UTC. Fixed by binding `now.toISOString()`
instead; a new regression test walks the actual bind payload and fails
against the old code.

## 3. Image delivery fix (`02acde6`) — Vercel image optimizer had run out of quota

Every image in the portal was rendering broken. Root cause: Vercel's Image
Optimization allowance was exhausted, so `/_next/image` answered `402
OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` on every request — verified live
against production, including a request for a local asset (`favicon.ico`),
which proved the optimizer itself was refusing rather than an upstream CJ
fetch failing. Fix: route all images through a custom loader that asks CJ's
own CDN (`cf.cjdropshipping.com`, which supports Alibaba-OSS resize/format
instructions) to do the resize/WebP conversion for free — measured 314,871
bytes down to 1,380 bytes for a 40px table thumbnail at 2×. The brand mark
asset was also shrunk from a 2000×2000 274KB PNG down to a 96×96 5.4KB one.
**Restoring Vercel's built-in optimizer is a billing decision** (raise the
account's Image Optimization limit), not a code fix — this workaround stays
until that happens.

## 4. One-way curated lane progression (`a8295bd`) — owner decision 2026-08-13

Observed 2026-08-12: `CJ_TRENDING` was re-walking its *entire* already-finished
set at every new discovery wave edge, contributing zero new products after
wave 1 but stalling every wave transition for minutes regardless — a real,
measured production slowdown (600 → 1170 → 1690 → 2229 → 2734 product wave
edges, all wasted re-walks). Fix: lane exhaustion is now permanent — once a
lane records `exhausted_at_wave_limit`, it's done forever, never re-compared
to the current wave edge. Trending → Most listed → New arrivals → partition
scanner, strictly in that order, no lane re-arms itself; re-opening one is now
a documented manual `UPDATE`. Read-side-only change, no migration.

## 5. Live CJ browse for All Supplier Products (`2f9fcc6`) — owner decision 2026-08-13

`/products` now browses CJ's **live** catalogue directly instead of reading
rows the discovery pipeline already persisted — for this one page only; the
discovery pipeline, its own screens, and its budget rules are untouched, and
browsing performs **zero writes** (never creates/refreshes/evaluates a
candidate). Each render is exactly one live `/product/list` call (200/page,
CJ's documented legacy max) through the signed-in seller's own connection,
throttled to 30 CJ calls/minute **per user**, checked *before* spending a
request. Explicit, deliberate cost trade: **higher CJ point spend by design**
(~50 points per page view) in exchange for lower database load — the
per-user throttle exists specifically to stop a fast-paging seller from
draining the shared points budget discovery itself depends on. Worth cross-
referencing against [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data|ADR-017]]
and [[agent-operating-contract]] §9's CJ-budget-is-shared principle if this
page's real-world point cost ever needs re-examining.

## 6. Product Catalogue: bulk-add → rich restore → **reverted** → data purge (PRs #64, #65, #66 + a chore)

This is the one workstream that did **not** end up shipped — worth reading in
full sequence since the revert itself carries the most decision-relevant
content.

- **`0cf7a77` (PR #64)**: wired the already-built-but-unwired
  `createProductDraftFromCandidate` backend to a real UI — a checkbox column
  and "Add N to Product Catalogue" bulk action on Ready/Needs Attention (page-
  scoped, capped at 100, one idempotent transaction per candidate so a retry
  can't double-create), plus made `/listings` and `/listings/[productId]` read
  real database rows instead of 11 hardcoded fixtures. Every created product
  was `UNPUBLISHED` — "Live immediately" was explicitly withdrawn by the owner
  after review, since the database itself rejects publishing without a slug
  and approved revision, and the storefront never read this table anyway at
  that point.
- **`1ab5b88` (PR #65)**: restored the fuller, richer Product Catalogue design
  (the one with availability/media/attention badges) on top of the real rows
  from PR #64 — explicitly **not a revert** of #64, an enrichment of it. Core
  design pattern: `Tracked<T>` with three states (a tracked value, a recorded
  absence, and "not tracked yet" for a dimension this system has no machinery
  for at all) — collapsing the last two was called out as "the exact lie the
  owner rejected," since a real `$0.00`/fabricated availability state would
  have been needed otherwise. Added a real, audited Archive action.
- **`11e7227` — reverted both #64 and #65, at the owner's explicit request.**
  `git diff` against the pre-#64 commit is byte-identical — confirmed exact,
  not an approximation. What survived on purpose: PRs #61/#62 (the candidate
  detail drawer, unrelated) and the pre-existing unwired
  `product-draft-actions.ts`/`create-draft.ts` backend (still has no UI path
  reaching it, exactly as before). **No reason for the revert is recorded in
  the commit message itself** — worth asking AJ or Bogs directly what changed
  the owner's mind between approving PR #65 and reverting both, since that
  context matters for whether to retry this workstream later.
- **`46d5c2c` (chore, not folded into the revert on purpose)**: the revert
  undid code, not data — one real `UNPUBLISHED` product (not "roughly 4" as
  first estimated) plus its revision, provider reference, and idempotency
  record were left in the production database from PR #64's real bulk-add.
  Purged via a careful raw-SQL script respecting 17 foreign keys across 9
  tables (mostly `ON DELETE RESTRICT`), with a dry-run default, a pre-
  transaction JSON backup, and an audit event recording exactly what was
  deleted. Also surfaces a separate, real, structural finding: **`idempotency_records.expires_at`
  is never read or swept anywhere in this codebase** — the 24-hour retention
  is documentation, not behavior. Left behind, a re-add reusing a spent
  idempotency key would replay a stored result naming a product id that no
  longer exists and report it to the seller as freshly created. This was
  found to be live (one real record matched), not theoretical, and is **not
  yet fixed** — only the one already-produced record was cleaned up in this
  pass.

## 7. Storefront catalogue API fix (`769e11b`, PR #69) — the most significant single commit today

The storefront products API was answering `502` on *every* request, and even
when healthy had never read the Sals3 catalogue at all — the two customer-
facing defects this closes:

- `supplier-source.ts` resolved a headless CJ connection by the literal
  identity `'dev-user'`; that seller's connection had been purged, so every
  buyer request turned a missing-credentials error into an opaque `502`.
- All three storefront routes served a **live CJ `/product/list` response**
  directly — meaning `products`/`product_variants`/`product_offers`/
  `product_media_sources` had zero effect on what customers actually saw, and
  every uncached page view spent CJ points on CJ's single most expensive
  documented route.

**Owner decision 2026-08-13, recorded in this commit**: the storefront reads
the database and nothing else, published products only, priced in USD (ADR-003
phase 1). What this actually wired up, real for the first time:

- A real publication read-model (`storefront/read-model.ts`) — five
  conditions in one shared `WHERE`, real `LIMIT`/`OFFSET` (fixing a prior code-
  review finding that items 15–20 of every CJ page of 20 were silently
  unreachable), and an import-graph test proving no supplier adapter is
  reachable from these routes at all.
- A real Publish/Pause control and `product:publish` Server Action
  (`products/{publish,slug,media-projection}.ts`) — refuses with a named
  reason per missing fact instead of fabricating one, resolves price through
  the pricing resolver inside the transaction, records supplier media under
  the owner-declared `SUPPLIER_TERMS` rights basis (ADR-011 §6). **Nothing
  wrote `publication_state = 'PUBLISHED'` anywhere in this codebase before
  this commit.**
- `capture-evidence.ts` wires the already-complete
  `CjSupplierAdapter.getCandidateEvidence` to `upsertSnapshot`, which — this is
  a real, striking finding — **had zero callers before this commit**: 31,274
  `PASS` candidates existed against only 19 supplier snapshots between them,
  which is why every drafted product had no variants, costs, or bindings.
  Evidence capture is now an explicit, rate-limited, audited operator action
  (never automatic), per ADR-017/agent-operating-contract §9's CJ-budget
  discipline.
- `authorizedSellingCurrencyCodes` was empty, meaning **nothing could publish
  at all** regardless of any other fix — `USD` is now declared for AU and PH.
  AUD is deliberately still absent: no approved reference-FX rate resolver
  exists for it yet, and enabling it needs its own ADR amendment, not a quiet
  addition here.
- **A real near-miss, closed rather than exploited**: `.gitignore`'s `.env*`
  pattern only matched files literally starting with `.env`, so
  `prod.env.local` and `dev.env.local` — files that held a production
  `DATABASE_URL`, `CJ_API_KEY`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, and
  `SUPPLIER_CREDENTIAL_MASTER_KEY_BASE64` — were **not** covered. **Verified
  by this agent at ingestion time**: neither file was ever actually committed
  to this repo's git history (`git log --all -- prod.env.local`/`dev.env.local`
  is empty), and the pattern now correctly covers them
  (`git check-ignore` confirms `*.env.local` matches both). No secret was
  actually exposed via git — this was a gap closed before it caused an
  incident, not an active leak needing rotation.

Verified live against the production database over HTTP per the commit
message: `401` without a bearer token, `200 {"products":[],...}` where it was
previously `502`, `200 []` for categories, `404` for an unknown id and for a
non-slug path, and the consumer's own Zod schema parses the live response
cleanly. No migration required; no new dependency added.

---

## Open questions worth asking AJ or Bogs directly

1. **Why was the Product Catalogue rich-restore (§6) reverted right after
   being approved?** The revert commit itself records *that* the owner asked
   for it and *what* came back byte-identical, but not *why* — was it a scope
   concern, a data-quality concern, timing, or something else? This matters
   for deciding whether to retry that workstream and how.
2. **The `idempotency_records.expires_at` never-swept finding (§6)** is a
   real, confirmed-live structural gap outside this session's scope to fix —
   worth deciding whether it becomes its own follow-up task now that it's
   documented here, rather than staying an incidental discovery buried in a
   purge-script commit message.
3. **Restoring Vercel's built-in image optimizer (§3)** is explicitly a
   billing decision now blocked on someone raising the account's Image
   Optimization allowance — worth confirming who owns that account action.
