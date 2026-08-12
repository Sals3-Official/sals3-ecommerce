---
tags: [sals3, sals3-portal, session-note, product-sourcing, candidate-pipeline, ui, security]
aliases:
  - Candidate Detail Drawer
created: 2026-08-13
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[hot]]"
---

# A candidate detail drawer for Product Sourcing — `sals3-portal` PR #61, #62

`sals3-portal` [PR #61](https://github.com/Sals3-Official/sals3-portal/pull/61),
opened and merged by `aj-garrigues` (AJ). 46 files, +3,204/−163. Two commits:
`c980020` (data/interaction foundation) and `9aa9d11` (the drawer itself).
[PR #62](https://github.com/Sals3-Official/sals3-portal/pull/62), same author,
merged the same day — see the follow-up section at the end of this note.

## The gap this closes

Clicking a Product Sourcing row did nothing, in any of the six tabs, and no
route or panel anywhere showed one candidate's full record — a reviewer could
read a name, an id, a price, and a status, then had nowhere to go, while the
database already held evaluation mechanics, screening findings, stock
attestation history, discovery signals, pricing overrides, an audit trail, and
CJ evidence when any exists. Any row now opens a read-only drawer at 85%
viewport width, deep-linked as `?candidate=<uuid>` alongside the pipeline's
existing `?tab=`/`?q=`/`?page=` params, across five tabs: **Overview**,
**Stock**, **Supplier evidence**, **Screening & queue**, **History** — grouped
by the question a reviewer is asking, not by which table a field lives in.

## Three decisions worth carrying forward

**Absence is never silent, and never ambiguous.** Only 19 of 87,966 candidates
had a captured CJ snapshot as measured 2026-08-12, so most drawer sections
open empty by default. `CandidateAbsentSection` keeps three distinct reasons
from ever collapsing into one blank state:

| Kind | Means | Border | Timestamp | Role |
|---|---|---|---|---|
| `not-fetched` | Sals3 never called CJ | dashed | never | `note` |
| `reported-zero` | CJ answered; the answer was none | solid | always | — |
| `never-recorded` | the append-only table has no rows at all | none | — | — |

The timestamp is the actual discriminator — a real observation carries one, a
fetch that never happened structurally cannot. A zero from CJ is a fact about
the product; an absent fetch is a fact about Sals3's own pipeline, and
conflating the two is exactly how someone would conclude a product has no
stock when nobody ever looked. `reported-zero` is flagged in the PR itself as
nearly unobservable at 19-of-87,966 snapshots — exercised in practice mainly
by its own unit test — with an explicit ask not to prune it later as dead
code.

**The manual stock attestation outranks CJ evidence in the Stock tab.** Under
[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] a staff
attestation is the only record that actually means "someone confirmed stock";
leading with raw CJ evidence would open that tab on an empty state for nearly
every row, understating what Sals3's own review process has actually
established.

**`score` renders nowhere.** The column is reserved and always `null` today.
A dash next to a label reading "Score" reads as "scored zero" to a reviewer —
so the drawer states in a plain sentence what is actually true instead of
implying a computed value that doesn't exist yet.

## Security: the authorization boundary is one function

`resolveCandidateDetail` is the whole boundary. The seller filter sits in the
**same `WHERE` clause as the lookup itself**, on
`supplier_connections.seller_account_id` per ADR-008 — never the legacy
`intended_seller_id` field. A cross-tenant id or an unknown id costs exactly
one statement either way, asserted in `candidate-detail-queries.test.ts` by
rendering the actual SQL through `PgDialect` rather than trusting the
TypeScript call site. This matters concretely because `audit_events` carries
no tenant column of its own — it must never be read for a candidate id that
isn't confirmed as the requesting seller's first. A missing candidate and
another seller's real candidate return the identical `null`, and the drawer UI
preserves that indistinguishability rather than leaking existence through a
different error state.

One security note flagged for future writers, not fixed here: `audit_events.payload`
is now rendered directly to a seller. Safe today **by audit, not by
construction** — every current candidate-scoped writer happens to record only
shallow, credential-free scalars — and `AuditTrailSection` carries a comment
saying so, for whoever adds the next audit payload and needs to know that
assumption exists.

## Two bugs found in the course of building this

- **`buildQueryString` silently drops `page` on any patch that changes
  something else** (`src/lib/portal/search-params.ts:32`). Correct behavior
  for an actual filter change, wrong for opening a drawer that doesn't change
  the result set at all — without an explicit `page`, clicking a row on page 7
  of Blocked would have silently reset the list to page 1, and the very
  candidate just clicked would no longer even be among the rows rendered
  behind the drawer. Guarded now by `pipeline-params.test.ts`.
- **The identical bug is live today on `/products`** — `SupplierProductsTable.tsx`
  opens its own Source Details panel without an explicit `page` either.
  Explicitly out of scope for this PR and flagged for a separate fix; not
  addressed here.

## Diff shape, as a signal of what actually moved

`page.tsx` shrank from 237 to 148 lines despite the feature growing, because
the table-view switch, the two database-unavailable states, the evaluating
breakdown, and the header sentence all moved to where they structurally
belong. Every pipeline table gained one prop and swapped its row element; no
cell markup changed, and no table became a Client Component. The actual
client boundary is exactly two files — the clickable row and the sheet itself
— with every other affected file remaining a Server Component passed through
`children`. `DetailRow`/`DetailSection` replace what would otherwise have
become a fourth independent local key-value renderer (three already
coexisted), and `useSheetInitialFocus` extracts `EditorSheet`'s existing focus
fix rather than re-deriving it.

## Verification

`npm run verify` clean end to end: lint, `format:check`, `typecheck:clean`,
build, **1,286 unit tests**, **60 E2E**, 0 failed. `npm audit --audit-level=high`
— no high/critical advisories (the same 4 pre-existing moderate `esbuild`
findings via `drizzle-kit`'s dev-only dependency chain seen elsewhere this
week). Measured manually in a real browser at three widths — 1088px of
1280px (85% exactly), 700px of 700px in the 640–768px band where a naive
override would render 384px, and full width at 375px — zero horizontal page
overflow and zero console errors at any of them. Rebased cleanly onto current
`develop` (5 commits ahead, including PR #58 and #59) with no conflicts; the
full verify suite was re-run green on top of that rebase, not just before it.

**What the PR itself flags as not verified, and asks a reviewer to check
before calling this done:**

- **No real candidate row was ever actually clicked against real data.** The
  local database was empty throughout, so all five populated tabs rest on
  unit tests plus two e2e cases that were honestly skipped rather than faked
  against fixtures.
- **Every row click re-runs the entire page render** (`force-dynamic` plus a
  URL change), re-executing the active tab's count and page queries in
  addition to the drawer's own seven detail statements. A parallel-route slot
  so only the drawer itself re-renders is named as the escape hatch if this
  turns out to matter under real load.
- **Middle-click / open-in-new-tab do not work on a pipeline row** — a `<tr>`
  cannot host an anchor spanning every cell without breaking table semantics.
  The resulting URL remains fully shareable by copy/paste regardless.
- **The local E2E suite is non-deterministic independent of this change** —
  skip counts swung 4/21/23 across repeated runs, and which spec failed moved
  between `seller-center-orders` and `product-catalogue` as local database
  state changed between runs. The PR reproduces the orders `404 vs 200`
  failure on plain `develop` with none of this PR's code applied, and
  back-to-back full runs are green on both branches — flagged as worth a
  separate investigation, not something this PR caused or fixed.

## Follow-up, same day (PR #62): the product photo, a real security fix, and 19→11 statements

Two follow-ups to the drawer above, both from `aj-garrigues`. **No migration**
— neither touches a schema file, `drizzle/`, or an index.

### The product photo, and one real security fix

Supplier evidence now shows one 320px photo from
`candidate_evaluations.feed_snapshot.imageUrl` — the *only* image address this
database currently holds. `supplier_snapshots.evidence` keeps a
`usableImageCount` but `countUsableImages()` discards CJ's `productImageSet`
itself, and `product_media_sources` exists but is empty and keyed to
`products.id`, not a candidate — so there is no gallery, and cannot be one
until someone funds a re-fetch. The on-screen copy says exactly that rather
than an empty box implying "no photo".

Three implementation details are flagged as easy to "improve" into a
regression, each backed by a test that fails if you do: no `sizes` prop
(adding one flips Next's `getWidths` from the `x` branch, `384w`/`640w` for a
320px box, to the `w` branch, whose smallest candidate is `640w` — fetching
double the needed resolution); no `priority` (base-ui's `Tabs.Panel` defaults
`keepMounted = false`, so the image isn't in the DOM until its tab opens —
nothing to preload, never the LCP element); `aspect-square` (reserves height
before any byte arrives, so a late image never shifts already-read text under
a scrolled reader).

**The real fix:** `imageUrl()` now re-checks the host on the **read** path.
Its own comment previously asserted the address "was allow-listed at intake"
— a claim about a different code path entirely. Three facts made that gap
real: `feedSnapshotSchema.imageUrl` is a plain `z.string().nullish()` with no
host check of its own; `cjImageUrl` only guards the discovery **write** path;
and `images.loader: 'custom'` bypasses `/_next/image` entirely, so
`remotePatterns` enforces nothing at request time, and `cjImageLoader` returns
a non-CJ address **unchanged**, by design. So any value that ever reached that
column outside the normal write path — a manual `UPDATE`, a backfill script,
a future ingest path that skips `toFeedSnapshot` — became a browser `GET`
issued from the seller's own session the moment the drawer or a pipeline
thumbnail rendered it. Three lines close it for both call sites, tested
against lookalike hosts, plain `http`, and relative paths.

### Cutting one drawer open from 19 statements to 11

Measured with a new `SALS3_DB_LOG=1` flag (left in, default off) — this repo
had **no query instrumentation at all** before this. One render of
`/products/pipeline`: 19 statements open / 12 close before, 10 after
`React.cache` deduplication, **4** after the count cache warms. What was
being wasted, per render: the same `seller_accounts` row read three times
(the layout's `getSession()`, `requireDropshipperAccount`'s own `getSession()`,
and its own explicit lookup), and `countCandidateStatusSummary` — three
statements — run twice (once for the nav-rail badges, once for the tab bar).
With one seller account, `sellerAccountId` narrows nothing, so each of those
scans reads the whole table — on *every* navigation, including every drawer
open and close. Opening a drawer for an unknown uuid still costs exactly one
statement, confirming #61's authorization gate stops there as designed.

Four changes: `React.cache` on `getRawAuthSession`, `getSession`, and a new
`src/lib/auth/seller-account.ts` reader (deliberately **not** wrapped on
`findSellerAccountByIdentityId` itself, since it takes an executor and is
called inside a transaction — memoizing it would risk serving a pre-insert
value to a read that must see its own write, guarded by a source-scan test
that keeps the call graph collapsed to one entry point); `status-counts-cache.ts`
via `unstable_cache` at a 30-second TTL, tagged, with the seller id passed as
an **argument** so tenant isolation is structural rather than conventional
(`resolveCandidateDetail` must never use this cache — its `Date` fields would
silently round-trip as strings through `JSON.stringify` with a green
typecheck); invalidation that deliberately differs by caller — route handlers
use `revalidateTag(tag, 'max')` so a queue message can't stall the next
render, while the `recheckCandidateNow` **Server Action** uses `updateTag` for
read-your-own-writes, because the person who just clicked must see the result
on the response they're already waiting for (that action had **no**
revalidation of any kind before this); and a `useTransition` + `aria-busy` +
row tint affordance adjusted during render rather than in an effect, so the
panel never paints a frame in the wrong state.

**Known, accepted consequence:** the same cached counts feed the pipeline's
`total`, so for up to 30 seconds a tab can read "412" above 413 real rows, and
a seller can occasionally be clamped back one page at a boundary. Both
self-heal within the TTL — the documented argument for keeping it short
rather than `revalidate: false`. The PR itself flags that the pagination
total arguably shouldn't come from a cached count at all, but calls that a
separate change from this one.

**Not verified, flagged by the PR itself:** the photo was never seen rendered
against real data (the local database is empty, so no real candidate row was
ever opened — "worth one look on the preview deploy before merging"); the
absolute query time at ~90k rows is unmeasured (statement counts are, wall
time isn't); and `unstable_cache` is already deprecated in Next 16 in favour
of `'use cache'`, which needs `cacheComponents: true` — recorded as a larger
future migration, not attempted here.

**Verification:** `npm run verify` clean — lint, `format:check`,
`typecheck:clean`, build, **1,303 unit tests**, **78 E2E**, 0 failed. `npm
audit --audit-level=high` — no high/critical (the same 4 pre-existing
moderate `esbuild` findings via `drizzle-kit`). Cost impact: lower — six
whole-table count scans per navigation drop to zero on a warm cache, two
duplicate seller reads disappear, no new dependency or service.

## Cost impact

Neutral to slightly higher per row click: seven additional statements, all
indexed single-row or small-child reads, behind the one authorization gate
above. No new dependency, no new service, no migration required.
