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

# A candidate detail drawer for Product Sourcing — `sals3-portal` PR #61

`sals3-portal` [PR #61](https://github.com/Sals3-Official/sals3-portal/pull/61),
opened and merged by `aj-garrigues` (AJ). 46 files, +3,204/−163. Two commits:
`c980020` (data/interaction foundation) and `9aa9d11` (the drawer itself).

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

## Cost impact

Neutral to slightly higher per row click: seven additional statements, all
indexed single-row or small-child reads, behind the one authorization gate
above. No new dependency, no new service, no migration required.
