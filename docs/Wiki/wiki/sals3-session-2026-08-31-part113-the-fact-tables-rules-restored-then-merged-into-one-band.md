---
tags:
  - sals3
  - sals3-ecommerce
  - pdp
  - session-note
aliases:
  - Part 113
  - The Fact Tables' Rules Restored, Then Merged Into One Band
created: 2026-08-31
updated: 2026-08-31
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-30-part111-the-pdps-evidence-stops-contradicting-itself]]"
---

# Part 113 — the fact tables' rules restored, then merged into one band

2026-08-31, `sals3-ecommerce`
[#210](https://github.com/Sals3-Official/sals3-ecommerce/pull/210)/[#211](https://github.com/Sals3-Official/sals3-ecommerce/pull/211),
no DDL.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The wrong line was chased (#210)

Part 111 (#207) deleted the fact tables' row rules to kill a short line under
an orphaned last row on a thirteen-attribute product. The owner put the
approved canvas beside the live page afterward: **ruled and compact** on one
side, **no rules and sparse** on the other. The line actually being reported
had been the seam between the two bands, already fixed separately in #208 —
#207 chased the wrong line and left both tables unbound. `py-2.5` with
`border-b` went back, exactly as drawn.

Measured on the thirteen-attribute product at three columns: rules at four
row positions carrying three segments each (1041px total), and the orphaned
fifth row carrying one segment at 347px. A two-row supplier table showed one
rule, two segments, 694px — the drawn look, confirmed correct.

The orphan is recorded as **known and accepted, not overlooked** —
`fact-table-styles.ts` now lists four things that look like fixes and are
not: a different column count (thirteen divides by nothing useful, and the
next product carries a different attribute count); `border-top` instead
(moves the short segment above the orphan rather than removing it); dropping
the rule from each column's last cell (the row above goes ragged, and
`auto-fill` picks the column count from the viewport, so no `nth-child` rule
can identify "the last cell" anyway); and clipping the grid's last pixel,
which does work on the thirteen-attribute case but also swallows the closing
rule of any table whose cells all land on that pixel — true of Supplier
details on most products, and rejected for that cost. The measurement stays
in the commit if the clip is ever wanted after all.

The row-rule constants also moved out of `product-label-styles.ts`, where
they had been sitting beside the option-chip label styles (a different
subject entirely), into a `fact-table-styles.ts` named for what it actually
holds.

## The two bands become one (#211)

Three fixes to the fact tables in #207/#208/#210 had each targeted something
inside one table or the other, and none of them landed, because the three
measured defects were all **outside** both tables:

| | before | after |
|---|---|---|
| gap from the buy rail's evidence card | 0px — they touched | 74px |
| gap between the two tables | 72px of dead white, nothing dividing them | 28px, one band |
| white bands | 2 | 1 |
| section headings in the region | 2 | 1 (the supplier's is now a 13.5px label) |
| grid | 3 columns, value squeezed to 209px of a 347px track | 2 columns, 532px rows |

This is Direction A of three the owner reviewed in a published design
artifact before choosing. The orphan from #210 is still there and is meant
to be — half the width of the old third-column squeeze instead of a third,
and nothing removes it, because the attribute count belongs to the seller
and no column count divides every product.

**The provenance boundary did not move — it was never the section, it was
the sentence.** `SUPPLIER_PROVENANCE` sits directly under the supplier rows
and nowhere else; the seller's own rows carry no provenance line at all,
because "as reported by the supplier" over a seller's own declaration would
be a provenance error, not a wording choice. With both groups now sharing
one band, one format and one grid, that sentence and the label above it are
the *only* things left saying whose claim is whose — both components assert
it beside the code, and the tests check it.

`ProductSupplierDetails.tsx` was restructured into `supplier-facts.ts` —
which fields count as the supplier's, and how each one reads — since that
was the part that was never presentational to begin with; its nine tests
moved unchanged. `ProductSpecifications` now owns the band and renders both
groups. The page test asserts shape rather than pixels: one white band, one
`h2`, both grids inside it on the same 2-column layout, prose still after
the facts.

## Verification

#210: `npm run verify` — lint, format, typecheck, build, 1118 unit tests
(110 files), 63 e2e. Built in an isolated worktree, because the shared
checkout had another session's vault notes sitting uncommitted at the time.
#211: 1116 unit tests (110 files), 63 e2e, driven in a browser against a
thirteen-attribute payload for every number in the comparison table above.

## What was not done

The orphan row is explicitly left as a known cost rather than engineered
away — see the four rejected approaches above. Nothing about the grid
column count is made responsive to attribute count; a product with a
different attribute count gets whatever orphan shape falls out of two
columns.

## Lessons

- **A fix inside either table cannot repair a defect that lives between
  them.** Three rounds (#207, #208, #210) each adjusted something inside one
  table or the other before #211 measured that all three real gaps — buy
  rail to table, table to table, and the duplicated white band — sat outside
  both.
- **An orphan in a fills-left-to-right grid has no column-count solution.**
  Every attribute count that isn't a multiple of the column count produces
  one, and the seller controls the attribute count. The fix that works is
  accepting it at the smallest possible width, not chasing it away.
- **A cited constant with the wrong home is a smell worth following.**
  Row-rule sizing sat beside option-chip label constants for no reason
  related to either; moving it to a file named for what it holds is what
  let #210 describe the four rejected fixes in one place instead of three.
