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
  - The Font That Was Never The Problem
  - PDP Option Label Sentence Case
  - Part 66
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
  - "[[sals3-session-2026-08-22-part65-the-labels-that-were-already-right]]"
  - "[[sals3-session-2026-08-21-part62-two-inert-pdp-fixes-and-the-fonts-that-were-never-loaded]]"
  - "[[sals3-session-2026-08-21-part64-the-sticky-panel-the-spec-asked-for-and-the-owner-did-not-want]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-22, part 66 — the font that was never the problem

Direct continuation of [[sals3-session-2026-08-22-part65-the-labels-that-were-already-right]],
and the correction of it. Part 65 answered a screenshot as a font-family
report, shipped Outfit 600, and measured it correct on production. The owner
looked again: **"hindi pa rin naayos ang text at font neto ang pangit."**

| PR | Repo | What |
| --- | --- | --- |
| [#144](https://github.com/Sals3-Official/sals3-ecommerce/pull/144) | ecommerce | Micro-labels to Outfit 600 — merged `746745b`, **superseded the same day** |
| [#145](https://github.com/Sals3-Official/sals3-ecommerce/pull/145) | ecommerce | Part 65 vault note — merged `437703c` |
| [#146](https://github.com/Sals3-Official/sals3-ecommerce/pull/146) | ecommerce | Option label in sentence case at 13.5px — merged `aa29fd2` |

> [!IMPORTANT] The lesson this session actually taught
> **A font-family report is not always a font-family problem, and when your
> first answer measures correct and still looks wrong, stop asking and start
> showing.** Part 65 asked a multiple-choice question about *which face* and got
> a clean answer that solved nothing, because the question named the wrong
> variable. The defect was **11px, caps, `0.08em` tracking, and a mixed-case
> value glued to the end** — small and thin in any face, and two letter cases in
> one short line, which reads as a mistake before it reads as information.
> Part 64 already recorded the general version of this ("a dismissed
> multiple-choice means the options were wrong"); here the options were answered
> rather than dismissed, which is a *quieter* failure and cost a merged PR.

## The arc

1. **Screenshot 1.** Red boxes around `COLOUR Black` and `SIZE L`, instruction
   "match the font with the designated font of the PDP". Measured live first:
   Plus Jakarta Sans 11px/700 — **already what the spec designates**, already
   identical to the unboxed `WHAT WE KNOW` beside it, both webfonts `loaded`.
   Reported that back, offered three readings, owner chose Outfit on label and
   value across every micro-label. Shipped, merged, verified live.
2. **Screenshot 2**, same day, same rows still boxed: still ugly. The change had
   applied — `Outfit | 600 | 11px | 0.88px | uppercase` measured on production —
   so this was not an inert fix in the part 62 sense. It was a **correct answer
   to the wrong question**.
3. **Specimens instead of words.** Seven treatments of the same row, rendered at
   real size in the real webfonts on the real panel colours, published as an
   artifact: the live one, the pre-#144 one, sentence case in each face, a
   quiet-label/loud-answer variant, a fixed-up caps variant, and the prototype's
   own no-value version. Owner picked **C** in one word.

## What shipped in #146

| | Before (#144) | Now |
| --- | --- | --- |
| Label | Outfit 600, 11px, `0.08em`, uppercase, `ink-subtle` | Plus Jakarta Sans 500, 13.5px, no tracking, sentence case, `ink-muted` |
| Value | Outfit 600, 11px, inherited | Plus Jakarta Sans 700, 13.5px, `ink` |
| Rendered | `COLOUR Black` | `Colour: Pink` |

`PRODUCT_MICRO_LABEL` is now `text-[13.5px] font-medium text-ink-muted` and
`PRODUCT_MICRO_LABEL_VALUE` is `font-bold text-ink`, both in
`src/components/product/product-label-styles.ts`, still shared by all four
labels — the two axis rows, `Choose an option`, and `What we know`.

One implementation detail worth keeping: **the colon belongs to the label's
text, not the value's class.** An axis with nothing chosen renders `Colour`,
never a dangling `Colour:`. Both branches were rendered and measured, not
reasoned about.

## What still deviates from the spec

Narrower than #144's deviation, but real. `PDP_REDESIGN_V3_1_BUILD_SPEC.md`
line 400 designates "Outfit display, Plus Jakarta Sans body" and the
`.dc.html` prototype sets this label at `11px / 700 / 0.08em / uppercase` in
the body face:

- **Face** — back to the spec's body role. Not a deviation any more.
- **Size and case** — deviate deliberately, 13.5px sentence case.
- **The value on the label line** — has no counterpart in the prototype at all;
  it exists because a wrapped chip row can push the selected chip out of sight
  on a phone.

Recorded in the module's own doc comment, at the point of change, the same way
part 64's sticky-panel removal was. **A later agent reconciling the code to the
build spec must not put the caps back.**

## Verification

Measured on live production after the merge, on the variant URL from the
owner's own screenshot:

```
Colour: Pink   label Plus Jakarta Sans | 500 | 13.5px | normal | none | rgb(69,78,85)
               value "Pink"            | 700 | 13.5px |                 rgb(20,24,28)
Size: L        same
What we know   label only, same treatment
```

- Label contrast **improved**: `#454E55` on white is 8.6:1, where the old
  `#5D666D` was 5.3:1. Value `#14181C` is 15.9:1.
- No horizontal scroll, no console errors, chips and body copy untouched.
- `npm run verify` green on both PRs: **762 unit tests across 77 files**, **37
  e2e passed / 1 skipped**. GitHub `verify` 2m23s, Vercel pass, production
  deployment `aa29fd2` success.

## Verification routes, because two of three are closed

Worth writing down for the next PDP change:

- **Vercel preview deployments are behind deployment protection** — a PR preview
  URL redirects to a Vercel login, so "measure the preview before merging" is
  not available.
- **Local dev cannot serve a real PDP** — `SALS3_PORTAL_API_URL` points at
  `localhost:3001` and that database holds no published product, so `/p/<slug>`
  answers 500 with `ECONNREFUSED`. `e2e/product.spec.ts` sidesteps this by
  treating an empty catalogue as a pass, so there is no stub to borrow.
- **What works**: mount the real components on a throwaway route under
  `src/app/`, which inherits the real `layout.tsx` and therefore the real fonts
  and cascade; measure; delete the route before commit. Legitimate for a
  type claim, **not** for a layout-height claim — that is exactly the stub trap
  part 62 fell into. Then confirm the shipped bundle really carries the
  utilities: `npm run build` and grep `.next/static/chunks/*.css` for the
  arbitrary ones (`.text-\[13.5px\]`), because Tailwind ships only what its
  scanner found and a class newly moved into its own file is exactly the case
  that can go missing and ship inert.
- The Browser pane refuses `screenshot` and `zoom` with "not compositing frames"
  whenever the pane is not displayed on the owner's screen. Computed styles,
  canvas measurement, and canvas ink-mass still work — ink mass is what replaced
  "does it look lighter" as an answerable question.

## Open after this

- **`What we know` is now 13.5px/500** where it was 11px/700 caps — larger and
  higher-contrast but lighter, and it heads the evidence ledger rather than
  labelling one row. Raised before merging and not answered; if it should keep a
  heading's weight it is a separate constant, not a change to the shared one.
- **`Related products` still renders Plus Jakarta Sans 20px/700** while the
  design and every sibling section heading use Outfit 600. Confirmed still true
  on live. Found while measuring in part 65, scoped out by the owner twice.
- **Nothing asserts label type in a test**, the same hole as part 64's sticky
  removal. The doc comment is the only guard against a spec-driven revert.
