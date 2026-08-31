---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - catalog
  - variants
  - session-note
aliases:
  - Part 107
  - A Sparse Variant Grid Mapped Replaced And Restored
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
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[sals3-session-2026-08-30-part104-sourcing-pipeline-columns-filters-search-and-speed]]"
---

# Part 107 — a sparse variant grid gets mapped, mapped by hand, remapped, and put back

2026-08-30, `sals3-ecommerce`
[#200](https://github.com/Sals3-Official/sals3-ecommerce/pull/200) and
`sals3-portal`
[#273](https://github.com/Sals3-Official/sals3-portal/pull/273)/[#276](https://github.com/Sals3-Official/sals3-portal/pull/276),
no DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## What a buyer saw, and the owner's report

Owner report, in Tagalog: the tactical-pants PDP was *"pangit"* — the live
`Three-proof Casual Sports Mountaineering Tactical Pants` rendered **all 52
supplier labels as one flat wall of chips** (`Light Brown Male-6XL`,
`Female, Gray-4XL`, `Black Men-XL`, and forty-nine more), and the Product
Editor said `Not detected` with no way to edit variants at all. Owner chose
the full scope — derive what can be derived, map by hand what cannot, and
allow taking a mapping back off — over the cheaper half.

## The diagnosis was not "no mapping UI"

CJ's labels split cleanly on the hyphen. What refused them was the
**exactness test** — `deriveVariantLabelStructure` in `sals3-ecommerce`,
`deriveOptionSplit` in `sals3-portal` — requiring the cross-product of the
position sizes to equal the variant count exactly. Measured from the live
payload: **8 colour-and-gender values × 8 sizes = 64 combinations over 52
real variants.** The 12 absent combinations are systematic, not damage: the
four `Male`/`Men` values carry `5XL`/`6XL` and no `M`; the four
`Female`/`Women` values carry `M` and stop at `4XL`. Womenswear sizing, not
a broken label.

## 1 — The storefront renderer was already built for a hole (`sals3-ecommerce` #200)

`ProductOptionList` swaps a token, misses in `byCombination`, and draws a
disabled `Unavailable` chip — it always has. The exactness test was
stricter than its own consumer needed. #200 replaces it with a guard
**derived from the purpose, not a tuned number**: a sparse grid is offered
only when it *compresses* — the chips a buyer scans (sum of position sizes)
must be fewer than one chip per variant. 16-instead-of-52 qualifies; a 3×3
grid holding its diagonal (six chips to reach three products, four dead
ends) does not. **Completeness is checked first**, or a full 2×2 (four
chips, four variants) would regress. Every pre-existing test stays green,
including the `Black-1XL`/`Red-2XL` refusal, whose name and comment were
rewritten because the rule they described is no longer the general one.

`byCombination.size` is now the number of purchasable variants and
**never** the size of the cross-product — its doc comment no longer claims
a lookup always hits. The identical rule ships separately in
`sals3-portal`'s `deriveOptionSplit`, so the two repositories cannot
disagree about which products get rows; #200 is independent and safe to
merge alone, needing no portal change and no seller action. Verified
against the live catalogue: 20 published products, 19 already render named
axes, this was the only flat one.

## 2 — Labels that encode no grid can be mapped by hand (`sals3-portal` #273)

`option-split.ts` had promised *"the seller must map it by hand"* since the
day it was written, and that path did not exist. It also answers what no
derivation can ever reach: one token holding two attributes. CJ writes
`Black Female`, `Black Men`, `Female, Gray`, `Khaki Women` — gender spelled
four different ways, word order reversed on one. No delimiter split
produces a `Colour` axis from that; a person can. `Fill from labels`
matches longest candidate first (`Women` beats the `Men` inside it) and
leaves what it cannot find **empty** — the save stays shut until every gap
is closed, because filling a gap with a default would put a wrong colour on
a live listing.

**`saveManualOptionMapping` accepts structure the derived path refuses,
deliberately** — that rule protects against Sals3 *inventing* an attribute,
not against a seller reinterpreting their own product. Its replacements:
the variant set comes from the database (a foreign id is refused, not
written); every variant must be assigned on every axis, because a partial
assignment is the shape that collides; two variants may not land on the
same combination. It audits as `catalog_product.options_mapped_manually`,
a deliberately different action from the derived one, so a dispute years
later can tell a checked mapping from a judged one.

Behaviour change, pinned by its own test: `optionMappingRequiredButMissing`
now fires wherever a split *is* derivable and unmapped, so a sparse-grid
product that used to publish freely must name its axes before a **Publish
Update**. The listing stays live. Exactly one product in the catalogue was
in that state.

## 3 — A saved matrix can be taken back off (`sals3-portal` #273, unmap)

This closed the one gap renaming never covered: a wrong **assignment**.
Three fears the old doc comments recorded each had an answer already in the
schema:

| Fear | What is actually true |
|---|---|
| **Carts** | Browser-local, holds variant ids. No variant is deleted. `checkout_intents` and `listing_snapshot` freeze their own copies (ADR-007), so past orders are untouchable |
| **Re-publish** | The storefront joins the option tables **left** and selects on `publish_state`, never variant status — removal degrades the PDP to supplier labels rather than breaking it; `updateTag` is mandatory |
| **Delisting** | `product_variants_active_requires_combination` cannot fire — see the correction below |

Gated on `product:publish`, not `product:edit`, because it changes a live
PDP with no publish step — the same shape as Pause. The delete order is
load-bearing: `product_variant_option_values` references *both* option
tables `ON DELETE restrict`, so the pairs go first and `product_options`
second — a test pins the order, because the wrong order passes everything
that never touches a real database (the exact failure class that once
broke `purge-catalogue-products.mts`). The whole mapping is copied into the
audit event before deletion, since `product_options` has no history table
and neither mapping action records per-value labels.

**A correction #273 carries about its own codebase:**
`product_variants_active_combination_key` had been cited — including in a
README paragraph written the same day — as the database backstop for the
collision check. **It is inert.** The index is partial on `WHERE status =
'ACTIVE'`, and nothing in this codebase ever sets a variant `ACTIVE`
(`insertDraftVariant` writes `DRAFT`; no other writer exists). It covers
zero rows, the CHECK beside it never fires, and the derived path's
`duplicate_combination` refusal is unreachable — the application-level
comparison is the whole guard. **A cited constraint is not a verified
one.**

## 4 — Replacing a mapping became one transaction, and a removed one can come back (`sals3-portal` #276)

Closes the two gaps #273 left open. Remove-then-rebuild worked, and the
*sequence* was the problem: at 52 variants it left a window minutes wide in
which the live PDP had degraded to raw supplier labels, `OPTIONS_UNMAPPED`
blocked publishing anything else about the product, and a crash or a closed
tab left it unmapped with the old mapping recoverable only from an audit
event. `remapOptionMapping` is the one write — the deletes and the new
inserts commit together or neither does, so a buyer loading the page
mid-replace sees the old mapping or the new one, never raw tokens.

Nothing is loosened: every guard the by-hand save applies applies here,
through the *same* two functions (`validateManualMappingShape` and the
newly extracted `validateAssignmentsAgainstVariants`) rather than a second
copy. Exactly one condition is inverted — remap refuses a product with *no*
mapping (a first mapping is `saveManualOptionMapping`'s job), the by-hand
save refuses one that already has it. Gated on `product:edit`, not
`product:publish`: the line drawn is whether a buyer ends up worse off, and
a replacement leaves a named matrix either way. In the editor it is `Change
options`, pre-filled by inverting each stored value's `variantIds` — a link
that already exists so a value's photo can be found, so the pre-fill costs
no new query and no new column.

`restoreOptionMapping` rebuilds from the `removed`/`replaced` snapshot on
the last `options_unmapped` or `options_remapped` event — the only place
the buyer-facing labels and per-variant assignment survive. The `jsonb`
payload is **Zod-parsed before being trusted**, since it becomes what
buyers read; a hand-edited row or an older writer's snapshot lands as
`SNAPSHOT_UNREADABLE` rather than a half-built mapping. It refuses rather
than partially restores: a snapshot variant that is gone, or a current
variant the snapshot never covered, answers `VARIANTS_CHANGED`. A new
`options_restored` audit event names the event it read, so the trail is a
chain. The editor offers Restore only where a record exists — one indexed
`limit 1`, run **only when the product is currently unmapped**.

The RESTRICT-ordered deletes moved into one shared `option-mapping-rows.ts`
once three separate code paths needed to perform them.

## Still open

A snapshot that was itself partial cannot be restored — restore is
all-or-nothing, by design. None of the three paths (manual save, remap,
restore) is browser-verified: the local database has no mapped published
product, and the tactical pants lives only in production, so this is
unit- and component-tested only.

## Evidence

- `sals3-ecommerce` #200: `npm run lint`, `tsc --noEmit` clean; **1,067
  unit tests pass**, **63 e2e pass / 2 skipped**; the three new tests were
  shown to fail against the old function before being trusted.
- `sals3-portal` #273: **3,439 unit tests pass**, **65 e2e pass / 10
  skipped** — the full `verify` chain ran twice, once directly and once
  through the pre-commit hook, in an isolated worktree off `origin/develop`.
- `sals3-portal` #276: **3,495 unit tests pass**, **65 e2e pass / 10
  skipped**; 47 new tests, 11 on remap and 17 on restore (5 of them on
  `planFromSnapshot`, where a reconstruction mistake would be silent);
  rebased onto `develop` **after** #273 merged and re-verified there rather
  than on the branch it was cut from.

Both #273 and #276 were built in isolated worktrees deliberately: the
shared checkout held a separate in-flight stream's uncommitted work (the
sourcing search/filter/perf work in
[[sals3-session-2026-08-30-part104-sourcing-pipeline-columns-filters-search-and-speed|part 104]])
throughout the same afternoon.

## Lessons

- **An exactness check can be stricter than the consumer it feeds.** The
  storefront renderer already handled a hole in the grid; the refusal
  upstream of it was the actual defect.
- **A compression guard derived from the purpose survives edge cases a
  tuned threshold would not** — completeness checked first is what keeps a
  full 2×2 from regressing into a needless sparse grid.
- **"The seller must map it by hand" written in a comment and never built
  is a promise, not a feature.** The manual path had to answer a case
  derivation structurally cannot — one token, two attributes.
- **A cited database constraint is a claim, not evidence** — checking that
  a partial unique index actually covers the rows it is cited for found it
  covered zero.
- **Two writes where one is meant is a window, not a two-step feature.**
  Remove-then-rebuild and its minutes-wide unmapped state became one
  transaction once the risk was named plainly.
- **A restorable snapshot must be parsed and validated before it is
  trusted**, because it is `jsonb` with no shape the database enforces and
  it becomes what a buyer reads.
