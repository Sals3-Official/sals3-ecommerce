---
tags:
  [
    sals3,
    session,
    sals3-portal,
    product-editor,
    ui,
    layout,
    accessibility,
    container-queries,
  ]
aliases:
  [
    Listing Readiness Panel Repair,
    Readiness Header Rework,
    Product Editor Readiness Rail,
  ]
created: 2026-08-12
updated: 2026-08-12
status: session-note
authority: implementation-record
owner_approved: true
implementation_status: implemented-pending-review
related:
  - '[[hot]]'
  - '[[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]'
  - '[[sals3-session-2026-08-08-part19-product-editor-ui-declutter]]'
  - '[[sals3-session-2026-08-10-part22-product-sourcing-consolidation-and-catalogue-preview]]'
  - '[[nextjs-component-security-code-rules]]'
---

# Sals3 session 2026-08-12, part 35 — Listing Readiness panel repair

## Status

Implemented on `sals3-portal` branch `fix/listing-readiness-panel-header`, branched from `origin/develop`. Full `npm run verify` passes. Presentation-only: no readiness rule, count, fixture, navigation, supplier-evidence, or publication behaviour changed.

## Owner report

Bogs marked the readiness panel header as visually broken: the `Listing Readiness` title, the `Issues & Tasks` / `Source Changes` tabs, the `Needs attention` badge, and `78% complete` were separated by a large dead white block. It read as a broken card inside a card and wasted vertical space in a 272px rail.

## Root cause — three separate defects, only one of them visible

The screenshot showed one symptom. Reading the component found three causes.

### 1. The header was in the wrong order, and the "dead block" was a side effect

`ListingReadinessPanel` rendered:

```text
<h2> Listing Readiness
<TabsList>  Issues & Tasks (4) | Source Changes (0)
<TabsContent value="issues">
    ReadinessSummary   <- status badge, 78% complete, progress bar
    ReadinessIssueList
```

Status and completion lived **inside the issues tab panel**. So the reading order was `title → tab strip → status`, which left the tab strip floating between the title and the status as an unexplained band. The "empty inner card" the owner saw was the `bg-muted` tab strip sitting where a header should have been.

### 2. The same defect silently hid publication state on the other tab

Because status and completion were inside `TabsContent value="issues"`, switching to **Source Changes removed them from the DOM**. The two numbers that answer "can this listing publish" disappeared whenever the seller looked at supplier changes.

This was not in the owner's report. It is the more serious of the two, and it is the reason the fix is a restructure rather than a padding adjustment.

### 3. The tab labels physically did not fit the rail

`TabsTrigger` carries `whitespace-nowrap` from the primitive with nothing allowing it to shrink, and `TabsList` was a flex row. In the 272px rail this pushed `Source Changes (0)` past the panel edge — visible as clipped text in the owner's screenshot.

Measured in the browser, rather than estimated:

| Panel width | Per-tab text budget | `Source Changes (0)` needs |
| --- | --- | --- |
| 272px rail | ~109px | 133px at 14px, 116px at 12px, **107px at 11px** |

Even at 11px — below the design system's smallest step and too small for a primary control — the long label barely fits. There is no font size at which the long label is both legible and un-clipped at this width.

## What changed

| File | Change |
| --- | --- |
| `src/components/products/editor/ReadinessStatusHeader.tsx` | **New.** Status pill, completion percentage, progress bar. |
| `src/components/products/editor/ReadinessSummary.tsx` | Reduced to count chips + last-checked timestamp. Status/percent/progress removed; `border-t` above the chips dropped. |
| `src/components/products/editor/ListingReadinessPanel.tsx` | One header block, then tabs. `grid-cols-2` tab strip, container-query labels. |
| `src/components/products/editor/ListingReadinessPanel.test.tsx` | **New.** 8 unit tests. |
| `e2e/product-editor.spec.ts` | +3 browser layout tests. |

New composition:

```text
Listing Readiness
Needs attention                          78% complete
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░]
  Issues (4)          |        Changes (0)
0 Blockers  ⚠ 3 Warnings  ♦ 1 Suggestion
Last automated check …
WARNINGS / SUGGESTIONS list
```

`ProductEditorWorkspace.tsx` was deliberately **not** touched — the panel's props are unchanged, which also means no conflict with the open ADR-015 pricing PR that edits that file.

## Design decisions

### Status and progress belong to the listing, not to a tab

They moved above the tab strip because they describe the draft, not the "Issues & Tasks" view of it. This simultaneously removes the dead band and fixes defect 2. A unit test and an E2E test both assert they survive a tab change.

### `grid-cols-2` instead of the primitive's flex row

Two equal halves cannot push each other out of the panel. The triggers keep `whitespace-nowrap` and gain `min-w-0`; the count is held out of truncation with `shrink-0`, because a clipped `(4)` is worse than a clipped word.

### Container query, not the `compact` prop — a corrected mistake

The first implementation shortened the labels when `compact` was set, since `compact` marks the rail. **That was wrong, and the browser caught it**: the readiness *sheet* is non-compact but is just as narrow on a 320px phone, so it still clipped there.

`compact` describes *which surface* the panel is on. The thing that actually decides whether text fits is **how wide the panel is**. The final implementation makes the panel an `@container` and switches on `@min-[19rem]`:

| Panel width | Visible label |
| --- | --- |
| < 19rem (304px) — rail, phone sheet | `Issues (4)` / `Changes (0)` |
| ≥ 19rem — desktop sheet, full width | `Issues & Tasks (4)` / `Source Changes (0)` |

Lesson worth keeping: **a prop that correlates with narrowness is not a substitute for measuring narrowness.** Container queries express the real condition; the prop only expressed one instance of it.

### Both label variants are real elements, toggled with `hidden`

`display:none` content is excluded from the accessible name computation, so the accessible name always equals the visible text at every width. The alternative — a permanent `aria-label` holding the long name while the short one renders — would announce a tab as something other than what it reads, failing WCAG 2.5.3 *Label in Name*. A shortened word is the smaller defect.

## Accessibility findings

**A contrast check blocked an intended change.** The turnover asked for the timestamp to be subdued supporting metadata. `text-ink-faint` (`#8a9196`) was the natural token and measures **3.20:1** against the card — under the 4.5:1 AA floor. Kept `text-muted-foreground` (`#5d666d`, **5.85:1**) and subdued it by size and weight instead. Recorded in a code comment so the next person does not retry it.

**Keyboard behaviour verified, not assumed.** `ArrowRight` moves focus and the roving `tabindex`; `Enter` activates. That is the correct ARIA manual-activation pattern and it is the Base UI primitive's **pre-existing** behaviour — unchanged by this work, and explicitly not claimed as a fix.

Also verified: progress exposes `role="progressbar"` with `aria-valuenow="78"` and an accessible name, the written percentage is its non-colour alternative, every severity chip carries a text label, and reduced motion is already handled globally in `globals.css`.

## Verification

`npm run verify` — all six stages pass:

| Stage | Result |
| --- | --- |
| `lint` | pass |
| `format:check` | pass |
| `typecheck:clean` | pass |
| `build` | pass |
| `test:run` | pass — 242 tests |
| `test:e2e` | pass — 54 tests, 2 skipped |

`npm audit --audit-level=high` exits 0 (4 moderate, pre-existing; no dependency added).

Browser measurements at three widths:

| Measurement | Rail 272px | Sheet 320px | Sheet 448px |
| --- | --- | --- | --- |
| Clipped label | none | none | none |
| Horizontal overflow | none | none | none |
| Page-level sideways scroll | none | none | none |
| Visible label | `Issues (4)` | `Issues (4)` | `Issues & Tasks (4)` |

### Test flake found, not caused by this work

The first full `verify` failed 6 tests in `e2e/cj-products.spec.ts`. Investigated by stashing the change and re-running: **they pass on a clean tree and pass again with the change applied.** The cause is `CJ product list failed upstream-unavailable` under 10-worker parallel load hitting the 30s timeout. Environmental, but genuinely flaky in CI and worth its own fix — the helper tolerates a missing database but not a slow upstream.

## Known limitations

- **Casing kept as-is.** The turnover's mock used sentence case (`Listing readiness`, `Issues & tasks`). The dialog title `Listing Readiness` is asserted by existing E2E and used by the header button; changing one surface creates an inconsistency and changing both breaks tests, while the request was about composition. Left Title Case.
- **No touch-target height increase.** `h-8` comes from `tabsListVariants` as a group-variant class; overriding it here is the kind of one-off hack the turnover asked to avoid. Targets are full-width, but 32px is below the 44px touch guideline. A design-system-level change would be the correct fix.
- The panel remains a **design preview on fixtures**. No persistence, no supplier call, no publication backend — unchanged by this work.

## No implementation claim beyond the above

No readiness calculation, rule, count, severity, fixture, URL/state navigation, or source-change data was altered. No migration, deployment, or live external call occurred.
