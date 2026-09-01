---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - description
  - pdp
  - session-note
aliases:
  - Part 118
  - The Magic Number That Caused The Scrollbar It Was Fixing
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
  - "[[sals3-session-2026-08-31-part115-a-real-table-block-and-centering-it-twice]]"
---

# Part 118 — the magic number that caused the scrollbar it was fixing

2026-08-31, `sals3-portal`
[#298](https://github.com/Sals3-Official/sals3-portal/pull/298) and
`sals3-ecommerce`
[#220](https://github.com/Sals3-Official/sals3-ecommerce/pull/220), no DDL in
either.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## What part 115's centering fix actually did

Part 115 gave both the Description Studio's table preview and the storefront's
`DescriptionTable` a `max-w-[760px] mx-auto`, to stop a wide table breaking out
of the 70ch text column from sitting lopsided against its left edge. 760px was
borrowed from the portal's own `IMAGE_SIZES` full-width figure — a number that
already meant "as wide as this canvas ever draws something."

A table's own content had never been checked against that number. The first
real chart wider than it — a live harem-pants size chart — measures **~843px**.
Capping it at 760px did not make it tidier: it gave the chart a horizontal
scrollbar, on a desktop screen with roughly 300 spare pixels beside it doing
nothing.

## The fix

Both `TablePreview` (portal `CanvasBlock.tsx`/`StudioCanvas.tsx`) and the
storefront's `DescriptionTable.tsx` drop the fixed cap entirely. The grid
shrink-wraps itself from its own columns — `w-fit max-w-full` on the wrapper,
no `w-full` on the `<table>` — so a five-column chart draws narrow and a
nine-column chart draws wide, with neither told a pixel figure to aim for.
`overflow-x-auto` still scrolls when the viewport genuinely cannot fit the
grid, which is a real constraint rather than an invented one.

Cell text stays `text-center`, kept from part 115's second commit — that part
was correct and untouched here. Image blocks are also untouched: running the
full section width is a separate, already-correct decision for those, and this
fix only concerns the table group.

Measured against the live page (ecommerce #220): natural table width ~843px
against the 760px cap that produced the scrollbar; with the cap removed, the
wrapper's left edge matches the description text's left edge exactly (240.5px
both), and `scrollWidth === clientWidth` confirms no forced overflow remains.

## Why this is a companion pair, not two coincidental fixes

Portal #298 fixes the Description Studio's own preview; ecommerce #220 fixes
the same defect in the storefront's render of the same block type. Both PRs
name each other explicitly. Leaving either side on the fixed cap while the
other moved to content-sized would have reintroduced the exact contradiction
part 115 itself was built to catch — the studio preview claiming to match a
storefront that no longer agreed with it.

## Verification

Portal #298: `npm run verify` passed locally (lint, format, typecheck, build,
unit, e2e); studio tests updated to assert content-sizing rather than a pixel
figure, 28/28 passing. Ecommerce #220: `npm run verify` passed locally (lint,
format, typecheck, build, unit, e2e); live-page measurement as above.

## What was not done

Neither PR re-verified the fix against a second real product with a
differently-shaped table (a narrow 3-column chart, for instance) — both were
checked against the one product that surfaced the original bug.

## Lessons

- **A pixel figure borrowed from an unrelated constant is still a magic
  number.** 760px was a real, meaningful figure for something else (the
  canvas's full-width image size) and meant nothing about what a table's own
  content needs — the first content wider than it broke immediately.
- **Content that "should be tidier" inside a cap and a content that "needs a
  cap to avoid overflow" are opposite diagnoses**, and choosing the wrong one
  produces a fix that looks plausible (a centered, capped table) while making
  the actual symptom (an unreadable chart) worse.
- **A companion fix across two repositories needs to land together**, not
  because the code depends on it, but because leaving one side capped and the
  other content-sized reintroduces the exact preview-versus-storefront
  disagreement the shared fixture mechanism exists to prevent.
