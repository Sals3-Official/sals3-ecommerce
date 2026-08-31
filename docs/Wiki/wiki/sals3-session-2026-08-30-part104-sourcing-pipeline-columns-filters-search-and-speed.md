---
tags:
  - sals3
  - sals3-portal
  - sourcing
  - search
  - performance
  - session-note
aliases:
  - Part 104
  - Sourcing Pipeline Gets Columns Filters Search And Speed
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-portal-category-price-outlier-detection-plan]]"
---

# Part 104 — the sourcing pipeline gets columns, real search, and finally speed

2026-08-30, `sals3-portal`
[#264](https://github.com/Sals3-Official/sals3-portal/pull/264)/[#266](https://github.com/Sals3-Official/sals3-portal/pull/266)/[#267](https://github.com/Sals3-Official/sals3-portal/pull/267)/[#269](https://github.com/Sals3-Official/sals3-portal/pull/269)/[#270](https://github.com/Sals3-Official/sals3-portal/pull/270)/[#272](https://github.com/Sals3-Official/sals3-portal/pull/272)/[#274](https://github.com/Sals3-Official/sals3-portal/pull/274),
no DDL except the trigram indexes, applied to production separately.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The row said almost nothing about 432,654 candidates

`/products/pipeline` showed Product, CJ product ID, Supplier price, Status
and a timestamp reading `8/20` on a 30 August screen — ten days of drift
reported as a date that never called itself late. #266 added identity (name +
SKU + external id), CJ category, origin & stock, and a relative "feed seen"
age with a stale marker. **The category costs no CJ points and cannot**:
`handle-cycle-start.ts` already calls `getCategoryTree()` once per discovery
cycle and persists the flattened tree into
`discovery_cycles.category_snapshot`, so resolving L1 is a local Postgres
join on data already paid for — nothing in the PR reaches a supplier
adapter. Three filters shipped, backed by real indexes
(`..._connection_category_idx`, `..._connection_stock_review_idx`,
`..._connection_provider_freshness_idx`); a cost band, ships-from or demand
filter would need a jsonb sequential scan over 432,654 rows and waits for an
expression index. **A filtered tab's total is never the tab's cached
count** — using it would page a 12-row result as if it held 432,654.

## The SKU on the row could not be typed into the search box

#267 found `matchesSearchTerm` reading `evidence->>'supplierSku'`, present on
**19 of 87,966** candidates when measured — the same defect the display name
and price both had on 2026-08-12, in the one field that was missed then. The
SKU a seller can actually see comes from `feed_snapshot.sku`, which every row
carries, and now that is what is searched. The same PR made every typed word
required in any order — "pants mens" now finds what "casual loose" already
did — bounded at six words so a pasted paragraph cannot build an unbounded
predicate, and turned the 15-chip CJ category facet (three lines, pushing the
table below the fold) into a dropdown built on a new shared `FilterSelect`
component, also used by All Supplier Products.

## The DDL that changes no behaviour, then the search that uses it

Substring matching cannot find `pnats` inside `Pants`; trigram similarity
can, but a GIN trigram index is the entry requirement, not an optimisation —
without one the comparison is a sequential scan over **588,850 rows per
request**. #269 ships the DDL path alone: `CREATE EXTENSION pg_trgm` and two
`CREATE INDEX CONCURRENTLY` statements, each run on its own connection
because `CONCURRENTLY` cannot run inside a transaction (unlike this
repository's usual single-transaction migrations). An interrupted
`CONCURRENTLY` build leaves an **INVALID** index that `IF NOT EXISTS` will
never replace, so every run reads `pg_index.indisvalid` first and drops an
invalid index before rebuilding — a timeout is a retry, not a failure. There
is deliberately no migration file, because Drizzle cannot express a GIN
index on a jsonb expression; the consequence is that **a database this has
not been run against has no `pg_trgm`**, including a fresh local one and CI.

#270 landed the search itself after the indexes were confirmed valid in
production (`Catalog Migrate Search Trigram` break-glass run, one attempt,
21s, `droppedInvalid: []`). It uses `word_similarity` with the `<%` operator
— the term on the left, matching against the best-matching word inside a
long product name rather than scoring the whole string — additive, `OR`'d
onto the substring match, so a database without the extension is asked
whether `pg_trgm` exists (`search-capabilities.ts`, cached ten minutes,
`false` on any failure) and simply falls back rather than erroring: `<%`
where the extension is absent does not degrade, it raises `operator does not
exist`.

## The index nobody could see was slow until it was fast

#272 found no index on `updated_at`, while every pipeline tab pages with
`ORDER BY updated_at DESC, id ASC LIMIT 100` over the Ready tab's 432,654
rows — sorting all of them on every page load, tab switch and drawer
open/close. A composite `(status, updated_at DESC, id)` lets Postgres walk
the index in the order the page already asks for. **Read from the schema,
not measured with `EXPLAIN`** — no credential to run one against
production — stated as such rather than claimed as proven; additive and
reversible, one `DROP INDEX` if it turns out not to be chosen. The
`CONCURRENTLY` runner used by #269 was extracted into
`concurrent-index-migration.ts` so the same lessons (no transaction, dropped
invalid index, cleared `statement_timeout`) are not relearned per index.

## Repo hygiene, found the same week

#264: `outputs/` was in neither `.gitignore` nor `.prettierignore`, so
`prettier --check .` reported 19 style issues in generated `.dc.html` design
handoffs and legal-source HTML — failing `npm run verify`, which the
pre-push hook runs in full. Found while syncing a long-lived branch onto
`develop`: four lines had been sitting as an uncommitted local change and
never upstreamed, so the sync silently removed the only thing keeping
`verify` green. Not reformatted — a seeded `.dc.html` carries template holes
a reformat corrupts — ignored instead, bringing `sals3-portal` in line with
`sals3-ecommerce`'s existing `.prettierignore`.

#274 lined the filter row up (the CJ category select carried a stacked
label while the others were inline chips), added `?added=no` as a SQL `EXISTS`
predicate against `provider_product_references` rather than a client-side
filter over the page in hand, renamed "Customize & List" to "Add & Customize"
(neither ever listed anything publicly — both create an unpublished draft),
and moved the bulk-action button to sit with the checkboxes it depends on.

## Risk, across all seven

No supplier calls in any of them. No DDL except the trigram indexes, which
ran separately and were confirmed `indisvalid` before the search that reads
them shipped. Several were built in isolated worktrees with their own
`npm ci` because the shared checkout held another change's uncommitted work
(the variant option-mapping stream — see
[[sals3-session-2026-08-30-part107-a-sparse-variant-grid-mapped-replaced-and-restored|part 107]]).

## Lessons

- **A field that exists on 19 of 87,966 rows is not the field a seller
  types back.** Search the column the row actually prints, not the richer
  source that happens to exist for a sliver of the data.
- **A DDL-only PR that changes no behaviour is a real category**, and the
  discipline is stating so explicitly rather than letting "no code calls
  this yet" be discovered by reading the diff.
- **`CREATE INDEX CONCURRENTLY` cannot run inside a transaction**, and an
  interrupted build leaves an INVALID index `IF NOT EXISTS` will silently
  accept forever — the runner must read `pg_index.indisvalid` and drop
  before rebuilding, not merely retry.
- **A capability must be read, never assumed.** `<%` where `pg_trgm` is
  absent does not degrade, it errors — checking `pg_extension` and caching
  the answer is what keeps a database without the migration from serving a
  broken search.
- **An index recommendation without `EXPLAIN` is still worth shipping** when
  it is additive and reversible, provided the PR says plainly that it is
  reasoned from the schema rather than measured.
