---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - description
  - pdp
  - session-note
aliases:
  - Part 115
  - A Real Table Block, And Centering It Twice
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
---

# Part 115 — a real multi-column table block, and centering it twice

2026-08-31, `sals3-portal`
[#286](https://github.com/Sals3-Official/sals3-portal/pull/286)/[#287](https://github.com/Sals3-Official/sals3-portal/pull/287)/[#294](https://github.com/Sals3-Official/sals3-portal/pull/294)/[#297](https://github.com/Sals3-Official/sals3-portal/pull/297)
and `sals3-ecommerce`
[#214](https://github.com/Sals3-Official/sals3-ecommerce/pull/214)/[#215](https://github.com/Sals3-Official/sals3-ecommerce/pull/215)/[#217](https://github.com/Sals3-Official/sals3-ecommerce/pull/217)/[#219](https://github.com/Sals3-Official/sals3-ecommerce/pull/219),
no DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The block itself (portal #286, ecommerce #214)

Description Studio gained a sixth block type, `table`: seller-named column
headings, seller-typed rows, plain-text cells, rendered as a real `<table>`
on the storefront. It replaces a workaround already in production — a CJ
size chart written into a `keyValueList` (size code as the label, every
measurement joined into one comma-separated value), which the storefront
then set as prose inside the 70ch reading measure. A size chart is a grid,
and a grid forced into a sentence is unreadable the moment it has more than
two or three measurements.

Every row is enforced rectangular — `rows[n].length === headers.length` — by
`descriptionDocumentSchema`, mirrored client-side in
`describeBlockProblem`. A blank cell is allowed, because a real grid has
holes (a measurement that doesn't apply to one size); a ragged row is
refused outright, because it would silently shift every measurement after
the gap under the wrong heading — a much worse failure than an empty cell.
Limits: 8 columns, 40 rows, 200-char cells, 120-char headings, the last
reusing the existing `MAX_LABEL_LENGTH`. Switching to simple-text mode now
names a table among what it would flatten away, so the loss isn't silent.

On the storefront, `DescriptionTable` breaks out of the 70ch reading measure
the same way `DescriptionImageRow` already does, scrolls horizontally with a
sticky first column, and uses `<th scope="row">` per row plus `<caption>` as
the table's only accessible name. A ragged table is dropped in the mapper
with the same posture as a disallowed image address; a blank cell is kept.
`ProductSchema`'s JSON-LD description-flattening logic gained a matching
branch — the type compiler caught this consumer neither side had listed,
since it would otherwise have crashed on the new block variant.

The two repositories share a cross-repo contract fixture
(`test/fixtures/storefront-product-detail.json`) with a matching
`FIXTURE_SHA256` literal — the drift-detection mechanism built in part 112
after the two copies were found to have silently disagreed for eight days.
This PR pair is the first real test of that mechanism working as intended:
both sides updated the fixture with a size-chart table block and both
hashes matched before merge.

## The fast follow-up review caught (portal #287, ecommerce #215)

An independent 8-angle code review, run after #286 opened but before it
merged, surfaced two real bugs — landed as follow-up commits on top of
`develop` rather than folded back into the original branch, since #286 had
already merged by the time the review returned.

**The studio preview lied about matching the storefront.** `CanvasBlock.tsx`'s
`TablePreview` claimed to render "exactly as the product page will render
it," but had neither the sticky first column nor the `border-separate`
layout the real `DescriptionTable` uses — a seller previewing a wide size
chart would never see the one real risk on a phone (losing track of which
row they're reading while scrolling). Now matches exactly.

**A table-led description could suggest itself as meta-description noise.**
`descriptionBlocksToPlainText` included table content, which feeds
`firstSentence()` in the meta-description suggestion seam. A description
opening with a table and nothing else would suggest `"Size · Waist · Hips"`
as the meta description — saveable verbatim as the live
`<meta name="description">`. Tables are now excluded from that projection
the same way images already are; a table still counts toward whether the
document is non-empty, since that check reads a block count and not this
text.

On the ecommerce side, the matching `ProductSchema.tsx` table-flattening
branch had shipped with zero test coverage, and its doc comment overclaimed
byte-identical output with the portal's plain-text projection — corrected,
since the portal now excludes tables from that projection entirely and the
two outputs were never meant to match (the JSON-LD join also differs by
design: a single-line string versus a multi-line editor preview).
`DescriptionTableFields.tsx` (portal) was also split into three files to
come under this repository's component/function line-count rules (was 248
lines / a ~178-line function; each new file is under 90 lines), and a
per-row border class was hoisted out of a per-cell ternary in both
repositories.

## Centering it, twice (portal #294/#297, ecommerce #217/#219)

A table block escapes the 70ch reading measure with no cap of its own — by
design, since that's what stops an 8-column size chart from squashing its
numbers. Without a cap or `mx-auto`, it defaulted to 100% of its container,
left edge flush against the same edge the narrower 70ch text above it used.
Every extra pixel it gained over that text landed on the right only, which
reads as lopsided rather than as a deliberate wide breakout.

Fix: `StudioCanvas.tsx`'s table group (portal) and `DescriptionTable.tsx`'s
outer wrapper (ecommerce) both gained `max-w-[760px] mx-auto` — 760px
matching the portal's own `IMAGE_SIZES` full-width figure, a number that
already meant "as wide as this canvas ever draws something," kept identical
across both repositories so the studio preview stays in sync with what a
buyer actually sees. `image` blocks were left untouched; running the full
section width is a separate, already-correct decision for those.

The centering shipped in two passes on the same day: #294/#217 centered the
table block itself within its section, and #297/#219 (same day, hours
later) additionally centered the text inside every cell — header, row-label
column, and data cells — because a wordy value like "Elastic waist" was
wrapping raggedly left-aligned inside an otherwise-centered table. Both
passes were verified with a static harness reproducing the PDP's actual
section width (`max-w-6xl`) and the 70ch text column beside it; neither pass
was verified against the specific live product the request named, since it
existed only on the deployed preview and not in the local database.

## Verification

Portal #286: `npm run verify` green rebased onto current `develop` — lint,
format, typecheck, build, 3617 unit tests, 65 e2e; `npm audit
--audit-level=high` clean. #287: 3618 unit / 65 e2e. #294: full verify
green, plus a visual harness proof. #297: verify passed locally; preview
deploy verification against a live product left unchecked. Ecommerce #214:
1125 unit / 63 e2e, `npm audit` clean. #215: 1127 unit / 63 e2e. #217: verify
green (one unrelated flaky dialog-timing test confirmed passing in
isolation). #219: verify passed locally; preview-deploy confirmation left
unchecked.

## What was not done

Neither repository verified the table block end-to-end against a real
published product with a size chart — the local database has no published
product carrying one, and the portal sits behind sign-in. Both PRs state
this plainly rather than claiming coverage they don't have.

## Lessons

- **A preview claiming to match production is a promise that needs its own
  test.** `TablePreview` asserted visual parity with the storefront in its
  own doc comment and did not have it; the gap (sticky column, border style)
  was invisible until an independent review looked for it specifically.
- **A plain-text projection used for two different purposes needs to serve
  the stricter one.** The same flattening function fed both a meta
  description and an "is this document empty" check; tables belonged in
  neither the way they were included, but only the meta-description path
  was actually dangerous (a garbled machine-generated summary reaching a
  public `<meta>` tag).
- **A cross-repo fixture hash is only proven once it's exercised under real
  pressure.** Part 112 built the `FIXTURE_SHA256` mechanism after an eight-day
  silent drift; this PR pair is the first feature to actually update the
  fixture on both sides and have the hash assertion do its job.
- **A follow-up review commit does not need to be squashed into the PR it
  reviews.** #286 had already merged by the time the 8-angle review
  returned; #287 shipped as its own PR on top of `develop` rather than
  forcing a rebase of already-merged work.
