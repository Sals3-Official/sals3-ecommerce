---
tags: [sals3, session-note, sals3-portal, product-catalogue, seller-center, ui, adr-011]
aliases:
  - Part 67
  - Catalogue Table Slimmer and Live Landing
created: 2026-08-22
updated: 2026-08-22
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-10-part23-catalogue-dropshipping-alignment]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
---

# Part 67 — the catalogue column that was doing nothing

Four owner reports on `sals3-portal`'s Product Catalogue (`/listings`), from one
screenshot at a zoomed-out browser. All four are presentation or default state.
No schema, migration, server action, publish gate, permission, or supplier call
changed, and no CJ request was added (ADR-017 unaffected).

`sals3-portal` [#172](https://github.com/Sals3-Official/sals3-portal/pull/172).

## What was reported

> "etong sa product catalogue, pag nag zoom out ako ng browser ay putol na ganyan
> tapos ang publish to store/pause listing ay wala dapat button dyan dapat nasa
> loob ng 'more'. yung 'Media' Column dapat nakalagay dyan Supplier photo hindi
> supplier fallback. alisin mo na yung availability option. tapos dapat ang
> landing page nya ay yung 'Live'."

## The column was the width, and the button was the rest of it

Nine columns, and the Actions cell carried `Edit` + a `Publish to storefront` /
`Pause listing` button + a `More` menu. The table sits in an `overflow-x-auto`
wrapper, so nothing was ever unreachable — but the wrapper's right edge landed
mid-button, and a control cut in half reads as broken rather than as scrollable.

Both halves were addressed rather than only the one that was asked about,
because either alone leaves the cell the widest thing on the row: publish and
pause moved into `More` (owner's instruction), and the `Availability` column came
out (also the owner's instruction, and independently the widest badge column
after Product).

## Three things worth keeping

**A `DropdownMenuItem` unmounts the instant the menu closes on click.** The
obvious implementation — put `useTransition` inside the menu item that calls the
server action — dispatches a transition from a component being unmounted in the
same commit, which is [[sals3-session-2026-08-19-part57-margin-inheritance-market-rules-rebuild-and-eleven-merged-prs|part 57]]'s
third production defect exactly. The transition therefore lives in a new
`CatalogueRowActions` component that owns the whole cell and stays mounted while
its own menu closes. It is also why the outcome arrives as a **toast** rather
than a pending label: by the time the server answers, nothing in the menu is on
screen to label. That component also took 90 lines out of a 325-line row file,
which the component-architecture rules had been asking for anyway.

**One row had two meanings of Pause, and nobody had noticed.** The real control
(`unpublishProductAction`, genuinely leaves the storefront, compare-and-set on
`products.version`) rendered as a button, and a *preview-only* in-memory pause
rendered as a menu item — on the same row, at the same time, both reading
`Pause listing`. Collapsing them into one menu forced the collision into view.
`productVersion` is the discriminator: it is the compare-and-set token the
action requires, so a row that has one is persisted and a row that does not is
an illustrative fixture. Persisted rows pause for real; fixture rows pause in
memory and say so in the toast. This was a latent defect the width complaint
surfaced, not a change the owner asked for.

**"Fallback" was flagging the ordinary case.** `mediaStatusOf` returns
`SUPPLIER_FALLBACK` for any published product carrying only the supplier's own
photo — which is nearly every row in production, because `create-draft.ts` and
`publish.ts` project the supplier photo into `product_media_sources` as
`SUPPLIER_ORIGINAL`. So the column was showing an amber `warning` pill and the
word "fallback" on the normal state of the catalogue. The label is now
`Supplier photo` and the tone is `info`. The state code, the derivation, and the
tooltip's explanation of the resolution rule are all unchanged.

## What is deviated from, and what is not

**ADR-011 is deviated from and is amended.** Its §4 fixes the catalogue's media
vocabulary verbatim, `SUPPLIER_FALLBACK` included. `Supplier photo` is a
different word for the same state, decided by the owner on 2026-08-22. The
override is recorded on `MEDIA_STATUS_LABELS` in the code so the next agent does
not reconcile it back to the ADR — same handling as the PDP sticky panel
([[sals3-session-2026-08-21-part64-the-sticky-panel-the-spec-asked-for-and-the-owner-did-not-want|part 64]])
and the micro-labels
([[sals3-session-2026-08-22-part65-the-labels-that-were-already-right|part 65]]).
See ADR-011's own `Amendment — 2026-08-22`.

**ADR-013 is *not* deviated from, and is deliberately not amended.** This was
worth checking rather than assuming: the first draft of this work claimed the
`Availability` column was mandated by ADR-013 §5, and the vault says otherwise.
**§5 is `Treat points exhaustion and inactivity suspension as recoverable
connection health`** — the `SupplierConnectionHealth` dimension, which this
change does not touch and which is still its own filter. §1 governs inventory
*evidence*: preserve `cjInventory`/`factoryInventory`/`totalInventory`/
`verifiedWarehouse`, never claim customer-facing availability from
`totalInventory` alone. All of that still holds — `deriveProductAvailability`
still runs, the `Out of stock (N)` quick filter and its count still read it, and
the expanded variant rows still show availability per variant beside
`supplierObservedQuantity`, `evidenceFreshness` and `lastCheckedAt`. Nothing was
discarded; one parent column stopped being drawn.

What the removal actually supersedes is
[[sals3-session-2026-08-10-part23-catalogue-dropshipping-alignment|part 23]]'s
design correction, which put Availability, Media status and Attention on the
screen as three separate columns instead of one Active/Inactive flag — a session
note, not a decision record. Its own note now carries a pointer saying so. The
reason the correction still stands in substance: it was about not *collapsing*
the dimensions into one flag, and they are not collapsed.

**A wrong citation is worth recording, not quietly fixing.** "ADR-013 §5" was
written into a reply and into the PR body before the section was read. A section
number recalled rather than opened is the same class of mistake as
[[sals3-session-2026-08-21-part61-pdp-v31-shell-and-the-adr-sweep|part 61]]'s
grep-that-found-nothing: it looks like evidence and is not.

## Landing on Live

`useState('LIVE')` instead of `'ALL'`. `All` is still the leftmost tab and every
count is unchanged. The consequence is accepted rather than engineered around: a
seller whose catalogue is entirely drafts lands on the empty state and has to
pick a tab. A data-dependent default — Live when something is live, otherwise
All — was considered and rejected, because a landing tab that changes the first
time a listing goes live reads as a bug to the person it happens to.

## Also changed, because the column count moved

`CatalogueVariantRow`'s cells summed to nine. Its `colSpan={3}` covered
Availability + Media + Listing quality and is now `colSpan={2}`. The empty-state
row's `colSpan` went 9 → 8. A `colSpan` that outruns its header is invisible
until a row renders, which is why both are named here.

## Verification

`npm run verify` green on the merged tree: lint, format, typecheck, build,
**2363 unit tests** (4 skipped), **79 e2e** (6 skipped). Pre-commit and pre-push
hooks re-ran the same chain.

Read off the running dev server at `localhost:3001/listings`: selected tab
`Live`, headers `["", Product, Listing Status, Selling Price, Media, Listing
quality, Attention, Actions]`, `scrollWidth - innerWidth` of `0`, zero console
errors.

**Not proven at runtime against real rows.** The local database holds no
listings and seeding it is against the standing never-migrate-locally rule, so
the `Supplier photo` pill, the `More` menu's contents, and publish/pause are
covered by unit tests rather than a browser pass. The Vercel preview deployment
is behind Vercel SSO, so it could not be driven from the session either — this
needs the owner's own click, or a signed-in seller, before merge.

## Open

- **`SUPPLIER_PICTURES` still reads `Supplier pictures`**, now sitting close to
  `Supplier photo` in the media filter. The real read model never produces that
  status — only fixtures do, and its own tooltip claims a revision preference
  that is not stored — so the two never appear together on a production row. Left
  alone rather than renamed or removed in the same change.
- **An `ARCHIVED` row is offered `Publish to storefront`** beside `Restore as new
  draft`. Pre-existing: the old button rendered for every non-live row too. Not a
  regression, and not obviously right either.
- **Nothing asserts the row's action set in a test.** Same gap parts 64 and 65
  left behind for their own overrides.
