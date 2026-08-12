---
tags: [sals3, sals3-portal, session-note, product-sourcing, performance, reliability]
aliases:
  - Pipeline Pagination
  - Portal Navigation Latency
created: 2026-08-10
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[hot]]"
---

# Product Sourcing at real scale: navigation latency, discovery resilience, and real pagination

Four `sals3-portal` PRs, all `aj-garrigues` (AJ), merged 2026-08-10/11. None
had a prior vault entry. Loosely themed around the same pressure: the
Candidate Pipeline had grown past the size the original build assumed
(tens of thousands, then ~87,000+ rows), and each of these is a different
symptom of that growth.

## PR #28 — portal navigation latency (merged 2026-08-10)

The PR's own description was left as the unfilled process-checklist
template, so this is read from the diff directly. Four changes:

- Vercel Functions pinned to `syd1`, matching the Neon database's own
  region — cross-region round trips on every query were the largest
  avoidable latency source.
- `getSession()` hoisted to the shared portal layout instead of being called
  again on every page.
- `prefetch={false}` set on sidebar navigation links, to stop Next
  speculatively issuing a serverless function call for every visible link on
  every render.
- A new `PortalRouteLoading` component wired per-route, so a slow navigation
  shows a skeleton instead of a blank frame.

## PR #30 — keep product pages and the discovery queue online (merged 2026-08-11)

Two independent resilience fixes: the Product Sourcing status endpoint
stayed online when Postgres returned aggregate timestamps as strings rather
than `Date` objects (a shape the original code didn't defend against), and
discovery partitions became recoverable when rate/budget pacing parks work
*before* a supplier request is even attempted — previously a parked unit
could be lost rather than resumed. New regression coverage for both the
no-slot-park case and lease-attempt rollback. **Rollout note from the PR
itself:** production already held `RATE_SLOT_UNAVAILABLE`-failed partitions
from the old behavior, needing a constrained operational recovery pass after
deploy to reopen them if full discovery coverage was to continue.

## PR #31 — reduce evaluating backlog noise (merged 2026-08-11)

Split the Product Sourcing "Evaluating" tab's count into **queued** versus
**processing-now**, so a large queued backlog no longer read as if
everything in it were actively being worked. Also made discovery ingest
shortcut `NO_VALID_MARKET` candidates straight past the evaluation outbox
rather than enqueueing them for a decision that outcome had already made —
fewer wasted messages, less noise in the same counts. Documents a production
self-heal environment variable, `CATALOG_DISCOVERY_SWEEP_DELAY_SECONDS`,
rolled out to production at `300` alongside this PR.

## PR #33 — page and search the whole sourcing pipeline (merged 2026-08-11)

**The problem this closes:** every Product Sourcing tab rendered only the
~100 rows one request fetched, with no way to reach the rest — and the page
header reported that fetched-row count *as if it were the tab's total*.
Blocked/Rejected held 86,605 candidates and announced "100 candidates."
Search made it actively misleading: it only re-filtered the rows already on
the page, so a product sitting at row 5,000 of an 86,605-row tab came back
as "No matches" — indistinguishable from genuinely not being in that tab.

**What shipped:** real server-side paging on every tab (`?page=`,
`PIPELINE_PAGE_SIZE = 100`, Previous/Next, `Page X of Y · N candidates` with
a real total), hard-capped at 200 rows per request — paging, not a bigger
cap, is what reaches the rest of an 86,605-row tab; rendering it whole would
be tens of megabytes of HTML. Search now runs in SQL across the *whole* tab
— CJ product id, evidence name, evidence SKU, and the ingestion-time
`feed_snapshot.name` — that last field specifically because a
screening-blocked candidate is decided before any CJ evidence call, so the
feed snapshot is the *only* name those 86,605 rows have; without it, a name
search on Blocked/Rejected would match nothing at all.

Two details flagged by the PR as load-bearing rather than cosmetic:
`PAGE_ORDER` breaks ties on the row id, because a policy-version requeue can
stamp thousands of rows with the identical `updatedAt`, and ordering on that
column alone would let the same row appear on two pages while another is
silently skipped; and each tab's list and its count share one `WHERE`
builder, so the table and the page count it renders cannot disagree about
which rows belong to the tab.

**Known gap, stated directly by the PR:** the new E2E test that walks real
pagination (page 1 → Next → page 2, asserting the rows actually differ)
skips locally, because the local database is empty — it will only exercise
the real behavior wherever a tab genuinely has a second page. **Deliberately
not done:** no `pg_trgm` trigram index for the name/SKU search — fine at
~90k rows via a sequential scan, would need a migration an order of
magnitude up.

## Verification

PR #30: `npm run verify` + `npm audit --audit-level=high`, both clean. PR
#31: same, plus the production rollout note above. PR #33: `npm run verify`
— 674 unit tests (26 new), 51 E2E, `npm audit --audit-level=high` clean, no
schema change.

`sals3-portal` [PR #28](https://github.com/Sals3-Official/sals3-portal/pull/28),
[PR #30](https://github.com/Sals3-Official/sals3-portal/pull/30),
[PR #31](https://github.com/Sals3-Official/sals3-portal/pull/31),
[PR #33](https://github.com/Sals3-Official/sals3-portal/pull/33), all merged.
