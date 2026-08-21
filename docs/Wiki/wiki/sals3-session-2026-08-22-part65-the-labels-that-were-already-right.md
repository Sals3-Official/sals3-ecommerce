---
tags:
  - sals3
  - sals3-ecommerce
  - pdp
  - storefront
  - design-system
  - typography
  - owner-decision
  - spec-override
  - session
aliases:
  - The Labels That Were Already Right
  - PDP Micro-label Display Face
  - Part 65
created: 2026-08-22
updated: 2026-08-22
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-21-part61-pdp-v31-shell-and-the-adr-sweep]]"
  - "[[sals3-session-2026-08-21-part62-two-inert-pdp-fixes-and-the-fonts-that-were-never-loaded]]"
  - "[[sals3-session-2026-08-21-part64-the-sticky-panel-the-spec-asked-for-and-the-owner-did-not-want]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-22, part 65 — the labels that were already right

The third PDP typography report in three days, and the first one where the
reported element turned out to be **exactly per spec**. The owner sent a
production screenshot with red boxes around `COLOUR Black` and `SIZE L` and one
instruction: match the font with the designated font of the PDP.

| PR | Repo | What |
| --- | --- | --- |
| [#144](https://github.com/Sals3-Official/sals3-ecommerce/pull/144) | ecommerce | The four PDP micro-labels move to the display face (merged, `746745b`) |

> [!IMPORTANT] The lesson this session actually taught
> **"Fix this" can mean "change this", not "repair this".** The boxed labels
> were not broken, were not falling back, and were not deviating from the design
> — they were Plus Jakarta Sans 11px/700, which is exactly what
> `PDP_REDESIGN_V3_1_BUILD_SPEC.md` designates for a label. Measuring first is
> what turned a bug report into a decision, and the decision needed the owner,
> not a diff. Part 62 spent a whole PR on two inert fixes because it read code
> instead of the page; this one read the page first and found there was nothing
> to fix, which is a different and cheaper kind of answer.

## What was measured before anything was touched

`getComputedStyle` against live production, on the product the screenshot came
from:

| Element | Family | Weight | Size |
| --- | --- | --- | --- |
| `COLOUR` / `SIZE` axis label | Plus Jakarta Sans | 700 | 11px |
| `WHAT WE KNOW` | Plus Jakarta Sans | 700 | 11px |
| `h1` title | Outfit | 600 | 28px |
| `From US$17.07` | Outfit | 600 | 40px |
| `Product specifications` | Outfit | 600 | 20px |

Both webfonts reported `loaded`, so this was not the part 62 failure recurring.
Three independent sources agreed the labels were correct as shipped:

1. `PDP_REDESIGN_V3_1_BUILD_SPEC.md` line 400 — "Outfit display, Plus Jakarta
   Sans body". A micro-label is body type by that reading.
2. `Sals3 PDP Redesign v3.1.dc.html` line 92 — the option label carries
   `font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase`
   and **no `font-family` at all**, so it inherits the body face from `body`.
3. `WHAT WE KNOW`, three rows below in the same panel, was byte-identical in
   computed style and the owner had not boxed it.

So the report could not be satisfied by making the code match the design. It
could only be satisfied by changing the design intent.

## The two things that actually needed deciding

Rather than guess which of two readings the screenshot meant, both went to the
owner with the measurements attached:

1. **Which face.** Outfit on the label and the value together, Outfit on the
   axis name only, or keep the body face and fix the chosen-value chip glued to
   the end of the label — that chip is 11px normal-case semibold with no
   letter-spacing, it is the one element in the row with no design counterpart
   at all, and "the font looks wrong" is a fair description of it.
2. **How wide.** All four micro-labels share one class list. Moving only the two
   boxed ones would have put two identically-styled labels in two different
   faces, in the same panel, which is a new defect delivered as a fix.

Owner chose Outfit 600 on label **and** value, across every PDP micro-label.
`Related products` was offered in the same question and deliberately scoped out.

## What shipped

- **New** `src/components/product/product-label-styles.ts` holds one
  `PRODUCT_MICRO_LABEL` string — `font-display text-[11px] font-semibold
  tracking-[0.08em] text-ink-subtle uppercase` — plus
  `PRODUCT_MICRO_LABEL_VALUE` for the chosen value. The class list had been
  pasted in three places, which is the same arrangement that let the portal's
  two Variant Matrix forms drift apart until one had reorder arrows and the
  other did not.
- `ProductOptionList.tsx` — the named axis label, the value beside it, and the
  unnamed-tier `Choose an option` heading.
- `ProductEvidenceLedger.tsx` — `What we know`.

Three decisions inside that:

- **Outfit 600, not 700.** 600 is the weight the display role already uses for
  the title, the price and every section heading. Keeping 700 would have added a
  fifth weight to one panel.
- **The value span drops its own family and weight** and inherits both from the
  label. One weight utility per element on purpose — two of them in the same
  cascade layer is exactly how `font-bold` silently lost to `font-medium` on
  this page during the v3.1 build.
- **The deviation is recorded at the point of change.** The module's doc comment
  says the spec puts a micro-label in the body face, that the owner overrode it
  on 2026-08-22 after looking at production, and that the next agent must not
  reconcile it back. Same handling as the removed sticky panel in part 64.

## Verification

Measured on the running page, because the last two PDP typography sessions both
produced changes that were correct in the diff and invisible on the site:

```
label: Outfit | 600 | 11px | 0.88px | uppercase | rgb(93,102,109)
value: Outfit | 600 | 11px | normal | none      | rgb(20,24,28)
h1:    Outfit | 600
```

Local dev could not serve the real PDP — `SALS3_PORTAL_API_URL` points at
`localhost:3001` and the local portal database holds no published product — so
the two real components were mounted on a throwaway route inside the same
`layout.tsx` shell, measured, and the route deleted before commit. That is a
legitimate stub for a **font** claim, where the answer does not depend on
content, and it would not have been legitimate for the panel-height claim part
62 got wrong with the same technique.

- Outfit 600 carries **5.3% less ink** than Jakarta 700 at 11px and runs 3.6px
  narrower — canvas alpha-mass over the rendered word, since no screenshot was
  available. Not a visible weakening.
- Label colour untouched: `#5D666D` on white, 5.3:1, AA at normal size.
- `npm run verify` green: lint, format, typecheck, build, **762 unit tests
  across 77 files**, **37 e2e passed / 1 skipped**. Re-run by the pre-commit and
  pre-push hooks.

## Blast radius

`ProductOptionList` and `ProductEvidenceLedger` are imported only by
`ProductRecordPanel`, which only the PDP renders. No schema change, no
migration, no API change, no new dependency, no supplier call.

## Open after this

- **`Related products` renders in the body face** — Plus Jakarta Sans 20px/700,
  while the design (line 241 of the prototype) and every sibling section heading
  use Outfit 600. This is the mirror image of the labels above: here the spec and
  the code already agree, and the code simply does not do it. Found while
  measuring, scoped out by the owner, not fixed.
- Nothing asserts the label face in a test. The same is true of the sticky-panel
  removal in part 64, so a future agent can revert either by reading the spec.
