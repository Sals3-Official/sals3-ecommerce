---
tags:
  - sals3
  - sals3-portal
  - product-editor
  - category-attributes
  - session-note
aliases:
  - Part 120
  - The Saved Value Was Always Right, The Label Was Not
created: 2026-09-01
updated: 2026-09-01
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
---

# Part 120 — the saved value was always right, the label was not

2026-09-01, `sals3-portal`
[#300](https://github.com/Sals3-Official/sals3-portal/pull/300), no DDL.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record.

## What was reported and what was actually wrong

A category attribute's "Other (type your own)" control (`SingleSelectControl`)
was showing the literal `__custom__` sentinel in its collapsed trigger instead
of the seller's typed text, on every load after the first. Reported as a save
bug. It was not: the typed value was correctly written to and correctly
re-read from the database the entire time, confirmed live against
`sals3-portal.vercel.app` on product `c50c01d9-1816-4ac4-a29e-47a0289aee7d`'s
`Pants Type` field — the save payload and the row in Postgres both read
`"Corduroy Pants"`. Only the collapsed trigger's own label was wrong.

## Root cause

While a custom value is active, `<Select>` is deliberately kept controlled
with `value={CUSTOM_VALUE_OPTION}`, so the "Other" list item stays visibly
highlighted in the open dropdown. The trigger's `SelectValue` render function
was rendering that same controlled value verbatim as its label — which is
correct for every other option, and wrong for exactly this one, since the
controlled value and the display value are different facts for a custom
entry. The fix computes a `triggerLabel` from the field's own state
(`current` / `showingCustomInput`) instead of from the controlled `<Select>`
value.

`MultiSelectChipsControl` was checked and confirmed not to compose
`SingleSelectControl` — its own custom-chip path has no equivalent sentinel
and was never affected by this defect.

## Verification

Two regression tests added to `CategoryAttributesSection.test.tsx`, covering
the trigger label on load and while typing — confirmed failing without the
fix and passing with it. Reproduced live against production as described
above, confirming the underlying data was never wrong. `npm run verify`
passes: lint, format, typecheck, build, 3,667 unit tests, 65 e2e.

## What was not done

No backfill or data correction was needed — the stored values were correct
throughout, so this is a pure display fix with nothing to reconcile in the
database.

## Lessons

- **A "save" bug report is a diagnosis, not necessarily a fact.** The
  reported symptom (typed text not surviving a reload) was real, but the
  actual defect was two renders downstream of the save entirely — in a
  trigger label reading the wrong piece of state. Reproducing the report
  literally (does the database hold the right value?) before accepting its
  framing (is the save broken?) is what separated the two.
- **A value kept controlled for one visual reason (highlighting) is a trap
  for any other code that reads it for a different reason (labelling).**
  `CUSTOM_VALUE_OPTION` needed to stay the `<Select>`'s controlled value for
  the dropdown to render correctly, and that same correctness made it the
  wrong source for the trigger's own label — two consumers of one piece of
  state needing two different answers from it.
